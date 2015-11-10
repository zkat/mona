/* global describe, it */
var assert = require('assert')
var mona = require('../../../')
var parse = mona.parse

describe('alphanum()', function () {
  it('parses either an alphabetical character or a digit', function () {
    assert.equal(parse(mona.alphanum(), 'x'), 'x')
    assert.equal(parse(mona.alphanum(), '7'), '7')
    assert.throws(function () {
      parse(mona.alphanum(), '?')
    }, /expected alphanum/)
  })
  it('accepts an optional base/radix argument', function () {
    assert.equal(parse(mona.alphanum(16), 'f'), 'f')
  })
  it('defaults to base 10', function () {
    assert.equal(parse(mona.alphanum(), '0'), '0')
    assert.equal(parse(mona.alphanum(), '9'), '9')
  })
})
