/* global describe, it */
var assert = require('assert')
var mona = require('../../../')
var parse = mona.parse

describe('collect()', function () {
  it('collects zero or more matches by default', function () {
    var parser = mona.collect(mona.token())
    assert.deepEqual(parse(parser, 'abc'), ['a', 'b', 'c'])
  })
  it('succeeds even if no matches are found', function () {
    var parser = mona.collect(mona.token())
    assert.deepEqual(parse(parser, ''), [])
  })
  it('accepts a minimum count', function () {
    var parser = mona.collect(mona.token(), {min: 1})
    assert.deepEqual(parse(parser, 'a'), ['a'])
    assert.throws(function () {
      parse(parser, '')
    }, /unexpected eof/)
  })
  it('accepts a maximum count', function () {
    var parser = mona.followedBy(
      mona.collect(mona.token(), {min: 1, max: 4}),
      mona.collect(mona.token()))
      assert.deepEqual(parse(parser, 'aaaaa'), ['a', 'a', 'a', 'a'])
  })
})
