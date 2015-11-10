/* global describe, it */
var assert = require('assert')
var mona = require('../../../')
var parse = mona.parse

describe('and()', function () {
  it('returns the last result if all previous ones succeed', function () {
    assert.equal(parse(mona.and(mona.token(), mona.token()), 'ab'), 'b')
    assert.equal(parse(mona.and(mona.token()), 'a'), 'a')
    assert.throws(function () {
      parse(mona.and(), 'ab')
    }, /requires at least one parser/)
  })
})
