streamToBuffer = require('stream-to-buffer')
bufferpack = require('bufferpack')
streamifier = require('streamifier')
zlib = require('zlib')
crc = require('crc')

#unpack = require('./lib/unpack')
#compress = require('./lib/compress')
#toArrayBuffer = require('./lib/toArrayBuffer')

#PNGHEADER = new Buffer('\x89PNG\r\n\x1A\n')
PNGHEADER_BASE64 = 'iVBORw0KGgo='

ignoreChunkTypes = ['CgBI','iDOT']

module.exports = (stream,callback)->
  streamToBuffer(stream,(err,buffer)->
    return callback(err) if err

    output = revertCgBIBuffer(buffer)

    callback(null,streamifier.createReadStream(output))
  )


module.exports.revert = revertCgBIBuffer = (buffer)->
  isIphoneCompressed = no
  offset = 0
  chunks = []

  idatCgbiData = new Buffer(0)
  headerData = buffer.slice(0,8)
  offset += 8

  if headerData.toString('base64') isnt PNGHEADER_BASE64
    throw new Error('not a png file')

  while offset < buffer.length
    chunk = {}

    data = buffer.slice(offset,offset+4)
    offset += 4
    chunk.length = bufferpack.unpack("L>",data,0)[0]

    data = buffer.slice(offset,offset+4)
    offset += 4
    chunk.type = data.toString()


    chunk.data = data = buffer.slice(offset,offset + chunk.length)
    offset += chunk.length

    dataCrc = buffer.slice(offset,offset + 4)
    offset += 4
    chunk.crc = bufferpack.unpack("L>",dataCrc,0)[0]

    if chunk.type is 'CgBI'
      isIphoneCompressed = yes

    if chunk.type in ignoreChunkTypes
      continue
      
    if chunk.type is 'IHDR'
      width = bufferpack.unpack('L>', data)[0]
      height = bufferpack.unpack('L>', data,4)[0]

    if chunk.type is 'IDAT' and isIphoneCompressed
      idatCgbiData = Buffer.concat([idatCgbiData,data])
      continue

    if chunk.type is 'IEND' and isIphoneCompressed

      uncompressed = zlib.inflateRawSync(idatCgbiData)

      newData = new Buffer(uncompressed.length)

      i = 0
      for y in [0..height-1]

        newData[i] = uncompressed[i]
        i++

        for x in [0..width-1]

          newData[i + 0] = uncompressed[i + 2] # Red
          newData[i + 1] = uncompressed[i + 1] # Green
          newData[i + 2] = uncompressed[i + 0] # Blue
          newData[i + 3] = uncompressed[i + 3] # Alpha

          i+=4

      idatData = zlib.deflateSync(newData)
      chunkCRC = crc.crc32('IDAT' + idatData)
      chunkCRC = (chunkCRC + 0x100000000) % 0x100000000
      idat_chunk = {
        'type': 'IDAT',
        'length': idatData.length
        'data': idatData,
        'crc': chunkCRC
      }
      chunks.push(idat_chunk)

    chunks.push(chunk)

  output = headerData
  for chunk in chunks
    output = Buffer.concat([output,bufferpack.pack('L>',[chunk.length])])
    output = Buffer.concat([output,new Buffer(chunk.type)])
    if chunk.length > 0
      output = Buffer.concat([output,new Buffer(chunk.data)])
    output = Buffer.concat([output,bufferpack.pack('L>',[chunk.crc])])

  return output