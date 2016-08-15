'use strict';

// Load modules

const Hapi = require('hapi');
const Wo = require('../..');


module.exports = function (callback) {

    const server = new Hapi.Server();

    server.connection({ port: 0 });

    server.register({
        register: Wo,
        options: {
            route: { path: '/api/ping' },
            sneeze: { silent: false }
        }
    }, (err) => {

        if (err) {
            return callback(err);
        }

        server.route({
            method: 'GET',
            path: '/api/ping',
            handler: function (req, reply) {

                reply({ a: 1 });
            }
        });

        server.start((err) => {
            if (err) {
                return callback(err);
            }

            callback(null, server);
        });
    });
});
