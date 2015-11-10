/* global describe, it */
var assert = require('assert')
var mona = require('../../../')
var parse = mona.parse

describe('space()', function () {
  it('consumes a single whitespace character from input', function () {
    assert.equal(parse(mona.space(), ' '), ' ')
    assert.equal(parse(mona.space(), '\n'), '\n')
    assert.equal(parse(mona.space(), '\t'), '\t')
    assert.equal(parse(mona.space(), '\r'), '\r')
    assert.throws(function () {
      parse(mona.space(), '')
    }, /expected space/)
    assert.throws(function () {
      parse(mona.space(), 'hi')
    }, /expected space/)
  })
})
