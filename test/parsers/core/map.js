/* global describe, it */
var assert = require('assert')
var mona = require('../../../')
var parse = mona.parse

describe('map()', function () {
  it('transforms a parser\'s result', function () {
    assert.equal(parse(mona.map(function (txt) {
      return txt.toUpperCase()
    }, mona.text()), 'abc'), 'ABC')
  })
  it('does not call function if the parser fails', function () {
    var parser = mona.map(function (x) { throw x }, mona.token())
    assert.throws(function () {
      parse(parser, '')
    }, /unexpected eof/)
  })
  it('access to a userState from function context', function () {
    function toUpper (text) {
      return text.toUpperCase()
    }
    assert.equal(parse(mona.map(function (txt) {
      return this.convert(txt)
    }, mona.text()), 'abc', { userState: { convert: toUpper } }), 'ABC')
  })
})
