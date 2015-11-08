/* global describe, it */
var assert = require('assert')
var mona = require('../../../')
var parse = mona.parse

describe('wrap()', function () {
  it('wraps a parser\'s output with a tagging object', function () {
    assert.deepEqual(parse(mona.tag(mona.text(), 'txt'), 'foo'),
    {txt: 'foo'})
  })
})
