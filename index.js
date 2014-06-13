
// Make possible for the minifier to minify defines
var define, require;

(function (undefined) {
  var moduleMap = {};

  function process(moduleData) {
    var name = moduleData.name;
    var deps = moduleData.deps;
    var callback = moduleData.cb;
    var waiting = moduleData.waiting;
    var defining = moduleData.defining;
    var defined = moduleData.defined;
    var exports = moduleData.exports;
    var module = moduleData.module;

    if (defined || defining) {
      return module.exports;
    }

    moduleData.waiting = false;
    moduleData.defining = true;

    var args = [];
    var i = 0, dep;
    for (; i < deps.length; i++) {

      dep = deps[i];

      if (dep === 'module') {
        args.push(module);
      } else if (dep === 'exports') {
        args.push(exports);
      } else if (dep === 'require') {
        args.push(require);
      } else if(typeof callback === 'function' && callback.length > i) {
        args.push(require(dep));
      }
    }

    var result = typeof callback === 'function' ?
      callback.apply(null, args) :
      callback;

    moduleData.defined = true;
    moduleData.defining = false;

    if (typeof result !== 'undefined') {
      module.exports = result;
    }

    return module.exports;
  }

  define = function (name, deps, callback) {
    if (arguments.length < 3) {
      callback = deps;
      deps = ['require', 'exports', 'module'];
    }

    var exports = {};
    var module = {
      id: name,
      exports: exports
    };

    moduleMap[name] = {
      name: name,
      deps: deps,
      cb: callback,
      exports: exports,
      module: module,
      waiting: true
    };
  };

  define.amd = {};

  require = function (name, callback) {
    var res;
    if (typeof name === 'string' && typeof callback === 'undefined') {
      return process(moduleMap[name]);
    } else {
      if (name.splice) {
        res = [];
        var i = 0;
        for (; i < name.length; i++) {
          res.push(require(name[i]));
        }
      } else {
        res = [process(moduleMap[name])];
      }
    }

    if (typeof callback === 'function') {
      callback.apply(null, res);
    } else {
      return res;
    }
  };
})();

// For testing etc
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports.define = define;
  module.exports.require = require;
}
