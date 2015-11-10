/* global describe, it */
var assert = require('assert')
var mona = require('../../../')
var parse = mona.parse

describe('alphaLower()', function () {
  it('parses one lowercase alphabetical character', function () {
    var alphabet = 'abcdefghijklmnopqrstuvwxyz'
    for (var i = 0; i < alphabet.length; i++) {
      assert.equal(parse(mona.alphaLower(), alphabet.charAt(i)),
      alphabet.charAt(i))
      assert.throws(function () {
        parse(mona.alphaLower(), alphabet.charAt(i).toUpperCase())
      }, /expected lowercase alphabetical character/)
    }
    assert.throws(function () {
      parse(mona.alphaLower(), '0')
    }, /expected lowercase alphabetical character/)
  })
})
