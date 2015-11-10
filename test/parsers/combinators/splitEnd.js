/* global describe, it */
var assert = require('assert')
var mona = require('../../../')
var parse = mona.parse

describe('splitEnd()', function () {
  it('collects matches separated and ended by a parser', function () {
    assert.deepEqual(
      parse(mona.splitEnd(mona.token(), mona.string('.')), 'a.b.c.d.'),
      ['a', 'b', 'c', 'd'])
    assert.throws(function () {
      parse(mona.splitEnd(mona.token(), mona.string('.')), 'a.b.c.d')
    }, /expected end of input/)
  })
  it('accepts a flag to make the ender optional', function () {
    assert.deepEqual(
      parse(mona.splitEnd(mona.token(), mona.string('.'),
      {enforceEnd: false}),
      'a.b.c.d'),
      ['a', 'b', 'c', 'd'])
    assert.deepEqual(
      parse(mona.splitEnd(mona.token(), mona.string('.'),
      {enforceEnd: false}),
      'a.b.c.d.'),
      ['a', 'b', 'c', 'd'])
  })
  it('accepts a min count', function () {
    var parser = mona.splitEnd(mona.token(), mona.string('.'), {min: 3})
    assert.deepEqual(parse(parser, 'a.b.c.'), ['a', 'b', 'c'])
    assert.throws(function () {
      parse(parser, 'a.b.')
    }, /unexpected eof/)

    parser = mona.splitEnd(mona.token(), mona.string('.'),
    {min: 3, enforceEnd: false})
    assert.deepEqual(parse(parser, 'a.b.c.'), ['a', 'b', 'c'])
    assert.deepEqual(parse(parser, 'a.b.c'), ['a', 'b', 'c'])
  })
  it('accepts a max count', function () {
    var parser = mona.splitEnd(mona.token(), mona.string('.'), {max: 3})
    assert.deepEqual(parse(mona.and(parser, mona.string('d.')), 'a.b.c.d.'),
    'd.')

    parser = mona.splitEnd(mona.token(), mona.string('.'),
    {max: 3, enforceEnd: false})
    assert.deepEqual(parse(mona.and(parser, mona.string('d.')), 'a.b.c.d.'),
    'd.')
    assert.deepEqual(parse(mona.and(parser, mona.string('d.')), 'a.b.cd.'),
    'd.')
  })
})
