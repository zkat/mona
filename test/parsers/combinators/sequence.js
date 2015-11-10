/* global describe, it */
var assert = require('assert')
var mona = require('../../../')
var parse = mona.parse

describe('sequence()', function () {
  it('simulates do notation', function () {
    var parser = mona.sequence(function (s) {
      var x = s(mona.token())
      assert.equal(x, 'a')
      var y = s(mona.token())
      assert.equal(y, 'b')
      return mona.value(y + x)
    })
    assert.equal(parse(parser, 'ab'), 'ba')
  })
  it('errors with the correct message if a parser fails', function () {
    assert.throws(function () {
      var parser = mona.sequence(function (s) {
        var x = s(mona.token())
        assert.equal(x, 'a')
        return mona.token()
      })
      parse(parser, 'a')
    }, /\(line 1, column 2\) unexpected eof/)
    assert.throws(function () {
      var parser = mona.sequence(function (s) {
        s(mona.token())
        s(mona.token())
        s(mona.token())
        return mona.eof()
      })
      parse(parser, 'aa')
    }, /\(line 1, column 3\) unexpected eof/)
  })
  it('throws an error if callback fails to return a parser', function () {
    assert.throws(function () {
      parse(mona.sequence(function () { return 'nope' }), '')
    }, /must return a parser/)
    assert.throws(function () {
      parse(mona.sequence(function () { return function () {} }), '')
    }, /must return a parser/)
  })
})
