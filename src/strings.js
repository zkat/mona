import {
  bind,
  fail,
  is,
  label,
  token,
  value
} from './core'
import {
  and,
  between,
  collect,
  followedBy,
  maybe,
  not,
  or,
  range,
  sequence,
  skip
} from './combinators'
/**
 * String-related parsers and combinators.
 *
 * @module mona/strings
 */

/**
 * Returns a string containing the concatenated results returned by applying
 * `parser`. `parser` must be a combinator that returns an array of string parse
 * results.
 *
 * @param {Parser} parser - Parser that results in an array of strings.
 * @memberof module:mona/strings
 * @instance
 *
 * @example
 * parse(stringOf(collect(token())), 'aaa') // => 'aaa'
 */
export function stringOf (parser) {
  return bind(parser, xs =>
    (xs.hasOwnProperty('length') && xs.join)
    ? value(xs.join(''))
    : fail())
}

/**
 * Returns a parser that succeeds if the next token or string matches one of the
 * given inputs.
 *
 * @param {String|Array} matches - Characters or strings to match. If this
 *                                 argument is a string, it will be treated as
 *                                 if matches.split('') were passed in.
 * @param {Boolean} [caseSensitive=true] - Whether to match char case exactly.
 * @memberof module:mona/strings
 * @instance
 *
 * @example
 * parse(oneOf('abcd'), 'c') // => 'c'
 * parse(oneOf(['foo', 'bar', 'baz']), 'bar') // => 'bar'
 */
export function oneOf (matches, caseSensitive = true) {
  const splitMatches = typeof matches === 'string'
    ? matches.split('')
    : matches
  const matchParsers = splitMatches.map(m => string(m, caseSensitive))
  return or(...matchParsers, `one of {${splitMatches}}`)
}

/**
 * Returns a parser that fails if the next token or string matches one of the
 * given inputs. If the third `parser` argument is given, that parser will be
 * used to collect the actual value of `noneOf`.
 *
 * @param {String|Array} matches - Characters or strings to match. If this
 *                                 argument is a string, it will be treated as
 *                                 if matches.split('') were passed in.
 * @param {Boolean} [caseSensitive=true] - Whether to match char case exactly.
 * @param {Parser} [parser=token()] - What to actually parse if none of the
 *                                    given matches succeed.
 * @memberof module:mona/strings
 * @instance
 *
 * @example
 * parse(noneOf('abc'), 'd') // => 'd'
 * parse(noneOf(['foo', 'bar', 'baz']), 'frob') // => 'f'
 * parse(noneOf(['foo', 'bar', 'baz'], true, text()), 'frob') // => 'frob'
 */
export function noneOf (matches, caseSensitive = true, parser = token()) {
  const splitMatches = typeof matches === 'string'
    ? matches.split('')
    : matches
  const matchParsers = splitMatches.map(m => string(m, caseSensitive))
  const noneOfParser = and(not(or(...matchParsers)),
                           parser)
  return label(noneOfParser, `none of {${splitMatches}}`)
}

/**
 * Returns a parser that succeeds if `str` matches the next `str.length` inputs,
 * consuming the string and returning it as a value.
 *
 * @param {String} str - String to match against.
 * @param {Boolean} [caseSensitive=true] - Whether to match char case exactly.
 * @memberof module:mona/strings
 * @instance
 *
 * @example
 * parse(string('foo'), 'foo') // => 'foo'
 */
export function string (matchStr, caseSensitive = true) {
  const str = caseSensitive ? matchStr : matchStr.toLowerCase()
  return label(sequence(function (s) {
    let x = s(is(x => {
      x = caseSensitive ? x : x.toLowerCase()
      return x === str.charAt(0)
    }))
    const xs = str.length > 1
      ? s(string(str.slice(1), caseSensitive))
      : ''
    return value(x + xs)
  }), `string matching {${matchStr}}`)
}

/**
 * Returns a parser that matches a single non-unicode uppercase alphabetical
 * character.
 *
 * @memberof module:mona/strings
 * @instance
 *
 * @example
 * parse(alphaUpper(), 'D') // => 'D'
 */
export function alphaUpper () {
  return label(range('A', 'Z'), 'uppercase alphabetical character')
}

/**
 * Returns a parser that matches a single non-unicode lowercase alphabetical
 * character.
 *
 * @memberof module:mona/strings
 * @instance
 *
 * @example
 * parse(alphaLower(), 'd') // => 'd'
 */
export function alphaLower () {
  return label(range('a', 'z'), 'lowercase alphabetical character')
}

/**
 * Returns a parser that matches a single non-unicode alphabetical character.
 *
 * @memberof module:mona/strings
 * @instance
 *
 * @example
 * parse(alpha(), 'a') // => 'a'
 * parse(alpha(), 'A') // => 'A'
 */
export function alpha () {
  return or(alphaLower(), alphaUpper(), 'alphabetical character')
}

/**
 * Returns a parser that parses a single digit character token from the input.
 *
 * @param {Integer} [base=10] - Optional base for the digit.
 * @memberof module:mona/strings
 * @instance
 *
 * @example
 * parse(digit(), '5') // => '5'
 */
export function digit (base = 10) {
  return label(is(x => !isNaN(parseInt(x, base))), 'digit')
}

/**
 * Returns a parser that matches an alphanumeric character.
 *
 * @param {Integer} [base=10] - Optional base for numeric parsing.
 * @memberof module:mona/strings
 * @instance
 *
 * @example
 * parse(alphanum(), '1') // => '1'
 * parse(alphanum(), 'a') // => 'a'
 * parse(alphanum(), 'A') // => 'A'
 */
export function alphanum (base) {
  return label(or(alpha(), digit(base)), 'alphanum')
}

/**
 * Returns a parser that matches one whitespace character.
 *
 * @memberof module:mona/strings
 * @instance
 *
 * @example
 * parse(space(), '\r') // => '\r'
 */
export function space () {
  return label(oneOf(' \t\n\r'), 'space')
}

/**
 * Returns a parser that matches one or more whitespace characters. Returns a
 * single space character as its result, regardless of which whitespace
 * characters were matched.
 *
 * @memberof module:mona/strings
 * @instance
 *
 * @example
 * parse(spaces(), '   \r\n\t \r \n') // => ' '
 */
export function spaces () {
  return label(and(space(), skip(space()), value(' ')), 'spaces')
}

/**
 * Returns a parser that collects between `min` and `max` tokens matching
 * `parser`. The result is returned as a single string. This parser is
 * essentially collect() for strings.
 *
 * @param {Parser} [parser=token()] - Parser to use to collect the results.
 * @param {Object} [opts]
 * @param {Integer} [opts.min=0] - Minimum number of matches.
 * @param {Integer} [opts.max=Infinity] - Maximum number of matches.
 * @memberof module:mona/strings
 * @instance
 *
 * @example
 * parse(text(), 'abcde') // => 'abcde'
 * parse(text(noneOf('a')), 'bcde') // => 'bcde'
 */
export function text (parser = token(), opts = {}) {
  return stringOf(collect(parser, opts))
}

/**
 * Returns a parser that trims any whitespace surrounding `parser`.
 *
 * @param {Parser} parser - Parser to match after cleaning up whitespace.
 * @memberof module:mona/strings
 * @instance
 *
 * @example
 * parse(trim(token()), '    \r\n  a   \t') // => 'a'
 */
export function trim (parser) {
  return between(maybe(spaces()),
                 maybe(spaces()),
                 parser)
}

/**
 * Returns a parser that trims any leading whitespace before `parser`.
 *
 * @param {Parser} parser - Parser to match after cleaning up whitespace.
 * @memberof module:mona/strings
 * @instance
 *
 * @example
 * parse(trimLeft(token()), '    \r\n  a') // => 'a'
 */
export function trimLeft (parser) {
  return and(maybe(spaces()), parser)
}

/**
 * Returns a parser that trims any trailing whitespace before `parser`.
 *
 * @param {Parser} parser - Parser to match after cleaning up whitespace.
 * @memberof module:mona/strings
 * @instance
 *
 * @example
 * parse(trimRight(token()), 'a   \r\n') // => 'a'
 */
export function trimRight (parser) {
  return followedBy(parser, maybe(spaces()))
}
