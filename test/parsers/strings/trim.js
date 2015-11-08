/* global describe, it */
var assert = require('assert')
var mona = require('../../../')
var parse = mona.parse

describe('trim()', function () {
  it('trims leading and trailing whitespace', function () {
    assert.equal(parse(mona.trim(mona.token()), '   a    '), 'a')
    assert.equal(parse(mona.trim(mona.token()), 'a    '), 'a')
    assert.equal(parse(mona.trim(mona.token()), '   a'), 'a')
  })
})
