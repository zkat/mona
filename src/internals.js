/*
 * Internals
 */
export function copy (obj) {
  let newObj = Object.create(Object.getPrototypeOf(obj))
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      newObj[key] = obj[key]
    }
  }
  return newObj
}

export function invokeParser (parser, parserState) {
  if (typeof parser !== 'function') {
    throw new Error('Parser needs to be a function, but got ' +
                    parser + ' instead')
  }
  if (!(parserState instanceof ParserState)) {
    throw new Error('Expected parserState to be a ParserState')
  }
  var newParserState = parser(parserState)
  if (!(newParserState instanceof ParserState)) {
    throw new Error('Parsers must return a parser state object')
  }
  return newParserState
}

export function mergeErrors (err1, err2) {
  if (!err1 || (!err1.messages.length && err2.messages.length)) {
    return err2
  } else if (!err2 || (!err2.messages.length && err1.messages.length)) {
    return err1
  } else {
    switch (comparePositions(err1.position, err2.position)) {
      case 'gt':
        return err1
      case 'lt':
        return err2
      case 'eq':
        var newMessages =
          (err1.messages.concat(err2.messages)).reduce((acc, x) => {
            return (~acc.indexOf(x)) ? acc : acc.concat([x])
          }, [])
        return new ParserError(err2.position,
                               newMessages,
                               err2.type,
                               err2.wasEof || err1.wasEof)
      default:
        throw new Error('This should never happen')
    }
  }
}

function comparePositions (pos1, pos2) {
  if (pos1.line < pos2.line) {
    return 'lt'
  } else if (pos1.line > pos2.line) {
    return 'gt'
  } else if (pos1.column < pos2.column) {
    return 'lt'
  } else if (pos1.column > pos2.column) {
    return 'gt'
  } else {
    return 'eq'
  }
}

export function ParserState (value, input, offset, userState,
                     position, hasConsumed, error, failed) {
  this.value = value
  this.input = input
  this.offset = offset
  this.position = position
  this.userState = userState
  this.failed = failed
  this.error = error
}

/**
 * Represents a source location.
 * @typedef {Object} SourcePosition
 * @property {String} name - Optional sourcefile name.
 * @property {Integer} line - Line number, starting from 1.
 * @property {Integer} column - Column number in the line, starting from 1.
 * @memberof module:mona/api
 * @instance
 */
export function SourcePosition (name, line, column) {
  this.name = name
  this.line = line || 1
  this.column = column || 0
}

/**
 * Information about a parsing failure.
 * @typedef {Object} ParserError
 * @property {api.SourcePosition} position - Source position for the error.
 * @property {Array} messages - Array containing relevant error messages.
 * @property {String} type - The type of parsing error.
 * @memberof module:mona/api
 */
export function ParserError (pos, messages, type, wasEof) {
  if (Error.captureStackTrace) {
    // For pretty-printing errors on node.
    Error.captureStackTrace(this, this)
  }
  this.position = pos
  this.messages = messages
  this.type = type
  this.wasEof = wasEof
  this.message = ('(line ' + this.position.line +
                  ', column ' + this.position.column + ') ' +
                  this.messages.join('\n'))
}
ParserError.prototype = new Error()
ParserError.prototype.constructor = ParserError
ParserError.prototype.name = 'ParserError'
