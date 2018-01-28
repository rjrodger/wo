const Hapi = require('hapi');		
		
const server = new Hapi.Server();		
		
server.connection({		
  port: 8000,
  host: 'localhost'
});		
		
server.register({		
  register: require('..'),		
  options: { 
    tag: 'front',
    sneeze: { 
      silent: false 
    } 
  }		
}, console.log);		


server.route({		
  method: 'GET', 
  path: '/api/ping',		
  handler: function ( req, reply ) {		
    reply({ ping: true, when: Date.now() });		
  }
});		

server.route({		
  method: 'GET', path: '/api/a',		
  handler: { wo: {} }		
});		
		
server.route({		
  method: 'GET', path: '/api/b',		
  handler: { wo: {} }		
});		
		
server.start(console.log);
