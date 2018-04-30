"use strict";

(function() {
  var PNGHEADER_BASE64,
    bufferpack,
    crc,
    ignoreChunkTypes,
    revertCgBIBuffer,
    streamToBuffer,
    streamifier,
    zlib,
    indexOf =
      [].indexOf ||
      function(item) {
        for (var i = 0, l = this.length; i < l; i++) {
          if (i in this && this[i] === item) return i;
        }
        return -1;
      };

  streamToBuffer = require("stream-to-buffer");

  bufferpack = require("bufferpack");

  streamifier = require("streamifier");

  zlib = require("zlib");

  crc = require("crc");

  PNGHEADER_BASE64 = "iVBORw0KGgo=";

  ignoreChunkTypes = ["CgBI", "iDOT"];

  module.exports = function(stream, callback) {
    return streamToBuffer(stream, function(err, buffer) {
      var output;
      if (err) {
        return callback(err);
      }
      try {
        output = revertCgBIBuffer(buffer);
        return callback(null, streamifier.createReadStream(output));
      } catch (e) {
        return callback(e);
      }
    });
  };

  module.exports.revert = revertCgBIBuffer = function(buffer) {
    let isIphoneCompressed = false;
    let offset = 0;
    let chunks = [];
    let idatCgbiData = new Buffer(0);
    let headerData = buffer.slice(0, 8);
    let ref,
      width,
      height,
      chunk,
      uncompressed,
      newData,
      j,
      y,
      ref1,
      ref2,
      k,
      x,
      idatData,
      chunkCRC,
      idat_chunk;
    offset += 8;
    if (headerData.toString("base64") !== PNGHEADER_BASE64) {
      throw new Error("not a png file");
    }
    while (offset < buffer.length) {
      chunk = {};
      let data = buffer.slice(offset, offset + 4);
      offset += 4;
      chunk.length = bufferpack.unpack("L>", data, 0)[0];
      data = buffer.slice(offset, offset + 4);
      offset += 4;
      chunk.type = data.toString();
      chunk.data = data = buffer.slice(offset, offset + chunk.length);
      offset += chunk.length;
      let dataCrc = buffer.slice(offset, offset + 4);
      offset += 4;
      chunk.crc = bufferpack.unpack("L>", dataCrc, 0)[0];
      if (chunk.type === "CgBI") {
        isIphoneCompressed = true;
      }
      if (((ref = chunk.type), indexOf.call(ignoreChunkTypes, ref) >= 0)) {
        continue;
      }
      if (chunk.type === "IHDR") {
        width = bufferpack.unpack("L>", data)[0];
        height = bufferpack.unpack("L>", data, 4)[0];
      }
      if (chunk.type === "IDAT" && isIphoneCompressed) {
        idatCgbiData = Buffer.concat([idatCgbiData, data]);
        continue;
      }
      if (chunk.type === "IEND" && isIphoneCompressed) {
        uncompressed = zlib.inflateRawSync(idatCgbiData);
        newData = new Buffer(uncompressed.length);
        let i = 0;
        for (
          y = j = 0, ref1 = height - 1;
          0 <= ref1 ? j <= ref1 : j >= ref1;
          y = 0 <= ref1 ? ++j : --j
        ) {
          newData[i] = uncompressed[i];
          i++;
          for (
            x = k = 0, ref2 = width - 1;
            0 <= ref2 ? k <= ref2 : k >= ref2;
            x = 0 <= ref2 ? ++k : --k
          ) {
            newData[i + 0] = uncompressed[i + 2];
            newData[i + 1] = uncompressed[i + 1];
            newData[i + 2] = uncompressed[i + 0];
            newData[i + 3] = uncompressed[i + 3];
            i += 4;
          }
        }
        idatData = zlib.deflateSync(newData);
        chunkCRC = crc.crc32("IDAT" + idatData);
        chunkCRC = (chunkCRC + 0x100000000) % 0x100000000;
        idat_chunk = {
          type: "IDAT",
          length: idatData.length,
          data: idatData,
          crc: chunkCRC
        };
        chunks.push(idat_chunk);
      }
      chunks.push(chunk);
    }
    let output = headerData;
    for (let l = 0, len = chunks.length; l < len; l++) {
      chunk = chunks[l];
      output = Buffer.concat([output, bufferpack.pack("L>", [chunk.length])]);
      output = Buffer.concat([output, new Buffer(chunk.type)]);
      if (chunk.length > 0) {
        output = Buffer.concat([output, new Buffer(chunk.data)]);
      }
      output = Buffer.concat([output, bufferpack.pack("L>", [chunk.crc])]);
    }
    return output;
  };
}.call(this));
