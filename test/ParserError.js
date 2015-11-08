/* global describe, it */
var assert = require('assert')
var mona = require('..')

describe('ParserError', function () {
  it('reports the line in which an error happened', function () {
    assert.throws(function () {
      mona.parse(mona.token(), '')
    }, /line 1/)
    assert.throws(function () {
      mona.parse(mona.and(mona.token(), mona.token()), '\n')
    }, /line 2/)
  })
  it('reports the column in which an error happened', function () {
    assert.throws(function () {
      mona.parse(mona.fail(), '')
    }, /(line 1, column 0)/)
    assert.throws(function () {
      mona.parse(mona.and(mona.token(),
      mona.token(),
      mona.fail()),
      'aaa')
    }, /(line 1, column 2)/)
    var parser = mona.and(mona.token(), mona.token(), mona.token(),
    mona.token(), mona.fail())
    assert.throws(function () {
      mona.parse(parser, '\na\nbcde')
    }, /(line 3, column 1)/)
  })
})
