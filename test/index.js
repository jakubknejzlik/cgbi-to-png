var assert = require('assert');
var fs = require('fs');
var cgbiToPng = require('../index');
var tmp = require('tmp');

var filePath = './test/cgbi-image.png';
var tempFilePath = tmp.tmpNameSync();

describe('convert',function(){
    it('should convert cgbi to png',function(done){
        cgbiToPng(fs.createReadStream(filePath),function(err,imageStream){
            assert.ifError(err);
            assert.ok(imageStream);
            imageStream
                .pipe(fs.createWriteStream(tempFilePath))
                .on('error',done)
                .on('close',function(){
                    fs.unlink(tempFilePath);
                    done();
                })
        })
    })
})