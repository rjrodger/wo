'use strict';

const Hapi = require('hapi');
const Wo = require('../..');

const server = new Hapi.Server();

server.connection({
    port: 8000
});

server.register({
    register: Wo,
    options: { sneeze: { silent: false } }
}, console.log);

server.route({
    method: 'GET', path: '/api/ping',
    handler: { wo: {} }
});

server.route({
    method: 'GET', path: '/api/foo',
    handler: { wo: {} }
});

server.start(console.log);
