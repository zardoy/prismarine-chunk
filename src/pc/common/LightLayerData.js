const Mutex = require('async-mutex').Mutex

// 2048
// blocks / bytes per block
const ARRAY_SIZE = 16 * 16 * 16 / (8 / 4)

class SWMRNibbleArray {
  constructor (options) {
    this.visibleMutex = new Mutex()

    this.storageVisible = new Int8Array(ARRAY_SIZE)
  }
}

module.exports = SWMRNibbleArray
