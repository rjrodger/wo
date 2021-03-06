'use strict'
// Load modules

const Http = require('http')
const Https = require('https')
const Hoek = require('hoek')
const Joi = require('joi')
const Wreck = require('wreck')

const Rif = require('rif')
const Sneeze = require('sneeze')


// Declare internals

const internals = {
  agents: {} // server.info.uri -> { http, https, insecure }
}
const NS_PER_SEC = 1e9

internals.defaults = {
  xforward: false,
  passThrough: false,
  redirects: false,
  timeout: 1000 * 60 * 3, // Timeout request after 3 minutes
  localStatePassThrough: false, // Pass cookies defined by the server upstream
  maxSockets: Infinity,
  downstreamResponseTime: false
}

internals.schema = Joi.object({
  host: Joi.string(),
  port: Joi.number().integer(),
  protocol: Joi.string().valid('http', 'https', 'http:', 'https:'),
  uri: Joi.string(),
  passThrough: Joi.boolean(),
  localStatePassThrough: Joi.boolean(),
  acceptEncoding: Joi.boolean().when('passThrough', {
    is: true,
    otherwise: Joi.forbidden()
  }),
  rejectUnauthorized: Joi.boolean(),
  xforward: Joi.boolean(),
  redirects: Joi.number()
    .min(0)
    .integer()
    .allow(false),
  timeout: Joi.number().integer(),
  mapUri: Joi.func(),
  onResponse: Joi.func(),
  onRequest: Joi.func(),
  agent: Joi.object(),
  ttl: Joi.string()
    .valid('upstream')
    .allow(null),
  maxSockets: Joi.number()
    .positive()
    .allow(false),
  secureProtocol: Joi.string(),
  ciphers: Joi.string(),
  downstreamResponseTime: Joi.boolean(),

  bases: Joi.array(),
  tag: Joi.string(),
  netif: Joi.object()
})

// wo
//.xor('host', 'mapUri', 'uri')

  .without('mapUri', 'port')
  .without('mapUri', 'protocol')
  .without('uri', 'port')
  .without('uri', 'protocol')


exports.pkg = require('./package.json')


exports.start = function start(sneeze_opts) {
  sneeze_opts.isbase = void 0 === sneeze_opts.isbase ? true : sneeze_opts.isbase
  sneeze_opts.host = internals.resolve_interface(
    sneeze_opts.host,
    Rif(sneeze_opts.netif)
  )

  const sneeze = Sneeze(sneeze_opts)
  if (sneeze_opts.ready) {
    sneeze.on('ready', sneeze_opts.ready)
  }
  sneeze.join({ isbase: sneeze_opts.isbase })
}


exports.register = function(server, pluginOptions) {
  internals.defaults = Hoek.applyToDefaults(internals.defaults, pluginOptions)

  server.decorate('handler', 'wo', internals.handler)

  server.decorate('toolkit', 'wo', function(options) {
    return internals.handler(this.request.route, options)(this.request, this)
  })

  internals.sneeze(server, pluginOptions)
}

internals.handler = function(route, handlerOptions) {
  const settings = Hoek.applyToDefaultsWithShallow(
    internals.defaults,
    handlerOptions,
    ['agent']
  )
  Joi.assert(
    handlerOptions,
    internals.schema,
    'Invalid proxy handler options (' + route.path + ')'
  )
  Hoek.assert(
    !route.settings.payload ||
      ((route.settings.payload.output === 'data' ||
        route.settings.payload.output === 'stream') &&
        !route.settings.payload.parse),
    'Cannot proxy if payload is parsed or if output is not stream or data'
  )
  settings.mapUri =
    handlerOptions.mapUri ||
    internals.mapUri(
      handlerOptions.protocol,
      handlerOptions.host,
      handlerOptions.port,
      handlerOptions.uri
    )

  if (settings.ttl === 'upstream') {
    settings._upstreamTtl = true
  }

  
  // wo
  const context = {
    upstreamIndex: 0
  }


  return async function(request, h) {

    // wo
    const { uri, headers } = await settings.mapUri(context, request)

    const protocol = uri.split(':', 1)[0]

    const options = {
      headers: {},
      payload: request.payload,
      redirects: settings.redirects,
      timeout: settings.timeout,
      agent: internals.agent(protocol, settings, request)
    }

    const bind = request.route.settings.bind

    if (settings.passThrough) {
      options.headers = Hoek.clone(request.headers)
      delete options.headers.host
      delete options.headers['content-length']

      if (settings.acceptEncoding === false) {
        // Defaults to true
        delete options.headers['accept-encoding']
      }

      if (options.headers.cookie) {
        delete options.headers.cookie

        const cookieHeader = request.server.states.passThrough(
          request.headers.cookie,
          settings.localStatePassThrough
        )
        if (cookieHeader) {
          if (typeof cookieHeader !== 'string') {
            throw cookieHeader // Error
          }

          options.headers.cookie = cookieHeader
        }
      }
    }

    if (headers) {
      Hoek.merge(options.headers, headers)
    }

    if (
      settings.xforward &&
      request.info.remotePort &&
      request.info.remoteAddress
    ) {
      options.headers['x-forwarded-for'] =
        (options.headers['x-forwarded-for']
          ? options.headers['x-forwarded-for'] + ','
          : '') + request.info.remoteAddress
      options.headers['x-forwarded-port'] =
        options.headers['x-forwarded-port'] || request.info.remotePort
      options.headers['x-forwarded-proto'] =
        options.headers['x-forwarded-proto'] || request.server.info.protocol
      options.headers['x-forwarded-host'] =
        options.headers['x-forwarded-host'] || request.info.host
    }

    if (settings.ciphers) {
      options.ciphers = settings.ciphers
    }

    if (settings.secureProtocol) {
      options.secureProtocol = settings.secureProtocol
    }

    const contentType = request.headers['content-type']
    if (contentType) {
      options.headers['content-type'] = contentType
    }

    let ttl = null
    let res

    let downstreamStartTime
    if (settings.downstreamResponseTime) {
      downstreamStartTime = process.hrtime()
    }

    // console.log('URI', uri)
    
    const promise = Wreck.request(request.method, uri, options)

    if (settings.onRequest) {
      settings.onRequest(promise.req)
    }

    let downstreamResponseTime
    try {
      res = await promise
      if (settings.downstreamResponseTime) {
        downstreamResponseTime = process.hrtime(downstreamStartTime)
        request.log(['wo', 'success'], {
          downstreamResponseTime:
            downstreamResponseTime[0] * NS_PER_SEC + downstreamResponseTime[1]
        })
      }
    } catch (error) {
      if (settings.downstreamResponseTime) {
        downstreamResponseTime = process.hrtime(downstreamStartTime)
        request.log(['wo', 'error'], {
          downstreamResponseTime:
            downstreamResponseTime[0] * NS_PER_SEC + downstreamResponseTime[1]
        })
      }
      if (settings.onResponse) {
        return settings.onResponse.call(
          bind,
          error,
          res,
          request,
          h,
          settings,
          ttl
        )
      }

      throw error
    }

    if (settings._upstreamTtl) {
      const cacheControlHeader = res.headers['cache-control']
      if (cacheControlHeader) {
        const cacheControl = Wreck.parseCacheControl(cacheControlHeader)
        if (cacheControl) {
          ttl = cacheControl['max-age'] * 1000
        }
      }
    }

    if (settings.onResponse) {
      return settings.onResponse.call(
        bind,
        null,
        res,
        request,
        h,
        settings,
        ttl
      )
    }

    return h
      .response(res)
      .ttl(ttl)
      .code(res.statusCode)
      .passThrough(!!settings.passThrough)
  }
}

internals.handler.defaults = function(method) {
  const payload = method !== 'get' && method !== 'head'
  return payload
    ? {
        payload: {
          output: 'stream',
          parse: false
        }
      }
    : null
}

internals.mapUri = function(protocol, host, port, uri) {
  if (uri) {

    // wo
    return function(context, request) {

      if (uri.indexOf('{') === -1) {
        return { uri }
      }

      let address = uri
        .replace(/{protocol}/g, request.server.info.protocol)
        .replace(/{host}/g, request.server.info.host)
        .replace(/{port}/g, request.server.info.port)
        .replace(/{path}/g, request.url.path)

      Object.keys(request.params).forEach(key => {
        const re = new RegExp(`{${key}}`, 'g')
        address = address.replace(re, request.params[key])
      })

      return {
        uri: address
      }
    }
  }

  if (protocol && protocol[protocol.length - 1] !== ':') {
    protocol += ':'
  }

  protocol = protocol || 'http:'

  //port = port || (protocol === 'http:' ? 80 : 443)
  //const baseUrl = protocol + '//' + host + ':' + port

  // wo 
  return function(context, request) {
    const key = request.method + '~' + request.route.path
    let upstreamIndex = context.upstreamIndex

    const upstreams = internals.routeMap[key] || []
    if (upstreams.length <= upstreamIndex) {
      upstreamIndex = 0
    }

    const upstream = upstreams[upstreamIndex]
    context.upstreamIndex = upstreams.length > 0
      ? (upstreamIndex + 1) % upstreams.length
      : 0

    var reqhost = host
    var reqport = port
    
    if (upstream) {
      reqhost = upstream.remote$.host
      reqport = upstream.remote$.port
    }

    reqport = reqport || (protocol === 'http:' ? 80 : 443)
    const baseUrl = protocol + '//' + reqhost + ':' + reqport

    //console.log('mapuri',key,baseUrl,internals.routeMap)
    
    return {
      uri: (null, baseUrl + request.path + (request.url.search || ''))
    }
  }
}

internals.agent = function(protocol, settings, request) {
  if (settings.agent) {
    return settings.agent
  }

  if (settings.maxSockets === false) {
    return undefined
  }

  internals.agents[request.info.uri] = internals.agents[request.info.uri] || {}
  const agents = internals.agents[request.info.uri]

  const type =
    protocol === 'http'
      ? 'http'
      : settings.rejectUnauthorized === false
        ? 'insecure'
        : 'https'
  if (!agents[type]) {
    agents[type] =
      type === 'http'
        ? new Http.Agent()
        : type === 'https'
          ? new Https.Agent()
          : new Https.Agent({ rejectUnauthorized: false })
    agents[type].maxSockets = settings.maxSockets
  }

  return agents[type]
}


internals.routeMap = {}
internals.remoteIndex = 0

internals.sneeze = function(server, pluginOptions) {
  // fixed network interface specification, as per format of
  // require('os').networkInterfaces. Merged with and overrides same.
  const rif = Rif(pluginOptions.netif)

  const sneeze_opts = pluginOptions.sneeze || {}

  sneeze_opts.identifier = server.info.id + '/' + (pluginOptions.tag || '-')

  sneeze_opts.host = internals.resolve_interface(
    sneeze_opts.host || pluginOptions.host,
    rif
  )
  sneeze_opts.port = sneeze_opts.port || pluginOptions.port || void 0
  sneeze_opts.bases = sneeze_opts.bases || pluginOptions.bases || void 0

  // sneeze network tag, not instance tag
  sneeze_opts.tag = sneeze_opts.tag || 'wo'
  
  //console.log(sneeze_opts)
  const sneeze = Sneeze(sneeze_opts)
  server.decorate('server', 'sneeze', sneeze)

  sneeze.on('add', meta => {
    //console.log('WO ADD',server.info,sneeze_opts,meta)

    if (!meta.route) {
      return
    }

    const routeMap = internals.routeMap

    const routes = Array.isArray(meta.route) ? meta.route : [meta.route]

    for (let i = 0; i < routes.length; ++i) {
      const route = routes[i]
      route.remote$ = {
        identifier: meta.identifier$,
        tag: meta.tag$,
        host: meta.host,
        port: meta.port
      }

      const methods = Array.isArray(route.method)
        ? route.method
        : [route.method]

      for (let j = 0; j < methods.length; ++j) {
        const method = ('' + methods[j]).toLowerCase()
        const key = method + '~' + route.path

        routeMap[key] = routeMap[key] || []
        const routelist = routeMap[key]

        // avoid duplicates
        let add = true
        for (let k = 0; k < routelist.length; ++k) {
          if (routelist[k].remote$.identifier === meta.identifier$) {
            add = false
            break
          }
        }

        if (add) {
          routeMap[key].push(route)
        }
      }
    }
  })

  sneeze.on('remove', meta => {
    //console.log('WO REM',server.info,sneeze_opts,meta)
    //console.log('WO REM RM S', internals.routeMap)
    
    if (!meta.route) {
      return
    }

    const routeMap = internals.routeMap

    const routes = meta.route

    for (let i = 0; i < routes.length; ++i) {
      const route = routes[i]

      const methods = Array.isArray(route.method)
        ? route.method
        : [route.method]

      for (let j = 0; j < methods.length; ++j) {
        const key = ('' + methods[j]).toLowerCase() + '~' + route.path
        routeMap[key] = routeMap[key] || []

        const len = routeMap[key].length
        for (let k = 0; k < len; ++k) {
          const upstream = routeMap[key][k]

          if (upstream.remote$.identifier === meta.identifier$) {
            routeMap[key].splice(k, 1)
            break
          }
        }
      }
    }

    //console.log('WO REM RM E', internals.routeMap)
  })

  let route = null

  if (pluginOptions.route) {
    route = pluginOptions.route
    route = Array.isArray(route) ? route : [route]
    for (let i = 0; i < route.length; ++i) {
      const r = route[i]
      r.path = r.path || '/'
      r.method = r.method || 'get'
    }
  }

  server.events.once('start', () => {
    const sneeze_meta = {
      route,
      host: pluginOptions.host || server.info.host,
      port: server.info.port
    }

    //console.log('WO JOIN',server.info,sneeze_opts,sneeze_meta)

    sneeze.join(sneeze_meta)
  })
}


internals.resolve_interface = function(spec, rif) {
  let out = spec

  spec = null == spec ? '' : spec

  if ('@' === spec[0]) {
    if (1 === spec.length) {
      out = '0.0.0.0'
    } else {
      out = rif(spec.substring(1))
    }
  }

  return out
}

