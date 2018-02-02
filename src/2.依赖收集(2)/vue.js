(function(){
  /*Dep*/
  var Dep = (function () {
    var Dep = function () {
      this.subs = []
    }
    Dep.target = null
    Dep.prototype.addSub = function (sub) { // sub为Watcher
      this.subs.push(sub)
    }
    Dep.prototype.notify = function () {
      for (var i = 0, l=this.subs.length; i < l; i++) {
        this.subs[i].update()
      }
    }
    return Dep
  })()
  /* Observe */
  var Observer = (function () {
    var Observer = function (data) {
      Object.defineProperty(data, '__ob__', {
        enumerable: false, 
        value: this
      })
      this.walk(data)
    }
    Observer.prototype.walk = function (data) {
      var keys = Object.keys(data)
      var i = keys.length
      while (i--) {
        defineReactive(data, keys[i], data[keys[i]])
      }
    }
    return Observer
  })()
  function defineReactive (data, key, val) {
    observer(val)
    var dep = new Dep()
    Object.defineProperty(data, key, {
      get: function () {
        if (Dep.target) {
          dep.addSub(Dep.target)
        }
        return val
      },
      set: function (newVal) {
        if (val === newVal) {
          return
        }
        val = newVal
        dep.notify()
      }
    })
  }
  function observer (data) {
    if (typeof data !== 'object') {
      return
    }
    new Observer(data)
  }
  /*Watcher*/
  var Watcher = (function () {
    var Watcher = function (vm, expOrFn, cb, options) {
      if (typeof expOrFn === 'string') {
        this.getter = function () {
          return vm[expOrFn]
        }
      } else if (typeof expOrFn === 'function') {
        // todo
      }
      this.vm = vm
      this.cb = cb
      this.value = this.get()
    }
    Watcher.prototype.get = function () {
      Dep.target = this
      let value = this.getter.call(this.vm)
      Dep.target = null
      return value
    }
    Watcher.prototype.update = function () {
      // todo
      this.cb()
    }
    return Watcher
  })()

  function Vue (options) {
    this._init(options)
  }
  initMixin(Vue)
  methodsMixin(Vue)
  function initMixin (Vue) {
    Vue.prototype._init = function (options) {
      var vm = this
      vm.$options = options
      vm._self = vm
      initState(vm)
    }
  }
  function methodsMixin(Vue) {
    Vue.prototype.$watch = function (expOrFn, cb, options) {
      return new Watcher(this, expOrFn, cb, options)
    }
  }
  function initState (vm) {
    initData(vm)
  }
  function initData (vm) {
    var data = vm.$options.data
    // 通常每个data我们都是通过一个工厂方法返回一个新对象，避免重复实例化导致几个实例用了同一个data，因此这里要执行这个方法获得data对象
    data = vm._data = typeof data === 'function' ? data.call(vm) : data || {}
    var keys = Object.keys(data)
    var i = keys.length
    while(i--) {
      proxy(vm, keys[i]) 
    }
    observer(data)
  }
  function proxy (vm, key) {
    Object.defineProperty(vm, key, {
      configurable: true,
      enumerable: true,
      get: function () {
        return vm._data[key]
      },
      set: function (val) {
        vm._data[key] = val
      }
    })
  }
  function initComputed (vm) {
    var computed = vm.computed
  }
  window.Vue = Vue
})()