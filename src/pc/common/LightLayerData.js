const { BYTES_PER_LIGHT_SECTION } = require('./constants')

class LightLayerData {
  constructor (options) {
    if (options === null) {
      throw Error('Null options provided!')
    }
    if (options.data) {
      if (options.data.length !== BYTES_PER_LIGHT_SECTION) {
        throw Error('Data of wrong length: ' + options.data.length)
      }
      this.data = Int8Array.from(options.data)
      this.defaultValue = 0
    } else {
      this.data = null
      if (!options.defaultValue) {
        throw Error('Define defaultValue')
      }
      this.defaultValue = options.defaultValue
    }
  }

  static getIndex (x, y, z) {
    return y << 8 | z << 4 | x
  }

  getByIndex (index) {
    if (this.data == null) {
      return this.defaultValue
    } else {
      const byteIndex = index >> 1
      const nibbleIndex = index & 1
      return this.data.at(byteIndex) >> 4 * nibbleIndex & 15
    }
  }

  getDataOrAllocate () {
    if (this.data == null) {
      this.data = new Int8Array(BYTES_PER_LIGHT_SECTION)
      if (this.defaultValue !== 0) {
        this.data.fill(this.defaultValue)
      }
    } else {
      return this.data
    }
  }

  setByIndex (index, value) {
    const data = this.getDataOrAllocate()
    const byteIndex = index >> 1
    const nibbleIndex = index & 1
    const i1 = ~(15 << 4 * nibbleIndex)
    const i2 = (value & 15) << 4 * nibbleIndex
    data[byteIndex] = data[byteIndex] & i1 | i2
  }

  getValue (x, y, z) {
    return this.getByIndex(LightLayerData.getIndex(x, y, z))
  }

  fill (defaultValue) {
    this.defaultValue = defaultValue
    this.data = null
  }

  static _packFilled (value) {
    let i = value & 0xFF
    for (let j = 4; j < 8; j += 4) {
      i = (i | (value << j)) & 0xFF
    }
    return i & 0xFF
  }

  copy () {
    if (this.data == null) {
      return new LightLayerData(this.defaultValue)
    } else {
      return new LightLayerData(this.data)
    }
  }

  isDefinitelyHomogenous () {
    return this.data == null
  }

  isDefinitelyFilledWith (expectedDefaultValue) {
    return this.data == null && this.defaultValue === expectedDefaultValue
  }

  isEmpty () {
    return this.data == null && this.defaultValue === 0
  }
}

module.exports = LightLayerData
