/* global describe, it */
var assert = require('assert')
var mona = require('../../../')
var parse = mona.parse

describe('between()', function () {
  it('returns a value in between two other parsers', function () {
    var parser = mona.between(mona.string('('),
    mona.string(')'),
    mona.integer())
    assert.equal(parse(parser, '(123)'), 123)
    assert.throws(function () {
      parse(parser, '123)')
    }, /expected string matching \{\(\}/)
    assert.throws(function () {
      parse(parser, '(123')
    }, /expected string matching \{\)\}/)
    assert.throws(function () {
      parse(parser, '()')
    }, /expected digit/)
    var maybeParser = mona.between(mona.string('('),
    mona.string(')'),
    mona.maybe(mona.integer()))
    assert.equal(parse(maybeParser, '()'), undefined)
  })
})
