'use strict';
// Load modules

const Http = require('http');
const Https = require('https');
const Hoek = require('hoek');
const Joi = require('joi');
const Wreck = require('wreck');
const Sneeze = require('sneeze');

// Declare internals

const internals = {
    agents: {}                                      // server.info.uri -> { http, https, insecure }
};


internals.defaults = {
    xforward: false,
    passThrough: false,
    redirects: false,
    timeout: 1000 * 60 * 3,                         // Timeout request after 3 minutes
    localStatePassThrough: false,                   // Pass cookies defined by the server upstream
    maxSockets: Infinity
};


internals.schema = Joi.object({
    host: Joi.string(),
    port: Joi.number().integer(),
    protocol: Joi.string().valid('http', 'https', 'http:', 'https:'),
    uri: Joi.string(),
    passThrough: Joi.boolean(),
    localStatePassThrough: Joi.boolean(),
    acceptEncoding: Joi.boolean().when('passThrough', { is: true, otherwise: Joi.forbidden() }),
    rejectUnauthorized: Joi.boolean(),
    xforward: Joi.boolean(),
    redirects: Joi.number().min(0).integer().allow(false),
    timeout: Joi.number().integer(),
    mapUri: Joi.func(),
    onResponse: Joi.func(),
    agent: Joi.object(),
    ttl: Joi.string().valid('upstream').allow(null),
    maxSockets: Joi.number().positive().allow(false)
});



const Wo = {};

module.exports = Wo;


Wo.start = function start(sneeze_opts) {

    sneeze_opts.isbase = !!sneeze_opts.isbase ? true : sneeze_opts.isbase;
    const sneeze = Sneeze( sneeze_opts );
    if (sneeze_opts.ready) {
        sneeze.on('ready', sneeze_opts.ready);
    }
    sneeze.join({ isbase: true });
};


Wo.register = function (server, pluginOptions, next) {

    server.handler('wo', internals.handler);

    server.decorate('reply', 'wo', function (options) {

        internals.handler(this.request.route, options)(this.request, this);
    });

    const sneeze_opts = pluginOptions.sneeze || {};
    sneeze_opts.bases = sneeze_opts.bases || pluginOptions.bases || [];
    sneeze_opts.tag = sneeze_opts.tag || 'wo';

    const sneeze = Sneeze( sneeze_opts );
    server.decorate('server', 'sneeze', sneeze);

    sneeze.on('add', (meta) => {

        if (!meta.route) {
            return;
        }

        const routeMap = internals.routeMap;

        const key = meta.route.method + '~' + meta.route.path;
        routeMap[key] = (routeMap[key] || []);
        routeMap[key].push( meta );
    });

    sneeze.on('remove', (meta) => {

        if (!meta.route) {
            return;
        }

        const key = meta.route.method + '~' + meta.route.path;

        const routeMap = internals.routeMap;

        routeMap[key] = ( routeMap[key] || [] );

        const len = routeMap[key].length;
        for (let i = 0; i < len; ++i) {
            const remote = routeMap[key][i];
            if ( remote.identifier$ === meta.identifier$ ) {
                routeMap[key].splice(i,1);
                break;
            }
        }
    });

    let route = null;

    if (pluginOptions.route) {
        route = pluginOptions.route;
        route.path = route.path || '/';
        route.method = route.method || 'get';
    }

    server.once('start', () => {

        const sneeze_meta = {
            route: route,
            host: server.info.host,
            port: server.info.port
        };

        sneeze.join(sneeze_meta);
    });

    return next();
};

Wo.register.attributes = {
    pkg: require('../package.json')
};

internals.routeMap = {};
internals.remoteIndex = 0;

internals.handler = function (route, handlerOptions) {

    Joi.assert(handlerOptions, internals.schema, 'Invalid proxy handler options (' + route.path + ')');
    Hoek.assert(!route.settings.payload || ((route.settings.payload.output === 'data' || route.settings.payload.output === 'stream') && !route.settings.payload.parse), 'Cannot proxy if payload is parsed or if output is not stream or data');
    const settings = Hoek.applyToDefaultsWithShallow(internals.defaults, handlerOptions, ['agent']);

    settings.mapUri = handlerOptions.mapUri || internals.mapUri(handlerOptions.protocol, handlerOptions.host, handlerOptions.port, handlerOptions.uri);

    if (settings.ttl === 'upstream') {
        settings._upstreamTtl = true;
    }

    return function (request, reply) {

        settings.mapUri(request, (err, uri, headers) => {

            if (err) {
                return reply(err);
            }

            const protocol = uri.split(':', 1)[0];

            const options = {
                headers: {},
                payload: request.payload,
                redirects: settings.redirects,
                timeout: settings.timeout,
                agent: internals.agent(protocol, settings, request.connection)
            };

            const bind = request.route.settings.bind;

            if (settings.passThrough) {
                options.headers = Hoek.clone(request.headers);
                delete options.headers.host;

                if (settings.acceptEncoding === false) {                    // Defaults to true
                    delete options.headers['accept-encoding'];
                }

                if (options.headers.cookie) {
                    delete options.headers.cookie;

                    const cookieHeader = request.connection.states.passThrough(request.headers.cookie, settings.localStatePassThrough);
                    if (cookieHeader) {
                        if (typeof cookieHeader !== 'string') {
                            return reply(cookieHeader);                     // Error
                        }

                        options.headers.cookie = cookieHeader;
                    }
                }
            }

            if (headers) {
                Hoek.merge(options.headers, headers);
            }

            if (settings.xforward &&
                request.info.remotePort &&
                request.info.remoteAddress) {
                options.headers['x-forwarded-for'] = (options.headers['x-forwarded-for'] ? options.headers['x-forwarded-for'] + ',' : '') + request.info.remoteAddress;
                options.headers['x-forwarded-port'] = (options.headers['x-forwarded-port'] ? options.headers['x-forwarded-port'] + ',' : '') + request.info.remotePort;
                options.headers['x-forwarded-proto'] = (options.headers['x-forwarded-proto'] ? options.headers['x-forwarded-proto'] + ',' : '') + protocol;
            }

            const contentType = request.headers['content-type'];
            if (contentType) {
                options.headers['content-type'] = contentType;
            }

            // Send request

            Wreck.request(request.method, uri, options, (err, res) => {

                let ttl = null;

                if (err) {
                    if (settings.onResponse) {
                        return settings.onResponse.call(bind, err, res, request, reply, settings, ttl);
                    }

                    return reply(err);
                }

                if (settings._upstreamTtl) {
                    const cacheControlHeader = res.headers['cache-control'];
                    if (cacheControlHeader) {
                        const cacheControl = Wreck.parseCacheControl(cacheControlHeader);
                        if (cacheControl) {
                            ttl = cacheControl['max-age'] * 1000;
                        }
                    }
                }

                if (settings.onResponse) {
                    return settings.onResponse.call(bind, null, res, request, reply, settings, ttl);
                }

                return reply(res)
                .ttl(ttl)
                .code(res.statusCode)
                .passThrough(!!settings.passThrough);   // Default to false
            });
        });
    };
};


internals.handler.defaults = function (method) {

    const payload = method !== 'get' && method !== 'head';
    return payload ? {
        payload: {
            output: 'stream',
            parse: false
        }
    } : null;
};


internals.mapUri = function (protocol, host, port, uri) {

    if (uri) {
        return function (request, next) {

            if (uri.indexOf('{') === -1) {
                return next(null, uri);
            }

            const address = uri.replace(/{protocol}/g, request.connection.info.protocol)
                             .replace(/{host}/g, request.connection.info.host)
                             .replace(/{port}/g, request.connection.info.port)
                             .replace(/{path}/g, request.url.path);

            return next(null, address);
        };
    }

    return function (request, next) {

        if (protocol &&
            protocol[protocol.length - 1] !== ':') {
            protocol += ':';
        }

        const key = request.method + '~' + request.url.path;
        let remoteIndex = internals.remoteIndex;

        const remotes = internals.routeMap[key] || [];
        if (remotes.length <= remoteIndex) {
            remoteIndex = 0;
        }

        const remote = remotes[remoteIndex];
        internals.remoteIndex = remotes.length > 0 ? (( remoteIndex + 1 ) % remotes.length) : 0;

        if (remote) {
            host = remote.host;
            port = remote.port;
        }

        protocol = protocol || 'http:';
        port = port || (protocol === 'http:' ? 80 : 443);
        const baseUrl = protocol + '//' + host + ':' + port;

        return next(null, baseUrl + request.path + (request.url.search || ''));
    };
};


internals.agent = function (protocol, settings, connection) {

    if (settings.agent) {
        return settings.agent;
    }

    if (settings.maxSockets === false) {
        return undefined;
    }

    internals.agents[connection.info.uri] = internals.agents[connection.info.uri] || {};
    const agents = internals.agents[connection.info.uri];

    const type = (protocol === 'http' ? 'http' : (settings.rejectUnauthorized === false ? 'insecure' : 'https'));
    if (!agents[type]) {
        agents[type] = (type === 'http' ? new Http.Agent() : (type === 'https' ? new Https.Agent() : new Https.Agent({ rejectUnauthorized: false })));
        agents[type].maxSockets = settings.maxSockets;
    }

    return agents[type];
};
