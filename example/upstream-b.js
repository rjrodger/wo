const Hapi = require('hapi');		
const Seneca = require('seneca');		


const server = new Hapi.Server();		
	
const seneca = Seneca()
        .use('mesh',{
          sneeze: {
            silent: false
          }
        })

	
server.connection();		
		
server.register({		
  register: require('..'),		
  options: {		
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
    seneca.act('b:1', function (err, out) {
      reply({ b: err || out.b, when: Date.now() });		
    })
  }
});		
		
server.start(console.log);
