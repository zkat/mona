/* global describe, it */
var assert = require('assert')
var mona = require('../../../')
var parse = mona.parse

describe('join()', function () {
  it('returns the results as an array if all parsers succeed', function () {
    assert.deepEqual(parse(mona.join(mona.alpha(), mona.integer()), 'a1'),
    ['a', 1])
    assert.deepEqual(parse(mona.join(mona.token()), 'a'), ['a'])
    assert.throws(function () {
      parse(mona.and(), 'ab')
    }, /requires at least one parser/)
  })
})
