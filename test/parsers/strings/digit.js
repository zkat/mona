/* global describe, it */
var assert = require('assert')
var mona = require('../../../')
var parse = mona.parse

describe('digit()', function () {
  it('succeeds if the next token is a digit character', function () {
    assert.equal(parse(mona.digit(), '1'), '1')
    assert.throws(function () {
      parse(mona.digit(), 'z')
    }, /expected digit/)
  })
  it('accepts an optional base/radix argument', function () {
    assert.equal(parse(mona.digit(16), 'f'), 'f')
  })
  it('defaults to base 10', function () {
    assert.equal(parse(mona.digit(), '0'), '0')
    assert.equal(parse(mona.digit(), '9'), '9')
    assert.throws(function () {
      parse(mona.digit(), 'a')
    }, /expected digit/)
  })
})
