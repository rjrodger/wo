var CONSUL = process.env.CONSUL_SERVICE_HOST || 'localhost'

require('seneca')({tag: 'base'})
  .test('print')

  .use('consul-registry', {
    host: CONSUL
  })

  .use('mesh', {
    base: true,
    host: '@eth0', // pod IP
    port: 39000,
    sneeze: {
      tag: null, // handle wo and seneca
      silent: false
    },
    discover: {
      registry: {
        active: true
      }
    }
  })

  .use('seneca-repl', {
    host: '0.0.0.0',
    port: 10000
  })
