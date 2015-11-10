/* global describe, it */
var assert = require('assert')
var mona = require('../../../')
var parse = mona.parse

describe('value()', function () {
  it('parses to the given value', function () {
    assert.equal(parse(mona.value('foo'), ''), 'foo')
  })
  it('does not consume input', function () {
    assert.equal(
      parse(
        mona.followedBy(mona.value('foo'), mona.token()),
        'a'),
    'foo')
  })
})
