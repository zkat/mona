/* global describe, it */
var assert = require('assert')
var mona = require('../../../')
var parse = mona.parse

describe('eof()', function () {
  it('succeeds with true if we\'re out of input', function () {
    assert.equal(parse(mona.eof(), ''), true)
  })
  it('fails with useful message if there is still input left', function () {
    assert.throws(function () {
      parse(mona.eof(), 'a')
    }, /expected end of input/)
  })
})
