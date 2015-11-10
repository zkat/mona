/* global describe, it */
var assert = require('assert')
var mona = require('../../../')
var parse = mona.parse

describe('token()', function () {
  it('consumes one character from the input and returns it', function () {
    assert.equal(parse(mona.token(), 'a'), 'a')
    assert.equal(parse(mona.and(mona.token(), mona.token()), 'ab'), 'b')
  })
  it('optionally accepts a count of items to consume', function () {
    assert.equal(parse(mona.token(5), 'abcde'), 'abcde')
  })
  it('fails if there is no more input', function () {
    assert.throws(function () {
      parse(mona.token(), '')
    }, /(line 1, column 1)/)
    assert.throws(function () {
      parse(mona.and(mona.token(), mona.token()), 'a')
    }, /(line 1, column 2)/)
    assert.throws(function () {
      parse(mona.and(mona.token(5)), 'abcd')
    }, /(line 1, column 5)/)
  })
  it('reports the error as "unexpected eof" if it fails', function () {
    assert.throws(function () {
      parse(mona.token(), '')
    }, /unexpected eof/)
  })
  it('reports the error type as "eof"', function () {
    assert.throws(function () {
      parse(mona.token(), '')
    }, function (err) {
      return err.type === 'eof'
    })
  })
})
