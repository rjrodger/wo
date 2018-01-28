const Hapi = require('hapi');
const Seneca = require('seneca');		

const CONSUL = process.env.CONSUL_SERVICE_HOST || 'localhost'

Seneca({tag: 'front'})
  .test('print')

  .use('consul-registry', {
    host: CONSUL
  })

  .act(
    'role:registry,cmd:get,default$:{}',
    {key:'seneca-mesh/-/bases'},
    function(err, out) {
      if(err) {
        console.log(err)
        process.exit(1)
      }
      
      init({bases: (''+out.value).split(',')})
    }
  )

function init(opts) {

  const server = new Hapi.Server();		
  
  server.connection({		
    port: 8000,
    host: '0.0.0.0'
  });		
  
  server.register({		
    register: require('./wo.js'),		
    options: { 
      tag: 'front',
      host: '@eth0',
      bases: opts.bases,
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
}
