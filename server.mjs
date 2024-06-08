//@ts-check
import wrap from 'minecraft-wrap'
import {
  spawn
} from 'child_process'
import fs from 'fs'

const test = (version) => {
  fs.mkdirSync('server', { recursive: true })
  process.chdir('server')
  const jar = `server-${version}.jar`
  const start = () => {
    spawn('java', ['-jar', jar, 'nogui'/* , '--port', '25569' */], {
      stdio: 'inherit'
    })
  }
  if (fs.existsSync(jar)) {
    start()
  } else {
    wrap.downloadServer(version, jar, start)
  }
}

test('1.18.2')
