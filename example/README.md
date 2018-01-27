# Hapi and Seneca mesh integration

## Manual run

In separate terminals:

```
$ node base.js
```

Prints https://github.com/rjrodger/sneeze debugging. This is enabled for all services. To turn off, set `silent:false`.

```
$ node monitor.js
```

This tracks mesh registrations - use to observe live mesh state. After starting each server below, check the status in this terminal. See https://github.com/rjrodger/sneeze#monitor-


```
$ node front.js
```

Starts front hapi proxy. Test with http://localhost:8000/api/ping - validates that front is responding to inbound HTTP.



```
$ node upstream-a.js
```


Starts the upstream hapi server that provides /api/a results. Test with http://localhost:8000/api/a - validates that front and upstream-a can talk.


```
$ node upstream-b.js
```

Starts the upstream hapi server that provides /api/b results. It won't work yet as it needs the seneca-b microservice.

```
$ node seneca-b.js
```

Start the seneca-b microservice. Now you can test with http://localhost:8000/api/b - validates that front and upstream-b and seneca-b can talk.

Note: you can test this microservice separately using https://github.com/senecajs/seneca-repl - run:

```
$ telnet localhost 30303
```

Then enter `b:1` to send the service a message (same as upstream-b does).

```
$ node seneca-c.js
```

This runs the seneca-c microservice. seneca-b uses seneca-c as past of the bc:* message processing. You can test seneca-c separately using the seneca-b repl, as they are both part of the same mesh - enter `c:1` in the repl to try it.

Test front -> upstream-b -> seneca-b -> seneca with http://localhost:8000/api/b?c=3






