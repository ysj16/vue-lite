(function(){
  /*Dep*/
  var Dep = (function () {
    var uid = 0
    var Dep = function () {
      this.id = uid ++
      this.subs = []
    }
    Dep.target = null
    Dep.prototype.addSub = function (sub) { // sub为Watcher
      this.subs.push(sub)
    }
    Dep.prototype.depend = function () {
      if (Dep.target) {
        Dep.target.addDep(this)
      }
    }
    Dep.prototype.notify = function () {
      for (var i = 0, l=this.subs.length; i < l; i++) {
        this.subs[i].update()
      }
    }
    return Dep
  })()
  /*Observer Array*/
  var initArrayMethod = function (arr) {
    var arrayProto = Array.prototype
    var arrayMethods = Object.create(arrayProto)
    ;['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'].forEach(function(method) {
      var origin = arrayMethods[method]
      arrayMethods[method] = function () {
        var result = origin.apply(this, arguments)
        this.__ob__.dep.notify()
        return result
      }
    })
    arr.__proto__ = arrayMethods
  }
  /* Observe */
  var Observer = (function () {
    var Observer = function (data) {
      this.dep = new Dep()
      Object.defineProperty(data, '__ob__', {
        enumerable: false, 
        value: this
      })
      if (Object.prototype.toString.call(data) ===  '[object Object]') {
        this.walk(data)
      } else if (Object.prototype.toString.call(data) === '[object Array]') {
        // 覆盖数组的7个方法
        initArrayMethod(data)
      }
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
    var childOb = observer(val)
    var dep = new Dep()
    Object.defineProperty(data, key, {
      get: function () {
        if (Dep.target) {
          dep.depend()
          if (childOb) {
            childOb.dep.depend()
          }
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
    if (typeof data !== 'object') { // 当数据类型为Object对象或者Array时才会observer（这里是简单的判断，vue源码的条件更多更严谨）
      return
    }
    var ob = new Observer(data)
    return ob
  }

  /*Watcher*/
  var Watcher = (function () {
    var uid = 0
    var Watcher = function (vm, expOrFn, cb, options) {
      this.uid = uid ++
      var options = options || {}
      if (typeof expOrFn === 'string') {
        this.getter = function () {
          return vm[expOrFn]
        }
      } else if (typeof expOrFn === 'function') {
        this.getter = expOrFn
      }
      this.deep = options.deep || false
      this.lazy = options.deep || false
      this.user = options.deep || false
      this.sync = options.deep || false
      this.vm = vm
      this.cb = cb
      this.deps = []
      this.depIds = new Set()
      this.value = this.lazy ? null : this.get()
    }
    Watcher.prototype.get = function () {
      Dep.target = this
      let value = this.getter.call(this.vm)
      if (this.deep) {
        traverse(value)
      }
      Dep.target = null
      return value
    }
    // watcher观察的数据发生改变时执行update方法
    Watcher.prototype.update = function () {
      // 若是lazy Watcher, 只需把dirty设置为true，否则若sync为true，直接执行run，否则就在nextTick中执行run方法，在这里暂时不考虑queueWatcher情况
      if (this.lazy) {
        this.dirty = true
      } else {
        this.run()
      }
    }
    Watcher.prototype.run = function () {
      const oldValue = this.value
      // 每次执行run方法时都会调用get方法重新收集依赖
      const value = this.get()
      this.value = value
      // 执行watcher的回调
      if (this.cb) {
        this.cb.call(this.vm, value, oldValue)
      }
    }
    // 在dep.depend中调用
    Watcher.prototype.addDep = function (dep) {
      if (!this.depIds.has(dep.id)) {
        this.deps.push(dep)
        this.depIds.add(dep.id)
        dep.addSub(this)
      }
    }
    function traverse (data) {
      var keys = Object.keys(data)
      var i = keys.length
      while (i--) {
        var child = data[keys[i]]
        if (Object.prototype.toString.call(child) === '[object Object]') {
          traverse(child)
        }
      }
    }
    return Watcher
  })()

  function Vue (options) {
    this._init(options)
  }
  initMixin(Vue)
  lifecycleMixin(Vue)
  renderMixin(Vue)
  methodsMixin(Vue)
  function initMixin (Vue) {
    Vue.prototype._init = function (options) {
      var vm = this
      vm.$options = options
      vm._self = vm
      initState(vm)
      if (vm.$options.el) {
        vm.$mount(vm.$options.el)
      }
    }
  }
  function methodsMixin(Vue) {
    Vue.prototype.$watch = function (expOrFn, cb, options) {
      return new Watcher(this, expOrFn, cb, options)
    }
    Vue.prototype.$mount = function (el) {
      return mountComponent(this, el)
    }
  }
  function initState (vm) {
    initData(vm)
    initComputed(vm)
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
  // 初始化computed
  function initComputed (vm) {
    var computed = vm._computed = vm.$options.computed
    var keys = Object.keys(computed)
    var i = keys.length
    while (i--) {
      proxyComputed(vm, keys[i])
    }
  }
  // 代理computed属性到vm实例上
  function proxyComputed (vm, key) {
    Object.defineProperty(vm, key, {
      configurable: true,
      enumerable: true,
      get: function () {
        return vm._computed[key].call(vm)
      }
    })
  }
  /* VNode */
  var VNode = function (tag, data, children, text, elm, context) {
    this.tag = tag
    this.data = data
    this.children = children
    this.text = text
    this.elm = elm
    this.context = context
  }
  function createTextVNode (val) {
    return new VNode(undefined, undefined, undefined, val)
  }
  // 返回一个空的elm的vnode，
  function emptyNodeAt (elm) {
    return new VNode(elm.tagName.toLowerCase(), {}, [], undefined, elm)
  }
  var emptyNode = new VNode('', {}, [])

  /*挂载组件相关*/
  function mountComponent (vm, el) {
    vm.$el = el
    updateComponent = function () {
      vm._update(vm._render())
    }
    vm._watcher = new Watcher(vm, updateComponent)
    return vm
  }
  function lifecycleMixin (Vue) {
    // _update方法接收一个vnode，负责渲染到页面
    Vue.prototype._update = function (vnode) {
      var vm = this
      var prevVnode = vm._vnode
      vm._vnode = vnode
      if (!prevVnode) { // 首次渲染
        vm.$el = this.__patch__(vm.$el, vnode)
      } else {
        vm.$el = this.__patch__(prevVnode, vnode)
      }
    }
  }
  function renderMixin (Vue) {
    // _render方法返回vnode对象
    Vue.prototype._render = function () {
      var vm = this
      var vnode = vm.$options.render.call(vm, vm.$createElement)
      return vnode
    }
    // 挂载、更新vnode到页面上
    Vue.prototype.__patch__ = function (oldVnode, vnode, parentElm, refElm) {
      var isRealElement = oldVnode.nodeType
      // 若isRealElement为true，说明传入的oldVnode为真实的dom节点，则生成一个空vnode实例，其中vnode.elm为传入的dom
      if (isRealElement) {
        oldVnode = emptyNodeAt(oldVnode)
      }
      var oldElm = oldVnode.elm
      var parentElm = nodeOps.parentNode(oldElm)
      createElm(vnode, parentElm, nodeOps.nextSibling(oldElm))
      // 移除老的dom元素
      removeVnodes(parentElm, [oldVnode], 0, 0)
    }
    // $createElement方法返回vnode对象
    Vue.prototype.$createElement = function (tag, data, children) {
      var text, vnode, _children = children || []
      // 处理render函数中的文字
      _children.forEach(function (item, n) {
        if (typeof item === 'string' || typeof item === 'number') {
          _children.splice(n, 1, createTextVNode(item))
        }
      })
      if (typeof tag === 'string') {
        vnode = new VNode(tag, data, _children)
      }
      return vnode
    }
  }
  // web平台dom处理函数封装
  var nodeOps = {
    createElement: function (tagName) {
      return document.createElement(tagName)
    },
    createTextNode: function (text) {
      return document.createTextNode(text)
    },
    appendChild: function (node, child) {
      node.appendChild(child)
    },
    parentNode: function (node) {
      return node.parentNode
    },
    removeChild: function (parent, child) {
      parent.removeChild(child)
    },
    nextSibling: function (el) {
      return el.nextSibling
    },
    insertBefore: function (parent, elm, nextElm) {
      parent.insertBefore(elm, nextElm)
    }
  }
  // 创建真实dom，refElm为插入在哪个元素之前
  function createElm (vnode, parentElm, refElm) {
    var data = vnode.data
    // 创建节点
    if (vnode.tag) {
      vnode.elm = nodeOps.createElement(vnode.tag)
      // 创建子节点
      createChildren(vnode, vnode.children)
      // 添加attr
      if (data) {
        updateAttrs(emptyNode, vnode)
      }
      // 插入到文档中
      insert(parentElm, vnode.elm, refElm)
    } else {
      vnode.elm = nodeOps.createTextNode(vnode.text)
      insert(parentElm, vnode.elm, refElm)
    }
  }
  // 插入dom
  function insert (parent, elm, ref) {
    if (parent) {
      if (!ref) {
        nodeOps.appendChild(parent, elm)
      } else {
        nodeOps.insertBefore(parent, elm, ref)
      }
    }
  }
  // 移除旧的Vnode
  function removeVnodes (parentElm, vnodes, startIdx, endIdx) {
    for(; startIdx <= endIdx; startIdx++) {
      var node = vnodes[startIdx]
      if (node.elm) {
        removeNode(node.elm)
      }
    }
  }
  // 从文档中移除一个节点
  function removeNode (el) {
    var parent = nodeOps.parentNode(el)
    if (parent) {
      nodeOps.removeChild(parent, el)
    }
  }
  // 创建子节点
  function createChildren (vnode, children) {
    if (Object.prototype.toString.call(children) === '[object Array]') {
      for (var i = 0, l = children.length; i < l; i++) {
        createElm(children[i], vnode.elm)
      }
    }
  }
  function updateAttrs (oldVnode, vnode) {
    var oldAttrs = oldVnode.data.attrs || {},
        attrs = vnode.data.attrs || {}
    for (var key in attrs) {
      var old = oldAttrs[key],
          cur = attrs[key]
      if (old !== cur) {
        vnode.elm.setAttribute(key, cur)
      }
    }
  }
  window.Vue = Vue
})()