/* global describe, it */
var assert = require('assert')
var mona = require('../../../')
var parse = mona.parse

describe('skip()', function () {
  it('skips input until parser stops matching', function () {
    var parser = mona.and(mona.skip(mona.string('a')), mona.token())
    assert.equal(parse(parser, 'aaaaaaaaaaab'), 'b')
  })
})
