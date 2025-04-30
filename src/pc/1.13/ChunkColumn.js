const SmartBuffer = require('smart-buffer').SmartBuffer
const ChunkSection = require('./ChunkSection')
const constants = require('../common/constants')
const BitArray = require('../common/BitArray')
const varInt = require('../common/varInt')
const CommonChunkColumn = require('../common/CommonChunkColumn')
const neededBits = require('../common/neededBits')

// wrap with func to provide version specific Block
module.exports = (Block, mcData) => {
  return class ChunkColumn extends CommonChunkColumn {
    static get section () { return ChunkSection }
    constructor () {
      super(mcData)
      this.sectionMask = 0
      this.skyLightSent = true
      this.sections = Array(constants.NUM_SECTIONS).fill(null)
      this.biomes = Array(
        constants.SECTION_WIDTH * constants.SECTION_WIDTH
      ).fill(1)
      this.maxBitsPerBlock = neededBits(Object.values(mcData.blocks).reduce((high, block) => Math.max(high, block.maxStateId), 0))
    }

    toJson () {
      return JSON.stringify({
        biomes: this.biomes,
        blockEntities: this.blockEntities,
        sectionMask: this.sectionMask,
        sections: this.sections.map(section => section === null ? null : section.toJson())
      })
    }

    static fromJson (j) {
      const parsed = JSON.parse(j)
      const chunk = new ChunkColumn()
      chunk.biomes = parsed.biomes
      chunk.blockEntities = parsed.blockEntities
      chunk.sectionMask = parsed.sectionMask
      chunk.sections = parsed.sections.map(s => s === null ? null : ChunkSection.fromJson(s))
      return chunk
    }

    initialize (func) {
      const p = { x: 0, y: 0, z: 0 }
      for (p.y = 0; p.y < constants.CHUNK_HEIGHT; p.y++) {
        for (p.z = 0; p.z < constants.SECTION_WIDTH; p.z++) {
          for (p.x = 0; p.x < constants.SECTION_WIDTH; p.x++) {
            const block = func(p.x, p.y, p.z)
            if (block === null) {
              continue
            }
            this.setBlock(p, block)
          }
        }
      }
    }

    getBlock (pos) {
      const section = this.sections[pos.y >> 4]
      const biome = this.getBiome(pos)
      if (!section) {
        return Block.fromStateId(0, biome)
      }
      const stateId = section.getBlock(toSectionPos(pos))
      const block = Block.fromStateId(stateId, biome)
      block.light = this.getBlockLight(pos)
      block.skyLight = this.getSkyLight(pos)
      block.entity = this.getBlockEntity(pos)
      return block
    }

    setBlock (pos, block) {
      if (typeof block.stateId !== 'undefined') {
        this.setBlockStateId(pos, block.stateId)
      }
      if (typeof block.biome !== 'undefined') {
        this.setBiome(pos, block.biome.id)
      }
      if (typeof block.skyLight !== 'undefined' && this.skyLightSent) {
        this.setSkyLight(pos, block.skyLight)
      }
      if (typeof block.light !== 'undefined') {
        this.setBlockLight(pos, block.light)
      }
      if (block.entity) {
        this.setBlockEntity(pos, block.entity)
      } else {
        this.removeBlockEntity(pos)
      }
    }

    getBlockType (pos) {
      const blockStateId = this.getBlockStateId(pos)
      return mcData.blocksByStateId[blockStateId].id
    }

    getBlockData (pos) {
      const blockStateId = this.getBlockStateId(pos)
      return mcData.blocksByStateId[blockStateId].metadata
    }

    getBlockStateId (pos) {
      const section = this.sections[pos.y >> 4]
      return section ? section.getBlock(toSectionPos(pos)) : 0
    }

    getBlockLight (pos) {
      const section = this.sections[pos.y >> 4];
      if (!section) return 15;
      
      // Convert world position to section position
      const sectionPos = toSectionPos(pos);
      // Get the light value using the section's method
      return section.getBlockLight(sectionPos);
    }

    getSkyLight (pos) {
      const section = this.sections[pos.y >> 4];
      if (!section) return 15;

      // Convert world position to section position
      const sectionPos = toSectionPos(pos);
      // Get the light value using the section's method
      return section.getSkyLight(sectionPos);
    }

    getBiome (pos) {
      return this.biomes[getBiomeIndex(pos)]
    }

    getBiomeColor (pos) {
      // TODO
      return { r: 0, g: 0, b: 0 }
    }

    setBlockType (pos, id) {
      this.setBlockStateId(pos, mcData.blocks[id].minStateId)
    }

    setBlockData (pos, data) {
      this.setBlockStateId(pos, mcData.blocksByStateId[this.getBlockStateId(pos)].minStateId + data)
    }

    setBlockStateId (pos, stateId) {
      const sectionIndex = pos.y >> 4
      if (sectionIndex < 0 || sectionIndex >= 16) return

      let section = this.sections[sectionIndex]
      if (!section) {
        // if it's air
        if (stateId === 0) {
          return
        }
        section = new ChunkSection({
          maxBitsPerBlock: this.maxBitsPerBlock
        })
        this.sectionMask |= 1 << sectionIndex
        this.sections[sectionIndex] = section
      }

      section.setBlock(toSectionPos(pos), stateId)
    }

    setBlockLight (pos, light) {
      const section = this.sections[pos.y >> 4]
      return section && section.setBlockLight(toSectionPos(pos), light)
    }

    setSkyLight (pos, light) {
      const section = this.sections[pos.y >> 4]
      return section && section.setSkyLight(toSectionPos(pos), light)
    }

    setBiome (pos, biome) {
      this.biomes[getBiomeIndex(pos)] = biome
    }

    getMask () {
      return this.sectionMask
    }

    // These methods do nothing, and are present only for API compatibility
    dumpBiomes () {

    }

    dumpLight () {

    }

    loadLight () {

    }

    loadBiomes () {

    }

    dump () {
      const smartBuffer = new SmartBuffer()
      this.sections.forEach((section, i) => {
        if (section !== null && !section.isEmpty()) {
          section.write(smartBuffer)
        }
      })

      // write biome data
      this.biomes.forEach(biome => {
        smartBuffer.writeInt32BE(biome)
      })

      if (!smartBuffer.length) {
        return Buffer.alloc(4096)
      }

      return smartBuffer.toBuffer()
    }

    load (data, bitMap = 0xffff, skyLightSent = true, fullChunk = true) {
      // make smartbuffer from node buffer
      // so that we doesn't need to maintain a cursor
      const reader = SmartBuffer.fromBuffer(data)

      this.skyLightSent = skyLightSent
      this.sectionMask |= bitMap
      for (let y = 0; y < constants.NUM_SECTIONS; ++y) {
        // does `data` contain this chunk?
        if (!((bitMap >> y) & 1)) {
          // we can skip write a section if it isn't requested
          continue
        }

        // keep temporary palette
        let palette
        let skyLight

        // get number of bits a palette item use
        const bitsPerBlock = reader.readUInt8()

        // check if the section uses a section palette
        if (bitsPerBlock <= constants.MAX_BITS_PER_BLOCK) {
          palette = []
          // get number of palette items
          const numPaletteItems = varInt.read(reader)

          // save each palette item
          for (let i = 0; i < numPaletteItems; ++i) {
            palette.push(varInt.read(reader))
          }
        } else {
          // global palette is used
          palette = null
        }

        // number of items in data array
        const dataArray = new BitArray({
          bitsPerValue: bitsPerBlock > constants.MAX_BITS_PER_BLOCK ? this.maxBitsPerBlock : bitsPerBlock,
          capacity: 4096
        }).readBuffer(reader, varInt.read(reader) * 2)

        // For light data, we need to manually map from the read data to the correct C++ indices
        // Create light data BitArrays
        const blockLight = new BitArray({
          bitsPerValue: 4,
          capacity: 4096
        });
        
        // Read the raw data but DON'T process it yet
        const blockLightRaw = new Uint8Array(2048); // 4096 blocks / 2 blocks per byte
        for (let i = 0; i < 2048; i++) {
          blockLightRaw[i] = reader.readUInt8();
        }
        
        // Process the light data correctly
        for (let i = 0; i < 2048; i++) {
          const byte = blockLightRaw[i];
          const blockIndex1 = i * 2;
          const blockIndex2 = i * 2 + 1;
          
          // Extract the two 4-bit values from the byte
          const value1 = byte & 0x0F;
          const value2 = (byte >> 4) & 0x0F;
          
          // Calculate C++ style coordinates for these blocks
          const x1 = blockIndex1 % 16;
          const z1 = Math.floor((blockIndex1 / 16) % 16);
          const y1 = Math.floor(blockIndex1 / 256);
          
          const x2 = blockIndex2 % 16;
          const z2 = Math.floor((blockIndex2 / 16) % 16);
          const y2 = Math.floor(blockIndex2 / 256);
          
          // Calculate C++ style indices
          const index1 = (y1 * 16 * 16) + (z1 * 16) + x1;
          const index2 = (y2 * 16 * 16) + (z2 * 16) + x2;
          
          // Set the values using C++ style indices
          blockLight.set(index1, value1);
          if (blockIndex2 < 4096) { // Make sure we don't go out of bounds
            blockLight.set(index2, value2);
          }
        }
      
        // Similarly for sky light
        if (skyLightSent) {
          skyLight = new BitArray({
            bitsPerValue: 4,
            capacity: 4096
          });
          
          // Read raw data
          const skyLightRaw = new Uint8Array(2048);
          for (let i = 0; i < 2048; i++) {
            skyLightRaw[i] = reader.readUInt8();
          }
          
          // Process the data correctly
          for (let i = 0; i < 2048; i++) {
            const byte = skyLightRaw[i];
            const blockIndex1 = i * 2;
            const blockIndex2 = i * 2 + 1;
            
            // Extract the two 4-bit values from the byte
            const value1 = byte & 0x0F;
            const value2 = (byte >> 4) & 0x0F;
            
            // Calculate C++ style coordinates for these blocks
            const x1 = blockIndex1 % 16;
            const z1 = Math.floor((blockIndex1 / 16) % 16);
            const y1 = Math.floor(blockIndex1 / 256);
            
            const x2 = blockIndex2 % 16;
            const z2 = Math.floor((blockIndex2 / 16) % 16);
            const y2 = Math.floor(blockIndex2 / 256);
            
            // Calculate C++ style indices
            const index1 = (y1 * 16 * 16) + (z1 * 16) + x1;
            const index2 = (y2 * 16 * 16) + (z2 * 16) + x2;
            
            // Set the values using C++ style indices
            skyLight.set(index1, value1);
            if (blockIndex2 < 4096) { // Make sure we don't go out of bounds
              skyLight.set(index2, value2);
            }
          }
        }

        const section = new ChunkSection({
          data: dataArray,
          palette,
          blockLight,
          maxBitsPerBlock: this.maxBitsPerBlock,
          ...(skyLightSent ? { skyLight } : { skyLight: null })
        })
        this.sections[y] = section
      }

      // read biomes
      if (fullChunk) {
        const p = { x: 0, y: 0, z: 0 }
        for (p.z = 0; p.z < constants.SECTION_WIDTH; p.z++) {
          for (p.x = 0; p.x < constants.SECTION_WIDTH; p.x++) {
            this.setBiome(p, reader.readInt32BE())
          }
        }
      }
    }
  }
}

function getBiomeIndex (pos) {
  return (pos.z * 16) | pos.x
}

function toSectionPos (pos) {
  return { x: pos.x, y: pos.y & 15, z: pos.z }
}
