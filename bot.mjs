//@ts-check
import { createBot } from 'mineflayer'
import { Vec3 } from 'vec3'

const check = () => {
    const bot = createBot({
      host: 'localhost',
    //   port: 25569,
      username: 'bot',
    })

    const pos1 = [15, 9, 21]
    const pos2 = [1, -63, 23]
    bot._client.on('map_chunk', (chunk) => {
        if (chunk.x === Math.floor(pos1[0] / 16) && chunk.z === Math.floor(pos1[2] / 16)) {
            setTimeout(() => {
                console.log('1', bot.world.getSkyLight(new Vec3(pos1[0], pos1[1], pos1[2]))) // expected 0
            })
        }

        if (chunk.x === Math.floor(pos2[0] / 16) && chunk.z === Math.floor(pos2[2] / 16)) {
            setTimeout(() => {
                console.log('2', bot.world.getSkyLight(new Vec3(pos2[0], pos2[1], pos2[2]))) // expected 15
            })
        }
    })
}

check()
