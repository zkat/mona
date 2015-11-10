/* global describe, it */
var assert = require('assert')
var mona = require('..')

describe('mona.parse()', function () {
  it('executes a parser on some input and returns the result', function () {
    var result = {}
    assert.equal(mona.parse(mona.value(result), ''), result)
  })
  it('returns an error object on fail if throwOnError is falsy', function () {
    var result = mona.parse(mona.fail('nop'), '', {throwOnError: false})
    assert.equal(result.messages.length, 1)
    assert.equal(result.messages[0], 'nop')
  })
  it('returns ParserState on success if throwOnError is falsy', function () {
    var result = mona.parse(mona.token(), 'a', {throwOnError: false})
    assert.equal(result.value, 'a')
  })
  it('throws a ParserError if throwOnError is truthy', function () {
    assert.throws(function () {
      mona.parse(mona.fail('nop'), '', {throwOnError: true})
    }, /nop/)
  })
  it('defaults to throwing a ParserError if it fails', function () {
    assert.throws(function () {
      mona.parse(mona.fail('nop'), '')
    })
  })
  it('reports a nice error if parser argument isn\'t a function', function () {
    assert.throws(function () {
      mona.parse(undefined, 'parsemeplease')
    }, /Parser needs to be a function, but got undefined instead/)
  })
})
