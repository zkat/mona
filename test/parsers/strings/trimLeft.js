/* global describe, it */
var assert = require('assert')
var mona = require('../../../')
var parse = mona.parse

describe('trimLeft()', function () {
  it('trims leading whitespace only', function () {
    var parser = mona.between(mona.string('|'),
    mona.string('|'),
    mona.trimLeft(mona.string('a')))
    assert.equal(parse(parser, '|   a|'), 'a')
    assert.throws(function () {
      parse(parser, '|   a    |')
    }, /expected string matching \{\|\}/)
  })
})
