/* global describe, it */
var assert = require('assert')
var mona = require('../../../')
var parse = mona.parse

describe('or()', function () {
  it('returns the result of the first parser that succeeds', function () {
    assert.equal(parse(mona.or(mona.value('foo'), mona.value('bar')), ''),
    'foo')
    assert.equal(parse(mona.or(mona.fail('nope'), mona.value('yup')), ''),
    'yup')
  })
  it('reports all the accumulated errors', function () {
    var parser = mona.or(mona.fail('foo'),
    mona.fail('bar'),
    mona.fail('baz'),
    mona.fail('quux'))
    assert.throws(function () {
      parse(parser, '')
    }, /\(line 1, column 0\) foo\nbar\nbaz\nquux/)
  })
  it('accumulates labeled errors without clobbering', function () {
    var parser = mona.or(mona.label(mona.fail(), 'foo'),
    mona.label(mona.fail(), 'bar'),
    mona.label(mona.fail(), 'baz'))
    assert.throws(function () {
      parse(parser, '')
    }, /\(line 1, column 0\) expected foo\nexpected bar\nexpected baz/)
  })
  it('accumulates errors with the greatest identical position', function () {
    var parser = mona.or(mona.fail('foo'),
    mona.string('ad'),
    mona.string('abc'),
    mona.string('abcd'))
    assert.throws(function () {
      parse(parser, 'abd')
    }, /column 3\) [^\{]+{abc}\n[^\{]+{abcd}/)
  })
  it('labels the parser if the last argument is a string', function () {
    var parser = mona.or(mona.fail('foo'),
    mona.fail('bar'),
    mona.fail('baz'),
    mona.fail('quux'),
    'one of many things')
    assert.throws(function () {
      parse(parser, '')
    }, /\(line 1, column 0\) expected one of many things/)
  })
})
