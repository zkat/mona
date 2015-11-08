/* global describe, it */
var assert = require('assert')
var mona = require('../../../')
var parse = mona.parse

describe('not()', function () {
  it('returns true if the given parser fails', function () {
    assert.equal(parse(mona.not(mona.token()), ''), true)
  })
  it('fails if the given parser succeeds', function () {
    assert.throws(function () {
      parse(mona.not(mona.value('foo')), '')
    }, /expected parser to fail/)
  })
})
