const Hapi = require('hapi');		
const Seneca = require('seneca');

const server = new Hapi.Server();		
		
server.connection();		
		
server.register({		
  register: require('..'),		
  options: {		
    route: { 
      path: '/api/a' 
    },		
    sneeze: { 
      silent: false 
    }		
  }		
}, console.log);		
		
server.route({		
  method: 'GET', 
  path: '/api/a',		
  handler: function ( req, reply ) {		
    reply({ a: 1, when: Date.now() });		
  }
});		
		
server.start(console.log);
