/* global describe, it */
var assert = require('assert')
var mona = require('../../../')
var parse = mona.parse

describe('split()', function () {
  it('returns an array of values separated by a separator', function () {
    assert.deepEqual(
      parse(mona.split(mona.token(), mona.string('.')), 'a.b.c.d'),
      ['a', 'b', 'c', 'd'])
  })
  it('returns an empty array if it fails', function () {
    assert.deepEqual(parse(mona.split(mona.string('a'), mona.string('.')),
    ''),
    [])
  })
  it('accepts a min count', function () {
    var parser = mona.split(mona.token(), mona.string('.'), {min: 3})
    assert.deepEqual(parse(parser, 'a.b.c'), ['a', 'b', 'c'])
    assert.throws(function () {
      parse(parser, 'a.b')
    }, /\(line 1, column 4\) expected string matching {.}/)
  })
  it('accepts a max count', function () {
    var parser = mona.split(mona.token(), mona.string('.'), {max: 3})
    assert.deepEqual(parse(mona.and(parser, mona.string('.d')), 'a.b.c.d'),
    '.d')
  })
})
