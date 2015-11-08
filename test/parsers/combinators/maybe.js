/* global describe, it */
var assert = require('assert')
var mona = require('../../../')
var parse = mona.parse

describe('maybe()', function () {
  it('returns the result of the parser, if it succeeds', function () {
    assert.equal(parse(mona.maybe(mona.value('foo')), ''), 'foo')
  })
  it('returns undefined without consuming if the parser fails', function () {
    assert.equal(parse(mona.maybe(mona.fail('nope')), ''), undefined)
    assert.equal(parse(mona.and(mona.maybe(mona.fail('nope')),
    mona.token()),
    'a'),
    'a')
  })
})
