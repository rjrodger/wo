const Seneca = require('seneca');		
	
const seneca = Seneca()
        .use('mesh',{
          pin:'b:*',
          sneeze: {
            silent: false
          }
        })
        .add('b:1', function (msg, reply) {
          reply({b:2})
        })
