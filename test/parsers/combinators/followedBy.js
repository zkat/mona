/* global describe, it */
var assert = require('assert')
var mona = require('../../../')
var parse = mona.parse

describe('followedBy()', function () {
  it('returns the first result if the others also succeed', function () {
    var parserSuccess = mona.followedBy(mona.value('pass'),
    mona.value('yay'))
    assert.equal(parse(parserSuccess, ''), 'pass')
    var parserFail = mona.followedBy(mona.value('pass'),
    mona.fail('nope'))
    assert.equal(parse(mona.or(parserFail, mona.value('fail')), ''),
    'fail')
  })
})
