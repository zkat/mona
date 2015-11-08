/* global describe, it */
var assert = require('assert')
var mona = require('../../../')
var parse = mona.parse

describe('is()', function () {
  it('parses a token matching a predicate', function () {
    var parser = mona.is(function (t) {
      return t === '\n'
    })
    assert.equal(parse(parser, '\n'), '\n')
    assert.throws(function () {
      parse(parser, '\r')
    })
  })
  it('runs the predicate on the result of an arbitrary parser', function () {
    var parser = mona.is(function (x) {
      return x === 'foo'
    }, mona.text())
    assert.equal(parse(parser, 'foo'), 'foo')
    assert.throws(function () {
      parse(parser, 'bar')
    })
  })
})
