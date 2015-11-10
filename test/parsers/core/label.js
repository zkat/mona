/* global describe, it */
var assert = require('assert')
var mona = require('../../../')
var parse = mona.parse

describe('label()', function () {
  it('replaces any error messages with an expectation', function () {
    assert.throws(function () {
      parse(mona.label(mona.fail(), 'wee'), '')
    }, /\(line 1, column 0\) expected wee/)
  })
})
