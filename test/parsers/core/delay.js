/* global describe, it */
var assert = require('assert')
var mona = require('../../../')
var parse = mona.parse

describe('delay()', function () {
  it('delays calling a parser constructor until parse-time', function () {
    var parser = mona.delay(function () {
      throw new Error('Parser explosion')
    })
    assert.throws(function () { parse(parser, '') })
  })
  it('returns a parser with the arguments applied', function () {
    var parser = mona.delay(mona.value, 'foo')
    assert.equal(parse(parser, ''), 'foo')
  })
})
