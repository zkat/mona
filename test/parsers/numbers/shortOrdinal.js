/* global describe, it */
var assert = require('assert')
var mona = require('../../../')
var parse = mona.parse

describe('shortOrdinal()', function () {
  it('parses an integer with an ordinal suffix', function () {
    assert.equal(parse(mona.shortOrdinal(), '1st'), 1)
    assert.equal(parse(mona.shortOrdinal(), '2nd'), 2)
    assert.equal(parse(mona.shortOrdinal(), '3rd'), 3)
    assert.equal(parse(mona.shortOrdinal(), '2d'), 2)
    assert.equal(parse(mona.shortOrdinal(), '3d'), 3)
    assert.equal(parse(mona.shortOrdinal(), '4th'), 4)
  })
  it('allows control over suffix strictness', function () {
    assert.equal(parse(mona.shortOrdinal(false), '1nd'), 1)
    assert.throws(function () {
      parse(mona.shortOrdinal(true), '1nd')
    })
  })
})
