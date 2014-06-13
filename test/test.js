var bakerRequire = require('../index');
var should = require('chai').should();

describe('Test baker-require', function () {
  it('should be able to define module without dependencies', function (next) {
    bakerRequire.define('foo', function () {
      next();
    });
    bakerRequire.require('foo');
  });

  it('should be able to define module without commonjs dependencies', function (next) {
    bakerRequire.define('bar', ['module', 'exports', 'require'], function (module, exports, require) {
      exports.bar = 'foo';
      module.should.exist;
      exports.should.exist;
      require.should.exist;
      next();
    });

    bakerRequire.require('bar');
  });

  it('should be able to define module with dependency to other modules', function (next) {
    bakerRequire.define('barfoo', ['module', 'exports', 'require', 'foo', 'bar'], function (module, exports, require, foo, bar) {
      module.should.exist;
      exports.should.exist;
      require.should.exist;
      foo.should.exist;
      bar.should.exist;

      foo.should.be.equal(require('foo'));
      bar.should.be.equal(require('bar'));

      bar.bar.should.be.equal('foo');

      module.exports = function () {
        return bar.bar;
      };

      next();
    });

    bakerRequire.require('barfoo');
  });

  it('should be able to require module', function () {
    var mod = bakerRequire.require('barfoo');
    mod.should.exist;
    mod().should.be.equal('foo');
  });

  it('should be able to require module with callback', function (next) {
    bakerRequire.require('barfoo', function (mod) {
      mod.should.exist;
      mod().should.be.equal('foo');
      next();
    });
  });

  it('should not freeze on circular dependency', function (next) {
    bakerRequire.define('dep1', ['exports', 'dep2'], function (exports, dep) {
      exports.dep2 = dep;
    });
    bakerRequire.define('dep2', ['exports', 'dep1'], function (exports, dep) {
      exports.dep1 = dep;
    });

    var mod = bakerRequire.require('dep1');
    mod.should.exist;

    process.nextTick(function () {
      mod.dep2.dep1.should.be.equal(mod);
      next();
    });
  });

  it('should support defining an empty module', function () {
    bakerRequire.define('empty');
    bakerRequire.require('empty');
  });

  it('should support defining a variable as a module', function () {
    bakerRequire.define('var', {foo: 'bar'});
    bakerRequire.require('var').foo.should.equal('bar');
  });

  it('should support requiring multiple modules', function () {
    bakerRequire.require(['foo', 'bar']).length.should.equal(2);
  });

  it('should support requiring multiple modules with callback', function (next) {
    bakerRequire.require(['foo', 'bar'], function (foo, bar) {
      foo.should.equal(bakerRequire.require('foo'));
      bar.should.equal(bakerRequire.require('bar'));
      next();
    })
  });
});
