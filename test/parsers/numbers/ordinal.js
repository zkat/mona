/* global describe, it */
var assert = require('assert')
var mona = require('../../../')
var parse = mona.parse

describe('ordinal()', function () {
  it('parses numbers from "zeroeth" through "nineteenth"', function () {
    var nums = ['zeroeth', 'first', 'second', 'third', 'fourth', 'fifth',
    'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh',
    'twelfth', 'thirteenth', 'fourteenth', 'fifteenth',
    'sixteenth', 'seventeenth', 'eighteenth', 'nineteenth']
    nums.forEach(function (num, i) {
      assert.equal(parse(mona.ordinal(), num), i)
    })
  })
  it('parses numbers from "twentieth" through "ninety-ninth"', function () {
    var small = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth',
    'seventh', 'eighth', 'ninth']
    var tens = ['twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy',
    'eighty', 'ninety']
    var ordinalTens = ['twentieth', 'thirtieth', 'fortieth', 'fiftieth',
    'sixtieth', 'seventieth', 'eightieth', 'ninetieth']
    tens.forEach(function (ten, i) {
      var tenNum = (i + 2) * 10
      assert.equal(parse(mona.ordinal(), ordinalTens[i]), tenNum)
      small.forEach(function (small, i) {
        assert.equal(parse(mona.ordinal(), ten + '-' + small),
        tenNum + i + 1)
        assert.equal(parse(mona.ordinal(), ten + ' ' + small),
        tenNum + i + 1)
      })
    })
  })
  it('"one-hundredth" through "nine-hundred ninety-ninth"', function () {
    assert.equal(parse(mona.ordinal(), 'one-hundredth'), 100)
    assert.equal(parse(mona.ordinal(), 'one-hundred and fifth'), 105)
    assert.equal(parse(mona.ordinal(), 'nine-hundred ninety-ninth'), 999)
  })
  it('parses one-billionth', function () {
    assert.equal(parse(mona.ordinal(), 'one billionth'), 1000000000)
  })
  it('parses a ridiculous number', function () {
    assert.equal(parse(mona.ordinal(),
    'forty-eight trillion, ' +
    'twenty-five billion, ' +
    'one-hundred and forty-five million, ' +
    'seven-hundred eighty-six thousand, ' +
    'five-hundred and ninety-fifth'),
    48025145786595)
  })
})
