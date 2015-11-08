/* global describe, it */
var assert = require('assert')
var mona = require('../../../')
var parse = mona.parse

describe('alphaUpper()', function () {
  it('parses one uppercase alphabetical character', function () {
    var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    for (var i = 0; i < alphabet.length; i++) {
      assert.equal(parse(mona.alphaUpper(), alphabet.charAt(i)),
      alphabet.charAt(i))
      assert.throws(function () {
        parse(mona.alphaUpper(), alphabet.charAt(i).toLowerCase())
      }, /expected uppercase alphabetical character/)
    }
    assert.throws(function () {
      parse(mona.alphaUpper(), '0')
    }, /expected uppercase alphabetical character/)
  })
})
