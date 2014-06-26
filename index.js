
// Make possible for the minifier to minify defines
var define, require;

(function (undefined) {
  var moduleData = {};

  var STATUS_INIT = 0;
  var STATUS_LOADING = 1;
  var STATUS_DEFINING = 2;
  var STATUS_DEFINED = 3;
  var STATUS_PROCESSED = 4;
  var STATUS_LOADING_DEPS = 5;
  var STATUS_PROCESSING= 6;

  function getDef(name) {
    if (!moduleData[name]) {
      var exports = {};
      var module = {
        id: name,
        exports: exports
      };
      moduleData[name] = {
        module: module,
        exports: exports,
        name: name,
        status: STATUS_INIT,
        listeners: []
      };
    }
    return moduleData[name];
  }

  function fire(arr, args) {
    if (arr) {
      var i = 0, length = arr.length;
      for (; i < length; i++) {
        arr[i].apply(this, args);
      }
    }
  }

  function process(moduleDef, load) {
    var deps = moduleDef.deps;
    var module = moduleDef.module;
    var exports = moduleDef.exports;
    var callback = moduleDef.callback;
    var name = moduleDef.name;
    var status = moduleDef.status;

    switch (status) {
    case STATUS_INIT:
      throw new Error('Module ' + name + ' is not defined');
      break;
    case STATUS_LOADING:
        throw new Error('Module ' + name + ' is not loaded');
        break;
    case STATUS_DEFINING:
      // process when ready to populate module.exports
      moduleDef.listeners.push(function () {
        process(moduleDef);
      });
    case STATUS_PROCESSED:
    case STATUS_PROCESSING:
      return module.exports;
      break;
    }

    moduleDef.status = STATUS_PROCESSING;

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

    if (typeof result !== 'undefined') {
      module.exports = result;
    }

    moduleDef.status = STATUS_PROCESSED;

    return module.exports;
  }

  define = function (name, deps, callback) {
    if (arguments.length < 3) {
      callback = deps;
      deps = ['require', 'exports', 'module'];
    }

    var moduleDef = getDef(name);
    moduleDef.deps = deps;
    moduleDef.callback = callback;
    moduleDef.status = STATUS_DEFINING;

    var count = 0;
    var i = 0, dep, length = deps.length;

    function ready() {
      moduleDef.status = STATUS_DEFINED;
      fire(moduleDef.listeners);
      moduleDef.listeners = [];
    }

    function depLoaded() {
      count++;
      if (count === deps.length) {
        ready();
      }
    }

    if (length > 0) {
      for (; i < length; i++) {
        dep = deps[i];

        if (dep === 'module' ||
            dep === 'exports' ||
            dep === 'require') {
          depLoaded();
        } else {
          require._async(dep, depLoaded);
        }
      }
    } else {
      ready();
    }
  };

  define.amd = {};

  require = function (name, callback) {
    var moduleDef;
    var async = typeof callback === 'function';

    if (!async && !name.splice) {
      moduleDef = getDef(name);
      return process(moduleDef);
    } else {
      var count = 0;
      var results = [];
      name = name.splice ? name : [name];

      function modLoaded() {
        count++;
        if (count === name.length &&
            typeof callback === 'function') {
          callback.apply(this, results);
        }
      }

      var i = 0, length = name.length;
      for (; i < length; i++) {
        (function (name) {
          require._async(name, function () {
            moduleDef = getDef(name);
            results.push(process(moduleDef));
            modLoaded();
          });
        })(name[i]);
      }

      return results;
    }
  };

  require._async = function (name, callback) {
    var moduleDef = getDef(name);

    switch (moduleDef.status) {
    case STATUS_INIT:
        moduleDef.listeners.push(callback);
        require._load(name);
        break;
    case STATUS_LOADING:
        moduleDef.listeners.push(callback);
      break;
    case STATUS_DEFINING:
    case STATUS_LOADING_DEPS:
    case STATUS_DEFINED:
    case STATUS_PROCESSED:
      callback();
      break;
    }
  };

  require._browserLoad = function (name) {
    var path = '/' + name.replace(/\.js$/, '').replace(/^\//, '');

    if (require.add_js) {
      name += '.js';
    }

    path += '?amd=true';

    var root = (require.root || '/').replace(/\/$/, '');

    var fileref = document.createElement('script');
    fileref.setAttribute("type", "text/javascript");
    fileref.setAttribute("async", "true");
    fileref.setAttribute("src", root + path);
    fileref.addEventListener("error", function () {
      throw new Error(name + ' failed to load');
    });
    document.getElementsByTagName("head")[0].appendChild(fileref);
  };

  require._load = function (name) {
    var moduleDef = getDef(name);
    moduleDef.status = STATUS_LOADING;
    setTimeout(function () {
      if (moduleDef.status === STATUS_LOADING) {
        if (typeof window !== 'undefined') {
          require._browserLoad(name);
        } else {
          throw new Error("Async loading works only in browser");
        }
      }
    }, 1);
  };
})();

// For testing etc
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports.define = define;
  module.exports.require = require;
}
