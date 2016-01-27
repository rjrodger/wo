
var hapi = require('hapi')

var server = new hapi.Server()

server.connection({ 
  port: 8000
})

server.register({
  register: require('..'),
  options: {sneeze: {silent: false}}
}, console.log)

server.route({ 
  method: 'GET', path: '/api/ping', 
  handler: {
    wo: {}
  }
})

server.start(console.log)


