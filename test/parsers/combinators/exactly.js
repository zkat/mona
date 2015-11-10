/* global describe, it */
var assert = require('assert')
var mona = require('../../../')
var parse = mona.parse

describe('exactly()', function () {
  it('collects exactly n matches', function () {
    var parser = mona.followedBy(mona.exactly(mona.token(), 3),
    mona.collect(mona.token()))
    assert.deepEqual(parse(parser, 'aaaaaaa'), ['a', 'a', 'a'])
    assert.throws(function () {
      parse(parser, 'aa')
    }, /unexpected eof/)
  })
})
