const Seneca = require('seneca');		
	
const CONSUL = process.env.CONSUL_SERVICE_HOST || 'localhost'

const seneca = Seneca({tag: 'seneca-c'})

seneca
  .use('consul-registry', {
    host: CONSUL
  })

  .use('mesh',{
    pin:'c:*',
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

  .add('c:*', function (msg, reply) {
    reply({c:3})
  })

  .ready(function () {
    console.log(this.id)
  })
