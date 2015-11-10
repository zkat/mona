import {
  copy,
  invokeParser,
  mergeErrors,
  ParserState
} from './internals'

import {
  bind,
  fail,
  label,
  token,
  value
} from './core'

/**
 * Parser combinators for higher-order interaction between parsers.
 *
 * @module mona/combinators
 */

/**
 * Returns a parser that succeeds if all the parsers given to it succeed. The
 * returned parser uses the value of the last successful parser.
 *
 * @param {...Parser} parsers - One or more parsers to execute.
 * @memberof module:mona/combinators
 * @instance
 *
 * @example
 * parse(and(token(), token()), 'ab') // => 'b'
 */
export function and (firstParser) {
  if (!firstParser) {
    throw new Error('and() requires at least one parser')
  }
  return andHelper(arguments)
}

function andHelper (parsers) {
  return parserState => {
    var res = parserState
    for (let parser of parsers) {
      res = invokeParser(parser, res)
      if (res.failed) {
        break
      }
    }
    return res
  }
}

/**
 * Returns a parser that succeeds if one of the parsers given to it
 * suceeds. Uses the value of the first successful parser.
 *
 * @param {...Parser} parsers - One or more parsers to execute.
 * @param {String} [label] - Label to replace the full message with.
 * @memberof module:mona/combinators
 * @instance
 *
 * @example
 * parse(or(string('foo'), string('bar')), 'bar') // => 'bar'
 */
export function or (...parsers) {
  const labelMsg =
    typeof parsers[parsers.length - 1] === 'string' && parsers.pop()
  const parser = orHelper(parsers)
  return labelMsg
    ? label(parser, labelMsg)
    : parser
}

function orHelper (parsers) {
  return parserState => {
    let errors = []
    let res
    for (let parser of parsers) {
      res = invokeParser(parser, parserState)
      if (res.failed) {
        errors.push(res.error)
      } else {
        return res
      }
    }
    var finalState = copy(res)
    finalState.error = errors.reduce(mergeErrors)
    return finalState
  }
}

/**
 * Returns a parser that returns the result of `parser` if it succeeds,
 * otherwise succeeds with a value of `undefined` without consuming input.
 *
 * @param {Parser} parser - Parser to try.
 * @memberof module:mona/combinators
 * @instance
 *
 * @example
 * parse(maybe(token()), '') // => undefined
 */
export function maybe (parser) {
  return or(parser, value())
}

/**
 * Returns a parser that succeeds if `parser` fails. Does not consume.
 *
 * @param {Parser} parser - parser to test.
 * @memberof module:mona/combinators
 * @instance
 *
 * @example
 * parse(and(not(string('a')), token()), 'b') // => 'b'
 */
export function not (parser) {
  return parserState =>
    invokeParser(parser, parserState).failed
    ? invokeParser(value(true), parserState)
    : invokeParser(fail('expected parser to fail', 'expectation'), parserState)
}

/**
 * Returns a parser that works like `and`, but fails if the first parser given
 * to it succeeds. Like `and`, it returns the value of the last successful
 * parser.
 *
 * @param {Parser} notParser - If this parser succeeds, `unless` will fail.
 * @param {...Parser} moreParsers - Rest of the parses to test.
 * @memberof module:mona/combinators
 * @instance
 *
 * @example
 * parse(unless(string('a'), token()), 'b') // => 'b'
 */
export function unless (parser, ...moreParsers) {
  return and(not(parser), ...moreParsers)
}

/**
 * Returns a parser that will execute `fun` while handling the parserState
 * internally, allowing the body of `fun` to be written sequentially. The
 * purpose of this parser is to simulate `do` notation and prevent the need for
 * heavily-nested `bind` calls.
 *
 * The `fun` callback will receive a function `s` which should be called with
 * each parser that will be executed, which will update the internal
 * parserState. The return value of the callback must be a parser.
 *
 * If any of the parsers fail, sequence will exit immediately, and the entire
 * sequence will fail with that parser's reason.
 *
 * @param {SequenceFn} fun - A sequence callback function to execute.
 * @memberof module:mona/combinators
 * @instance
 *
 * @example
 * mona.sequence(function(s) {
 *  var x = s(mona.token())
 *  var y = s(mona.string('b'))
 *  return mona.value(x+y)
 * })
 */
export function sequence (fun) {
  return parserState => {
    let state = parserState
    const failwhale = {}
    function s (parser) {
      state = invokeParser(parser, state)
      if (state.failed) {
        throw failwhale
      } else {
        return state.value
      }
    }
    try {
      const ret = fun(s)
      if (typeof ret !== 'function') {
        throw new Error('sequence function must return a parser')
      }
      const newState = ret(state)
      if (!(newState instanceof ParserState)) {
        throw new Error('sequence function must return a parser')
      }
      return newState
    } catch (x) {
      if (x === failwhale) {
        return state
      } else {
        throw x
      }
    }
  }
}

/**
 * Returns a parser that succeeds if all the parsers given to it succeed. The
 * returned parser uses the values of the all joined parsers.
 *
 * @param {...Parser} parsers - One or more parsers to execute.
 * @memberof module:mona/combinators
 * @instance
 *
 * @example
 * parse(join(alpha(), integer()), 'a1') // => ['a', 1]
 */
export function join (...parsers) {
  if (!parsers.length) {
    throw new Error('join() requires at least one parser')
  }
  return joinHelper(parsers)
}

function joinHelper (parsers) {
  return parserState => {
    let s = parserState
    let res = []
    for (let parser of parsers) {
      s = invokeParser(parser, s)
      if (s.failed) {
        return s
      } else {
        res.push(s.value)
      }
    }
    return value(res)(s)
  }
}

/**
 * Called by `sequence` to handle sequential syntax for parsing. Called with an
 * `s()` function that must be called each time a parser should be applied. The
 * `s()` function will return the unwrapped value returned by the parser. If any
 * of the `s()` calls fail, this callback will exit with an appropriate failure
 * message, and none of the subsequent code will execute.
 *
 * Note that this callback may be called multiple times during parsing, and many
 * of those calls might partially fail, so side-effects should be done with
 * care.
 *
 * A `sequence` callback *must* return a `Parser`.
 *
 * @callback {Function} SequenceFn
 * @param {Function} s - Sequencing function. Must be wrapped around a parser.
 * @returns {Parser} parser - The final parser to apply before resolving
 *                                 `sequence`.
 * @memberof module:mona/combinators
 */

/**
 * Returns a parser that returns the result of its first parser if it succeeds,
 * but fails if any of the following parsers fail.
 *
 * @param {Parser} parser - The value of this parser is returned if it
 *                               succeeds.
 * @param {...Parser} moreParsers - These parsers must succeed in order for
 *                                       `followedBy` to succeed.
 * @memberof module:mona/combinators
 * @instance
 *
 * @example
 * parse(followedBy(string('a'), string('b')), 'ab') // => 'a'
 */
export function followedBy (parser, ...moreParsers) {
  return bind(parser, result =>
    bind(and(...moreParsers), () => value(result)))
}

/**
 * Returns a parser that returns an array of results that have been successfully
 * parsed by `parser`, which were separated by `separator`.
 *
 * @param {Parser} parser - Parser for matching and collecting results.
 * @param {Parser} separator - Parser for the separator
 * @param {Object} [opts]
 * @param {Integer} [opts.min=0] - Minimum length of the resulting array.
 * @param {Integer} [opts.max=0] - Maximum length of the resulting array.
 * @memberof module:mona/combinators
 * @instance
 *
 * @example
 * parse(split(token(), space()), 'a b c d') // => ['a','b','c','d']
 */
export function split (parser, separator, opts = {}) {
  if (!opts.min) {
    return or(split(parser, separator, {min: 1, max: opts.max}),
              value([]))
  } else {
    let newOpts = copy(opts)
    newOpts.min = opts.min && opts.min - 1
    newOpts.max = opts.max && opts.max - 1
    return sequence(s => {
      const x = s(parser)
      const xs = s(collect(and(separator, parser), newOpts))
      return value([x].concat(xs))
    })
  }
}

/**
 * Returns a parser that returns an array of results that have been successfully
 * parsed by `parser`, separated and ended by `separator`.
 *
 * @param {Parser} parser - Parser for matching and collecting results.
 * @param {Parser} separator - Parser for the separator
 * @param {Object} [opts]
 * @param {Integer} [opts.enforceEnd=true] - If true, `separator` must be at the
 *                                           end of the parse.
 * @param {Integer} [opts.min=0] - Minimum length of the resulting array.
 * @param {Integer} [opts.max=Infinity] - Maximum length of the resulting array.
 * @memberof module:mona/combinators
 * @instance
 *
 * @example
 * parse(splitEnd(token(), space()), 'a b c ') // => ['a', 'b', 'c']
 */
export function splitEnd (parser, separator, opts = {}) {
  if (typeof opts.enforceEnd === 'undefined'
      ? true
      : opts.enforceEnd) {
    return collect(followedBy(parser, separator), opts)
  } else {
    // TODO - This is bloody terrible and should die a horrible, painful death,
    //        but at least the tests seem to pass. :\
    return sequence(s => {
      const min = opts.min || 0
      const max = opts.max || Infinity
      const results = s(splitEnd(parser, separator, {
        min: opts.min && min - 1,
        max: opts.max && max - 1
      }))
      let last
      if (opts.min > results.length || opts.max) {
        last = s(followedBy(parser, maybe(separator)))
        return value(results.concat([last]))
      } else {
        last = s(maybe(parser))
        if (last) {
          return value(results.concat([last]))
        } else {
          return value(results)
        }
      }
    })
  }
}

/**
 * Returns a parser that results in an array of `min` to `max` matches of
 * `parser`
 *
 * @param {Parser} parser - Parser to match.
 * @param {Object} [opts]
 * @param {Integer} [opts.min=0] - Minimum number of matches.
 * @param {Integer} [opts.max=Infinity] - Maximum number of matches.
 * @memberof module:mona/combinators
 * @instance
 *
 * @example
 * parse(collect(token()), 'abcd') // => ['a', 'b', 'c', 'd']
 */
export function collect (parser, opts = {}) {
  const min = opts.min || 0
  const max = typeof opts.max === 'undefined' ? Infinity : opts.max
  if (min > max) {
    throw new Error('min must be less than or equal to max')
  }
  return parserState => {
    var prev = parserState
    var s = invokeParser(parser, parserState)
    var res = []
    for (var i = 0;
         i < max && !s.failed;
         prev = s, i++, s = invokeParser(parser, s)) {
      res.push(s.value)
    }
    if (min && (res.length < min)) {
      return s
    } else {
      return value(res)(prev)
    }
  }
}

/**
 * Returns a parser that results in an array of exactly `n` results for
 * `parser`.
 *
 * @param {Parser} parser - The parser to collect results for.
 * @param {Integer} n - exact number of results to collect.
 * @memberof module:mona/combinators
 * @instance
 *
 * @example
 * parse(exactly(token(), 4), 'abcd') // => ['a', 'b', 'c', 'd']
 */
export function exactly (parser, n) {
  return collect(parser, {min: n, max: n})
}

/**
 * Returns a parser that results in a value between an opening and closing
 * parser.
 *
 * @param {Parser} open - Opening parser.
 * @param {Parser} close - Closing parser.
 * @param {Parser} parser - Parser to return the value of.
 * @memberof module:mona/combinators
 * @instance
 *
 * @example
 * parse(between(string('('), string(')'), token()), '(a)') // => 'a'
 */
export function between (open, close, parser) {
  return and(open, followedBy(parser, close))
}

/**
 * Returns a parser that skips input until `parser` stops matching.
 *
 * @param {Parser} parser - Determines whether to continue skipping.
 * @memberof module:mona/combinators
 * @instance
 *
 * @example
 * parse(and(skip(string('a')), token()), 'aaaab') // => 'b'
 */
export function skip (parser) {
  return and(collect(parser), value())
}

/**
 * Returns a parser that accepts a parser if its result is within range of
 * `start` and `end`.
 *
 * @param {*} start - lower bound of the range to accept.
 * @param {*} end - higher bound of the range to accept.
 * @param {Parser} [parser=token()] - parser whose results to test
 * @param {Function} [predicate=function(x,y){return x<=y }] - Tests range
 * @memberof module:mona/combinators
 * @instance
 *
 * @example
 * parse(range('a', 'z'), 'd') // => 'd'
 */
export function range (start, end, parser = token(), predicate = (x, y) => x <= y) {
  return label(bind(parser, result =>
    (predicate(start, result) && predicate(result, end))
    ? value(result)
    : fail()),
  `value between {${start}} and {${end}}`)
}
