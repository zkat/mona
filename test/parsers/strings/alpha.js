/* global describe, it */
var assert = require('assert')
var mona = require('../../../')
var parse = mona.parse

describe('alpha()', function () {
  it('parses one alphabetical character', function () {
    var alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
    for (var i = 0; i < alphabet.length; i++) {
      assert.equal(parse(mona.alpha(), alphabet.charAt(i)),
      alphabet.charAt(i))
    }
    assert.throws(function () {
      parse(mona.alpha(), '0')
    }, /expected alphabetical character/)
  })
})
