const Hapi = require('hapi');		

const server = new Hapi.Server();		
		
server.connection({host: 'localhost'});		
		
server.register({		
  register: require('..'),		
  options: {		

    // Use a bad host to test join failure
    // host:'127.1.1.1',

    tag: 'upstream-a',
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
