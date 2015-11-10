/* global describe, it */
var assert = require('assert')
var mona = require('../../../')
var parse = mona.parse

describe('bind()', function () {
  it('calls a function with the result of a parser', function () {
    parse(mona.bind(mona.value('test'), function (val) {
      assert.equal(val, 'test')
      return mona.value(val)
    }), '')
  })
  it('uses a parser returned by its fun as the next parser', function () {
    assert.equal(parse(mona.bind(mona.value('foo'), function (val) {
      return mona.value(val + 'bar')
    }), ''), 'foobar')
  })
  it('does not call the function if the parser fails', function () {
    assert.throws(function () {
      parse(mona.bind(mona.fail(), function () {
        throw new Error('This can\'t be happening...')
      }), '')
    }, /parser error/)
  })
  it('throws an error if a parser returns the wrong thing', function () {
    assert.throws(function () {
      parse(mona.bind(function () { return 'nope' }), '')
    }, /Parsers must return a parser state object/)
  })
  it('access to a userState from function context', function () {
    assert.equal(parse(mona.bind(mona.value('foo'), function (val) {
      return mona.value(val + this.suffix)
    }), '', { userState: { suffix: 'bar' } }), 'foobar')
  })
})
