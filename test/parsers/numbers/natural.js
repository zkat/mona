/* global describe, it */
var assert = require('assert')
var mona = require('../../../')
var parse = mona.parse

describe('natural()', function () {
  it('matches a natural number without a sign', function () {
    assert.equal(parse(mona.natural(), '1234'), 1234)
    assert.throws(function () {
      parse(mona.natural(), '-123')
    }, /expected digit/)
  })
  it('accepts a base/radix argument', function () {
    assert.equal(parse(mona.natural(2), '101110'),
    parseInt('101110', 2))
    assert.equal(parse(mona.natural(16), 'deadbeef'),
    0xdeadbeef)
  })
})
