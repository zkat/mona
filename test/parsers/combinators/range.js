/* global describe, it */
var assert = require('assert')
var mona = require('../../../')
var parse = mona.parse

describe('range()', function () {
  it('succeeds if a parser\'s value is within range', function () {
    var parser = mona.range('a', 'z')
    assert.equal(parse(parser, 'm'), 'm')
  })
  it('accepts a parser as a third argument', function () {
    assert.equal(parse(mona.range('a', 'aaa', mona.text()), 'aa'), 'aa')
    assert.equal(parse(mona.range(10, 15, mona.integer()), '12'), 12)
  })
  it('fails if the predicate fails', function () {
    assert.throws(function () {
      parse(mona.range('a', 'c'), 'd')
    }, /value between \{a\} and \{c\}/)
    assert.throws(function () {
      parse(mona.range(1, 4, mona.integer()), '5')
    }, /value between \{1\} and \{4\}/)
  })
})
