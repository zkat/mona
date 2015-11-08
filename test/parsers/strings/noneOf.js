/* global describe, it */
var assert = require('assert')
var mona = require('../../../')
var parse = mona.parse

describe('noneOf()', function () {
  it('succeeds if the next token is not in the char bag', function () {
    assert.equal(parse(mona.noneOf('abc'), 'd'), 'd')
    assert.throws(function () {
      parse(mona.noneOf('abc'), 'b')
    }, /expected none of {a,b,c}/)
  })
  it('accepts an array of strings as matches', function () {
    assert.equal(parse(mona.noneOf(['foo', 'bar']), 'x'), 'x')
    assert.throws(function () {
      parse(mona.noneOf(['foo', 'bar']), 'foo')
    }, /expected none of {foo,bar}/)
  })
  it('accepts a parser that will run if matches fail', function () {
    assert.equal(parse(mona.noneOf('abc', true, mona.integer()), '25'),
    25)
    assert.throws(function () {
      parse(mona.noneOf('abc', true, mona.integer()), 'a')
    }, /expected none of {a,b,c}/)
  })
  it('optionally does a case-insensitive match', function () {
    assert.equal(parse(mona.noneOf('abc', true), 'B'), 'B')
    assert.throws(function () {
      parse(mona.noneOf('abc', false), 'B')
    }, /expected none of {a,b,c}/)
  })
})
