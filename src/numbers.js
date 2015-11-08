import {
  fail,
  is,
  map,
  value
} from './core'
import {
  and,
  followedBy,
  maybe,
  or,
  sequence
} from './combinators'
import {
  digit,
  oneOf,
  spaces,
  string,
  text
} from './strings'

/**
 * Number-related parsers and combinators
 *
 * @module mona/numbers
 */

/**
 * Returns a parser that matches a natural number. That is, a number without a
 * positive/negative sign or decimal places, and returns a positive integer.
 *
 * @param {Integer} [base=10] - Base to use when parsing the number.
 * @memberof module:mona/numbers
 * @instance
 *
 * @example
 * parse(natural(), '1234') // => 1234
 */
export function natural (base = 10) {
  return map(str => parseInt(str, base),
             text(digit(base), {min: 1}))
}

export function sign () {
  return or(and(string('+'), value(1)),
            and(string('-'), value(-1)))
}

/**
 * Returns a parser that matches an integer, with an optional + or - sign.
 *
 * @param {Integer} [base=10] - Base to use when parsing the integer.
 * @memberof module:mona/numbers
 * @instance
 *
 * @example
 * parse(integer(), '-1234') // => -1234
 */
export function integer (base = 10) {
  return sequence(s => {
    const sig = s(or(sign(), value(1)))
    const num = s(natural(base))
    return value(num * sig)
  })
}

/**
 * Returns a parser that will parse floating point numbers.
 *
 * @memberof module:mona/numbers
 * @instance
 *
 * @example
 * parse(real(), '-1234e-10') // => -1.234e-7
 */
export const float = real
export function real () {
  return sequence(s => {
    const sig = s(or(sign(), value(1)))
    let leftSide = s(or(natural(), value(null)))
    const hasDecimal = s(maybe(string('.')))
    const zeros = hasDecimal ? s(text(string('0'))).length : 0
    let rightSide = s(or(natural(), value(null)))
    if (leftSide === null && rightSide === null) {
      return fail()
    }
    leftSide = leftSide || 0
    rightSide = rightSide || 0
    while (rightSide >= 1) {
      rightSide = rightSide / 10
    }
    for (var i = 0; i < zeros; i++) {
      rightSide = rightSide / 10
    }
    rightSide = leftSide >= 0 ? rightSide : (rightSide * -1)
    const e = s(or(and(string('e', false),
                       integer()),
                   value(0)))
    return value(sig * (leftSide + rightSide) * (Math.pow(10, e)))
  })
}

/**
 * Returns a parser that will parse english cardinal numbers into their
 * numerical counterparts.
 *
 * @memberof module:mona/numbers
 * @instance
 *
 * @example
 * parse(cardinal(), 'two thousand') // => 2000
 */
export function cardinal () {
  return or(numeralUpToVeryBig(), 'cardinal')
}

/**
 * Returns a parser that will parse english ordinal numbers into their numerical
 * counterparts.
 *
 * @memberof module:mona/numbers
 * @instance
 *
 * @example
 * parse(ordinal(), 'one-hundred thousand and fifth') // 100005
 */
export function ordinal () {
  return or(numeralUpToVeryBig(true), 'ordinal')
}

/**
 * Returns a parser that will parse shorthand english ordinal numbers into their
 * numerical counterparts.
 *
 * @param {Boolean} [strict=true] - Whether to accept only appropriate suffixes
 *                                  for each number. (if false, `2th` parses to
 *                                  `2`)
 * @memberof module:mona/numbers
 * @instance
 *
 * @example
 * parse(shortOrdinal(), '5th') // 5
 */
export function shortOrdinal (strict = true) {
  if (strict) {
    return sequence(s => {
      const num = s(natural())
      switch (('' + num).substr(-1)) {
        case '1':
          s(string('st'))
          break
        case '2':
          s(oneOf(['nd', 'd']))
          break
        case '3':
          s(oneOf(['rd', 'd']))
          break
        default:
          s(string('th'))
          break
      }
      return value(num)
    })
  } else {
    return followedBy(integer(), oneOf(['th', 'st', 'nd', 'rd']))
  }
}

/*
 * English numbers support
 */
function numeralUpToVeryBig (ordinalMode) {
  return or(sequence(s => {
    const numOfBigs = s(numeralUpToThreeNines())
    s(numeralSeparator())
    const bigUnit = s(oneOf(CARDINALS['evenBigger sorted'], false))
    const bigUnitIndex = CARDINALS.evenBigger.indexOf(bigUnit.toLowerCase())
    const bigUnitMultiplier = Math.pow(10, (bigUnitIndex + 1) * 3)
    let lesserUnit = s(is(
      x => x < bigUnitMultiplier,
      or(and(or(and(string(','), spaces()),
                numeralSeparator()),
             numeralUpToVeryBig(ordinalMode)),
         and(numeralSeparator(),
             string('and'),
             numeralSeparator(),
             numeralUpToThreeNines(ordinalMode)),
         value(null))))
    if (lesserUnit === null && ordinalMode) {
      s(string('th'))
      lesserUnit = 0
    }
    return value((numOfBigs * bigUnitMultiplier) + lesserUnit)
  }), numeralUpToThreeNines(ordinalMode))
}

function numeralUpToThreeNines (ordinalMode) {
  return or(numeralHundreds(numeralUpToNinetyNine(ordinalMode),
                            1,
                            ordinalMode),
            numeralUpToNinetyNine(ordinalMode))
}

function numeralSeparator () {
  return or(spaces(), string('-'))
}

function numeralHundreds (nextParser, multiplier, ordinalMode) {
  return sequence(s => {
    const numOfHundreds = s(numeralOneThroughNine())
    s(numeralSeparator())
    s(string('hundred'))
    let smallNum = s(or(
      and(numeralSeparator(),
          (multiplier > 1
           ? value()
           : maybe(and(string('and'), numeralSeparator()))),
          nextParser),
      value(null)))
    if (smallNum === null && ordinalMode) {
      s(string('th'))
      smallNum = 0
    }
    return value(((numOfHundreds * 100) + smallNum) * multiplier)
  })
}

function numeralUpToNinetyNine (ordinalMode) {
  return or(sequence(s => {
    const ten = s(oneOf(CARDINALS['tens sorted'], false))
    const tenIndex = CARDINALS.tens.indexOf(ten.toLowerCase())
    const small = s(or(and(numeralSeparator(),
                           numeralOneThroughNine(ordinalMode)),
                       value(0)))
    return value(((tenIndex + 2) * 10) + small)
  }), !ordinalMode ? fail() : sequence(s => {
    const ten = s(oneOf(ORDINALS['tens sorted'], false))
    const tenIndex = ORDINALS.tens.indexOf(ten.toLowerCase())
    return value((tenIndex + 2) * 10)
  }), numeralUpToNineteen(ordinalMode))
}

function numeralOneThroughNine (ordinalMode) {
  const source = ordinalMode ? ORDINALS : CARDINALS
  return map(x => source['1-9'].indexOf(x.toLowerCase()) + 1,
             oneOf(source['1-9 sorted'], false))
}

function numeralUpToNineteen (ordinalMode) {
  const source = ordinalMode ? ORDINALS : CARDINALS
  return map(x => source['0-19'].indexOf(x.toLowerCase()),
             oneOf(source['0-19 sorted'], false))
}

var CARDINALS = {
  '1-9': ['one', 'two', 'three', 'four', 'five', 'six',
          'seven', 'eight', 'nine'],
  '0-19': ['zero', 'one', 'two', 'three', 'four', 'five', 'six',
           'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
           'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen',
           'eighteen', 'nineteen'],
  tens: ['twenty', 'thirty', 'forty', 'fifty', 'sixty',
         'seventy', 'eighty', 'ninety'],
  evenBigger: ['thousand', 'million', 'billion', 'trillion',
               'quadrillion', 'quintillion', 'sextillion', 'septillion',
               'octillion', 'nonillion', 'decillion', 'undecillion',
               'duodecillion', 'tredecillion'] // At this point, wikipedia ran
                                               // out of numbers until the
                                               // googol and googelplex
}

var ORDINALS = {
  '1-9': ['first', 'second', 'third', 'fourth', 'fifth', 'sixth',
          'seventh', 'eighth', 'ninth'],
  '0-19': ['zeroeth', 'first', 'second', 'third', 'fourth', 'fifth',
           'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh',
           'twelfth', 'thirteenth', 'fourteenth', 'fifteenth',
           'sixteenth', 'seventeenth', 'eighteenth', 'nineteenth'],
  tens: ['twentieth', 'thirtieth', 'fortieth', 'fiftieth',
         'sixtieth', 'seventieth', 'eightieth', 'ninetieth']
}

// We need a sorted version because we need the longest strings to show up
// first.
function _sortByLength (a, b) {
  return b.length - a.length
}
for (var group in CARDINALS) {
  if (CARDINALS.hasOwnProperty(group)) {
    CARDINALS[group + ' sorted'] = CARDINALS[group].slice()
    CARDINALS[group + ' sorted'].sort(_sortByLength)
  }
}
for (group in ORDINALS) {
  if (ORDINALS.hasOwnProperty(group)) {
    ORDINALS[group + ' sorted'] = ORDINALS[group].slice()
    ORDINALS[group + ' sorted'].sort(_sortByLength)
  }
}
