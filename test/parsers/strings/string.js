/* global describe, it */
var assert = require('assert')
var mona = require('../../../')
var parse = mona.parse

describe('string()', function () {
  it('succeeds if the string matches a string in the input', function () {
    assert.equal(parse(mona.string('foo'), 'foo'), 'foo')
    assert.throws(function () {
      parse(mona.and(mona.string('foo'), mona.string('baz')), 'foobarbaz')
    }, /expected string matching {baz}/)
  })
  it('optionally does a case-insensitive match', function () {
    assert.equal(parse(mona.string('abc', false), 'AbC'), 'AbC')
    assert.throws(function () {
      parse(mona.string('abc', true), 'AbC')
    }, /expected string matching {abc}/)
  })
  it('defaults to being case-sensitive', function () {
    assert.throws(function () {
      parse(mona.string('abc'), 'AbC')
    }, /expected string matching {abc}/)
  })
  it('reports the location of the first bad character', function () {
    assert.throws(function () {
      parse(mona.string('aaaaaaa'), 'aaabaaaa')
    }, /(line 1, column 4)/)
  })
})
