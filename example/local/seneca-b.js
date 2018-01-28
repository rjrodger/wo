const Seneca = require('seneca');		
	
const seneca = Seneca({tag: 'seneca-b'})

seneca
  .use('seneca-repl')
  .use('mesh',{
    pin:'b:*',
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
