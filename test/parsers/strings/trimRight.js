/* global describe, it */
var assert = require('assert')
var mona = require('../../../')
var parse = mona.parse

describe('trimRight()', function () {
  it('trims trailing whitespace only', function () {
    var parser = mona.between(mona.string('|'),
                              mona.string('|'),
                              mona.trimRight(mona.string('a')))
    assert.equal(parse(parser, '|a     |'), 'a')
    assert.throws(function () {
      parse(parser, '|   a    |')
    }, /\(line 1, column 2\) expected string matching \{\a\}/)
  })
})
