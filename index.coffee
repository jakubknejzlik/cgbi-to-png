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

module.exports = (stream,callback)->
  streamToBuffer(stream,(err,buffer)->
    return callback(err) if err

    output = revertCgBIBuffer(buffer)

    callback(null,streamifier.createReadStream(output))
  )


module.exports.revert = revertCgBIBuffer = (buffer)->
  isIphoneCompressed = no
  offset = 0
  idatCgbiData = new Buffer(0)
  chunks = []

  headerData = buffer.slice(0,8)
  offset += 8

  if headerData.toString('base64') isnt PNGHEADER_BASE64
    return callback(new Error('not an png file'))

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

    if chunk.type is 'IHDR' and isIphoneCompressed
      width = bufferpack.unpack('L>', data)[0]
      height = bufferpack.unpack('L>', data,4)[0]

    if x is 'IDAT'
      idatCgbiData = Buffer.concat([idatCgbiData,data])
      continue

    if chunk.type isnt 'IDAT' and idatCgbiData.length > 0

      uncompressed = zlib.inflateRawSync(idatCgbiData).toString()

      newData = ''

      i = 0
      for y in [0..height-1]

        newData += uncompressed[i]
        i++

        for x in [0..width-1]

          newData += uncompressed[i + 2] # Red
          newData += uncompressed[i + 1] # Green
          newData += uncompressed[i + 0] # Blue
          newData += uncompressed[i + 3] # Alpha

          i+=4


      idatData = zlib.deflateRawSync(newData)
      idat_chunk = {
        'type': 'IDAT',
        'length': idatData.length
        'data': idatData,
        'crc': crc.crc32('IDAT' + idatData)
      }
      chunks.push(idat_chunk)

    chunks.push(chunk)


  output = headerData
  for chunk in chunks
    output = Buffer.concat([output,bufferpack.pack('L>',[chunk.length])])
    output = Buffer.concat([output,new Buffer(chunk.type)])
    output = Buffer.concat([output,new Buffer(chunk.data)])
    output = Buffer.concat([output,bufferpack.pack('L>',[chunk.crc])])

  return output