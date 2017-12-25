var assert = require("assert");
var fs = require("fs");
var cgbiToPng = require("../index");
var tmp = require("tmp");

var filePath = "./test/cgbi-image.png";
var PNGFilePath = "./test/png-image.png";
var nonPNGFilePath = "./test/index.js";
var tempFilePath = tmp.tmpNameSync();

describe("convert", function() {
  it("should convert cgbi to png", function(done) {
    cgbiToPng(fs.createReadStream(filePath), function(err, imageStream) {
      assert.ifError(err);
      assert.ok(imageStream);
      imageStream
        .pipe(fs.createWriteStream(tempFilePath))
        .on("error", done)
        .on("close", function() {
          fs.unlink(tempFilePath);
          done();
        });
    });
  });

  it("should convert cgbi to png (buffers)", function() {
    var cgbiBuffer = fs.readFileSync(filePath);
    var pngBuffer = cgbiToPng.revert(cgbiBuffer);
    assert.ok(pngBuffer);
    assert.notEqual(pngBuffer.toString(), cgbiBuffer.toString());
  });

  it("should leave png untouched", function() {
    var pngBuffer = fs.readFileSync(PNGFilePath);
    var pngBuffer2 = cgbiToPng.revert(pngBuffer);
    assert.ok(pngBuffer2);
    assert.equal(pngBuffer.toString(), pngBuffer2.toString());
  });

  it("should fail on non png files", function() {
    var nonPNGBuffer = fs.readFileSync(nonPNGFilePath);
    assert.throws(function() {
      cgbiToPng.revert(nonPNGBuffer);
    }, "not a png file");
  });
});
