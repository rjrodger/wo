
var hapi = require('hapi')

var server = new hapi.Server()

server.connection({ 
  port: 8002 
})

server.register({
  register:require('..'),
  options:{
    route: { path: '/api/ping' },
    port: 8002
  }
},console.log)
  
server.route({ 
  method: 'GET', path: '/api/ping', 
  handler: function( req, reply ){
    reply({b:2})
  }})

server.start(console.log)


