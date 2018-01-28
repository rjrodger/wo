const Seneca = require('seneca');		

const CONSUL = process.env.CONSUL_SERVICE_HOST || 'localhost'

const seneca = Seneca({tag: 'seneca-b'})

seneca
  .use('consul-registry', {
    host: CONSUL
  })

  .use('mesh',{
    pin:'b:*',
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

  .add('b:1', function (msg, reply) {
    if( !msg.c ) {
      reply({b:2})
    }
    else {
      this.act({c:msg.c}, function (err, out) {
        if(err) return reply(err)

        reply({b:3, c: out.c})
      })
    }
  })

  .ready(function () {
    console.log(this.id)
  })
