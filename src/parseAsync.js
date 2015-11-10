import {parse} from './parse'
import {copy} from './internals'
import {collect} from './combinators'

/**
 * Executes a parser asynchronously, returning an object that can be used to
 * manage the parser state. Unless the parser given tries to match eof(),
 * parsing will continue until the parser's done() function is called.
 *
 * @param {Function} parser - The parser to execute.
 * @param {AsyncParserCallback} callback - node-style 2-arg callback executed
 *                                         once per successful application of
 *                                         `parser`.
 * @param {Object} [opts] - Options object.
 * @param {String} [opts.fileName] - filename to use for error messages.
 * @memberof module:mona/api
 * @instance
 *
 * @example
 * var handle = parseAsync(token(), function(tok) {
 *  console.log('Got a token: ', tok)
 * })
 * handle.data('foobarbaz')
 */
export function parseAsync (parser, callback, opts = {}) {
  opts = copy(opts)
  // Force the matter in case someone gets clever.
  opts.throwOnError = true
  opts.returnState = true
  opts.allowTrailing = true
  let done = false
  let buffer = ''
  function exec () {
    if (done && !buffer.length) {
      return false
    }
    let res
    try {
      res = parse(collect(parser, {min: 1}), buffer, opts)
      opts.position = res.position
      buffer = res.input.slice(res.offset)
    } catch (e) {
      if (!e.wasEof || done) {
        callback(e)
      }
      return false
    }
    res.value.forEach(val => callback(null, val))
    return true
  }
  function errIfDone (cb) {
    return (...args) => {
      if (done) {
        throw new Error('AsyncParser closed')
      } else {
        return cb(...args)
      }
    }
  }
  const handle = {
    done: errIfDone(() => {
      done = true
      buffer = ''
      while (exec()) {}
      return handle
    }),
    data: errIfDone(data => {
      buffer += data
      while (exec()) {}
      return handle
    }),
    error: errIfDone(error => {
      done = true
      callback(error)
      return handle
    })
  }
  return handle
}
