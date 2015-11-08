import {SourcePosition, ParserState, invokeParser} from './internals'
import {eof} from './core'
import {followedBy} from './combinators'
/**
 * Executes a parser and returns the result.
 *
 * @param {Function} parser - The parser to execute.
 * @param {String} string - String to parse.
 * @param {Object} [opts] - Options object.
 * @param {Boolean} [opts.throwOnError=true] - If truthy, throws a ParserError
 *                                             if the parser fails and returns
 *                                             ParserState instead of its value.
 * @param {String} [opts.fileName] - filename to use for error messages.
 * @memberof module:mona/api
 * @instance
 *
 * @example
 * parse(token(), 'a') // => 'a'
 */
export function parse (parser, string, opts = {}) {
  opts.throwOnError = (typeof opts.throwOnError === 'undefined'
                       ? true : opts.throwOnError)
  if (!opts.allowTrailing) {
    parser = followedBy(parser, eof())
  }
  let parserState = invokeParser(
    parser,
    new ParserState(undefined,
                    string,
                    0,
                    opts.userState,
                    opts.position || new SourcePosition(opts.fileName),
                    false))
  if (parserState.failed && opts.throwOnError) {
    throw parserState.error
  } else if (parserState.failed && !opts.throwOnError) {
    return parserState.error
  } else if (!parserState.failed && !opts.throwOnError) {
    return parserState
  } else if (opts.returnState) {
    return parserState
  } else {
    return parserState.value
  }
}
