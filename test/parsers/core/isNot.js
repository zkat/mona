/* global describe, it */
var assert = require('assert')
var mona = require('../../../')
var parse = mona.parse

describe('isNot()', function () {
  it('parses a token matching a predicate', function () {
    var parser = mona.isNot(function (t) {
      return t !== '\n'
    })
    assert.equal(parse(parser, '\n'), '\n')
    assert.throws(function () {
      parse(parser, '\r')
    })
  })
  it('run the predicate on the result of an arbitrary paresr', function () {
    var parser = mona.isNot(function (x) {
      return x === 'foo'
    }, mona.text())
    assert.equal(parse(parser, 'bar'), 'bar')
    assert.throws(function () {
      parse(parser, 'foo')
    })
  })
})
