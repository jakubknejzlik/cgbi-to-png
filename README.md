# cgbi-to-png

[![Build Status](https://travis-ci.org/jakubknejzlik/cgbi-to-png.svg?branch=master)](https://travis-ci.org/jakubknejzlik/cgbi-to-png)

Revert Xcode PNG compression (CgBI) in plain javascript.


```
var cgbiToPng = require('cgbi-to-png');

var cgbiStream = fs.createReadStream(...);

cgbiToPng(fs.createReadStream(filePath),function(err,pngStream){
    // handle reverted pngStream (eg. pngStream.pipe(...))
});

```

# Contribution
If you find any bugs in this script, please create new issue.