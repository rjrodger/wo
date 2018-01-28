const Hapi = require('hapi');		
const Seneca = require('seneca');
const Rif = require('rif')

const rif = Rif()

const CONSUL = process.env.CONSUL_SERVICE_HOST || 'localhost'

Seneca({tag: 'upstream-a'})
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
  
  server.connection({host: rif('eth0')});		
  
  server.register({		
    register: require('./wo.js'),		
    options: {		
      tag: 'upstream-a',
      host: '@eth0',
      bases: opts.bases,
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
}
