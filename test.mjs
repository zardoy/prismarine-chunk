//@ts-check
import wrap from 'minecraft-wrap'
import {
  spawn
} from 'child_process'
import fs from 'fs'
import { createBot } from 'mineflayer'

const test = (version) => {
  fs.mkdirSync('server', { recursive: true })
  process.chdir('server')
  const jar = `server-${version}.jar`
  const start = () => {
    spawn('java', ['-jar', jar, 'nogui', '--port', '25569'], {
      stdio: 'inherit'
    })
    setTimeout(() => check(version), 2000)
  }
  if (fs.existsSync(jar)) {
    start()
  } else {
    wrap.downloadServer(version, jar, start)
  }
}

const check = (version) => {
    const bot = createBot({
      host: 'localhost',
      port: 25569,
      username: 'bot',
      version
    })

    bot._client.on('map_chunk', (chunk) => {
      if (chunk.x === 0 && chunk.z === 0) {
        console.log('Center chunk received')
      }
    })
}

test('1.14.4')
