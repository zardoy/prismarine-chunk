//@ts-check
import { createBot } from 'mineflayer'
import { Vec3 } from 'vec3'
import ChunkLoader from './src/index.js'

const check = () => {
    const bot = createBot({
      host: 'localhost',
    //   port: 25569,
      username: 'bot',
    })

    const decodePacket = (packet, pos, expected) => {
        const Chunk = ChunkLoader(bot.version)
        //@ts-ignore
        const chunk = new Chunk({ minY: bot.game.minY, worldHeight: bot.game.height })
        chunk.load(packet.chunkData, packet.bitMap, true, true)
        if (packet.biomes !== undefined) {
            chunk.loadBiomes(packet.biomes)
        }
        if (packet.skyLight !== undefined) {
            chunk.loadParsedLight(packet.skyLight, packet.blockLight, packet.skyLightMask, packet.blockLightMask, packet.emptySkyLightMask, packet.emptyBlockLightMask)
        }
        console.log(pos.toString(), chunk.getSkyLight(pos), expected)
    }

    const pos1 = [15, 9, 21]
    const pos2 = [1, -63, 23]
    bot._client.on('map_chunk', (chunk) => {
        if (chunk.x === Math.floor(pos1[0] / 16) && chunk.z === Math.floor(pos1[2] / 16)) {
            decodePacket(chunk, new Vec3(pos1[0], pos1[1], pos1[2]), 0)
        }

        if (chunk.x === Math.floor(pos2[0] / 16) && chunk.z === Math.floor(pos2[2] / 16)) {
            decodePacket(chunk, new Vec3(pos2[0], pos2[1], pos2[2]), 15)
        }
    })
}

check()
