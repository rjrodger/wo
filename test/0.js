var n = require('sneeze')({base:true})

n.on('add',function(meta){
  console.log('C-ADD',meta)
})

n.on('remove',function(meta){
  console.log('C-REMOVE',meta)
})

n.join({},console.log)
