'use strict';

const Hapi = require('hapi');

const server = new Hapi.Server();

server.connection();

server.register({
    register: require('..'),
    options: {
        route: [{ path: '/api/ping' }, { path: '/api/foo' }],
        sneeze: { silent: false }
    }
}, console.log);

server.route({
    method: 'GET', path: '/api/ping',
    handler: function ( req, reply ) {

        reply({ b: 2 });
    } });

server.route({
    method: 'GET', path: '/api/foo',
    handler: function ( req, reply ) {

        reply({ bar: 0 });
    } });

server.start(console.log);


