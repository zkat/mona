/* global describe, it */
var assert = require('assert')
var mona = require('../../../')
var parse = mona.parse

describe('text()', function () {
  it('collects one or more parser results into a string', function () {
    assert.equal(parse(mona.text(mona.string('a')), 'aaaab',
    {allowTrailing: true}),
    'aaaa')
  })
  it('defaults to token()', function () {
    assert.equal(parse(mona.text(), 'abcde'), 'abcde')
  })
  it('accepts a minimum and maximum option', function () {
    assert.equal(parse(mona.text(mona.token(), {min: 3}),
    'aaaa'),
    'aaaa')
    assert.throws(function () {
      parse(mona.text(mona.token(), {min: 3}), 'aa')
    }, /unexpected eof/)
    assert.equal(parse(mona.followedBy(
      mona.text(mona.token(), {max: 3}), mona.token()),
      'aaaa'),
    'aaa')
  })
})
