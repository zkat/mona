/* global describe, it */
var assert = require('assert')
var mona = require('../../../')
var parse = mona.parse

describe('unless()', function () {
  it('returns the last result if the first parser fails', function () {
    assert.equal(parse(mona.unless(mona.fail('fail'),
    mona.value('success')),
    ''),
    'success')
    assert.throws(function () {
      parse(mona.unless(mona.value('success'), mona.value('fail')), '')
    }, /expected parser to fail/)
  })
})
