/* global describe, it */
var assert = require('assert')
var mona = require('../../../')
var parse = mona.parse

describe('integer()', function () {
  it('matches a positive or negative possibly-signed integer', function () {
    assert.equal(parse(mona.integer(), '1234'), 1234)
    assert.equal(parse(mona.integer(), '+1234'), 1234)
    assert.equal(parse(mona.integer(), '-1234'), -1234)
  })
  it('accepts a base/radix argument', function () {
    assert.equal(parse(mona.integer(2), '101110'), parseInt('101110', 2))
    assert.equal(parse(mona.integer(16), 'deadbeef'), 0xdeadbeef)
    assert.equal(parse(mona.integer(16), '-deadbeef'), -0xdeadbeef)
  })
})
