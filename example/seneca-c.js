const Seneca = require('seneca');		
	
const seneca = Seneca({tag: 'seneca-c'})

seneca
  .use('mesh',{
    pin:'c:*',
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
