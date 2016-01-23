
var hapi = require('hapi')

var server = new hapi.Server()

server.connection({ 
  port: 8001 
})

server.register({
  register:require('..'),
  options:{
    route: { path: '/api/ping' },
  }
},console.log)
 
server.route({ 
  method: 'GET', path: '/api/ping', 
  handler: function( req, reply ){
    reply({a:1})
  }})

server.start(console.log)


