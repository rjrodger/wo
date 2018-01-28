const Hapi = require('hapi');		
const Seneca = require('seneca');		


const server = new Hapi.Server();		
	
const seneca = Seneca({tag: 'upstream-b'})

seneca
  .use('mesh',{
    sneeze: {
      silent: false
    }
  })

	
server.connection({host: 'localhost'});		
		
server.register({		
  register: require('..'),		
  options: {		
    tag: 'upstream-b',
    route: { 
      path: '/api/b' 
    },		
    sneeze: { 
      silent: false 
    }		
  }		
}, console.log);		
		
server.route({		
  method: 'GET', 
  path: '/api/b',		
  handler: function ( req, reply ) {		
    seneca.act('b:1', {c:req.query.c}, function (err, out) {
      reply({ b: err || out.b, c: err || out.c, when: Date.now() });		
    })
  }
});		
		
server.start(console.log);
