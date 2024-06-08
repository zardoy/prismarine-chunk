//@ts-check
import { createBot } from 'mineflayer'
import { Vec3 } from 'vec3'
import ChunkLoader from './src/index.js'
import { Anvil as AnvilProvider } from 'prismarine-provider-anvil'

const positionsCheck = [
    [15, 9, 21, 2],
    [1, -63, 23, 15],
]

const checkServer = () => {
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

    bot._client.on('map_chunk', (chunk) => {
        const matchingPositions = positionsCheck.filter(([x, y, z]) => chunk.x === Math.floor(x / 16) && chunk.z === Math.floor(z / 16))
        for (const [x, y, z, expected] of matchingPositions) {
            decodePacket(chunk, new Vec3(x, y, z), expected)
        }
    })
}

const checkLocal = async () => {
    const Anvil = AnvilProvider('1.18.2')
    const world = new Anvil('./server/world/region')
    for (const [x, y, z, expected] of positionsCheck) {
        const chunk = await world.load(x >> 4, z >> 4) // returns the same "loaded" chunk
        console.log(new Vec3(x, y, z).toString(), chunk.getSkyLight(new Vec3(x, y, z)), expected)
    }
}

checkServer()
// checkLocal()
