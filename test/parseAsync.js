/* global describe, it */
var assert = require('assert')
var mona = require('..')

describe('parseAsync()', function () {
  it('executes a callback on asynchronous results', function (done) {
    var step = 0
    var handle = mona.parseAsync(mona.token(), function (_err, token) {
      step++
      assert.equal(token, 'a')
      if (step === 2) {
        done()
      }
    })
    handle.data('aa')
    handle.done()
  })
  it('stops if a non-eof error happens', function (done) {
    var step = 0
    var handle = mona.parseAsync(mona.string('foo'), function (err, data) {
      step++
      if (step < 4) {
        assert.equal(err, null)
        assert.equal(data, 'foo')
      } else {
        if (step > 4) {
          throw new Error('It was never supposed to be like this!')
        }
        assert.equal(
          err.message,
          '(line 1, column 10) expected string matching {foo}')
        done()
      }
    })
    handle.data('fo')
    handle.data('ofoo')
    handle.data('foox')
  })
  it('throws an error if anything is done to a closed handle', function () {
    var handle = mona.parseAsync(mona.token(), function () {})
    handle.done()
    assert.throws(handle.done)
    assert.throws(handle.data)
    assert.throws(handle.error)
  })
  it('calls function with an error and closes on .error()', function (done) {
    var testErr = new Error('test')
    var handle = mona.parseAsync(mona.token(), function (err) {
      assert.equal(err, testErr)
      done()
    })
    handle.error(testErr)
  })
  it('includes correct source position info in errors', function (done) {
    var parser = mona.string('foo\n')
    var handle = mona.parseAsync(parser, function (err) {
      if (err) {
        assert.equal(
          err.message,
          '(line 5, column 1) expected string matching {foo\n}')
        done()
      }
    })
    handle.data('fo')
    handle.data('o\nfoo')
    handle.data('\nf')
    handle.data('oo\nfoo\nbbbb')
    handle.done()
  })
  describe('#data()', function () {
    it('returns the handle', function () {
      var handle = mona.parseAsync(mona.token(), function () {})
      assert.equal(handle.data('foo'), handle)
    })
  })
  describe('#done()', function () {
    it('returns the handle', function () {
      var handle = mona.parseAsync(mona.token(), function () {})
      assert.equal(handle.done(), handle)
    })
  })
  describe('#error()', function () {
    it('returns the handle', function () {
      var handle = mona.parseAsync(mona.token(), function () {})
      assert.equal(handle.error(new Error('bye')), handle)
    })
  })
})
