#wo

Dynamic balancing proxy handler plugin for hapi.js, based on h2o2. Uses the SWIM algorithm, see [rjrodger/sneeze]


# Quick Example


```
// base.js - run a base node to bootstrap SWIM network
require('sneeze')({base:true}).join()

// web.js - web server that proxies
var hapi = require('hapi')
var server = new hapi.Server()

server.connection({ 
  port: 8000 // test with http://localhost:8000/api/ping
})

server.register(require('wo'),console.log)
  
server.route({ 
  method: 'GET', path: '/api/ping', 
  handler: {
    wo: {} // look ma - no config!
  }
})

server.start(console.log)

// pingA.js - content server behind web.js
var hapi = require('hapi')
var server = new hapi.Server()

server.connection({ 
  port: 8001 // this is the magic - SWIM will inform web.js about this port
})

// join SWIM network, advertising route
server.register({
  register:require('wo'),
  options:{
    route: { path: '/api/ping' },
  }
},console.log)


// actual content
server.route({ 
  method: 'GET', path: '/api/ping', 
  handler: function( req, reply ){
    reply({a:1})
  }})

server.start(console.log)

```
