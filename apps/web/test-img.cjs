const https = require('https');
https.get('https://picgo-long.oss-cn-guangzhou.aliyuncs.com/imgs/20260504171202040.png', (res) => {
  let chunks = [];
  res.on('data', (chunk) => chunks.push(chunk));
  res.on('end', () => {
    let buffer = Buffer.concat(chunks);
    let view = new DataView(buffer.buffer);
    if(buffer[0]===0x89 && buffer[1]===0x50){
       let w = view.getInt32(16);
       let h = view.getInt32(20);
       console.log("Width:", w, "Height:", h);
    } else {
       console.log("Not a PNG");
    }
  });
});
