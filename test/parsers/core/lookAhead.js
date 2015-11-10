/* global describe, it */
var assert = require('assert')
var mona = require('../../../')
var parse = mona.parse

describe('lookAhead()', function () {
  it('returns a parser\'s value without consuming input', function () {
    assert.equal(parse(mona.followedBy(mona.lookAhead(mona.token()),
    mona.token()),
    'a'),
    'a')
  })
  it('passes on a failure', function () {
    assert.throws(function () {
      parse(mona.lookAhead(mona.fail()), 'a', {allowTrailing: true})
    })
  })
  it('rejects input without consuming input', function () {
    assert.equal(parse(mona.or(mona.lookAhead(mona.oneOf('a')),
    mona.token()),
    'b'),
    'b')
  })
})
