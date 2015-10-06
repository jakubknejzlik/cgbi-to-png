# cgbi-to-png

[![Build Status](https://travis-ci.org/jakubknejzlik/cgbi-to-png.svg?branch=master)](https://travis-ci.org/jakubknejzlik/cgbi-to-png)

Revert Xcode PNG compression (CgBI) in plain javascript.


```
var cgbiToPng = require('cgbi-to-png');

var cgbiFileStream = fs.createReadStream(...);

cgbiToPng(cgbiFileStream,function(err,pngStream){
    // handle reverted pngStream (eg. pngStream.pipe(...))
});

```