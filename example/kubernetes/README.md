# Hapi and Seneca mesh integration running on Kubernetes

## minikube

```
$ cd example/kubernetes
$ minikube start
$ eval $(minikube docker-env)
$ make
$ kubectl create -f system.yml 
```

### Notes

* `host: '@eth0'` : use Pod IP as host for mesh - ensures unique location for this mesh node
** See https://github.com/rjrodger/rif (@ prefix is a seneca-mesh shortcut)
* `wo` in upstream-* services needs location of base nodes - get these from consul using https://github.com/senecajs/seneca-consul-registry
* `wo` expects hapi to listen on Pod IP, so use rif to resolve: `rif('eth0')`


