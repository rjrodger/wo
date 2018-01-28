const Hapi = require('hapi');		
const Seneca = require('seneca');		
const Rif = require('rif')

const rif = Rif()

const CONSUL = process.env.CONSUL_SERVICE_HOST || 'localhost'

Seneca({tag: 'upstream-b'})
  .test('print')

  .use('consul-registry', {
    host: CONSUL
  })

  .use('mesh',{
    host: '@eth0',
    discover: {
      registry: {
        active: true
      }
    },
    sneeze: {
      silent: false
    }
  })

  .act(
    'role:registry,cmd:get,default$:{}',
    {key:'seneca-mesh/-/bases'},
    function(err, out) {
      if(err) {
        console.log(err)
        process.exit(1)
      }
      
      init({
        bases: (''+out.value).split(','),
        seneca: this
      })
    }
  )


function init(opts) {

  const server = new Hapi.Server();		
  
  server.connection({host: rif('eth0')});		
  
  server.register({		
    register: require('./wo.js'),		
    options: {		
      tag: 'upstream-b',
      host: '@eth0',
      bases: opts.bases,
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
      opts.seneca.act('b:1', {c:req.query.c}, function (err, out) {
        reply({ b: err || out.b, c: err || out.c, when: Date.now() });		
      })
    }
  });		
  
  server.start(console.log);
}
