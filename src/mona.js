"use strict";

/**
 * This module exports the entire interface through a single object. Refer to
 * the documentation for each individual submodule for more specific docs.
 *
 * @module mona
 */

/**
 * Parser execution api
 * @module mona/api
 */

var VERSION = "0.8.1";

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
 * parse(token(), "a"); // => "a"
 */
function parse(parser, string, opts) {
  opts = opts || {};
  opts.throwOnError = typeof opts.throwOnError === "undefined" ?
    true : opts.throwOnError;
  if (!opts.allowTrailing) {
    parser = followedBy(parser, eof());
  }
  var parserState = invokeParser(
    parser,
    new ParserState(undefined,
                    string,
                    0,
                    opts.userState,
                    opts.position || new SourcePosition(opts.fileName),
                    false));
  if (parserState.failed && opts.throwOnError) {
    throw parserState.error;
  } else if (parserState.failed && !opts.throwOnError) {
    return parserState.error;
  } else if (!parserState.failed && !opts.throwOnError) {
    return parserState;
  } else if (opts.returnState) {
    return parserState;
  } else {
    return parserState.value;
  }
}

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
 *  console.log("Got a token: ", tok);
 * });
 * handle.data("foobarbaz");
 */
function parseAsync(parser, callback, opts) {
  opts = copy(opts || {});
  // Force the matter in case someone gets clever.
  opts.throwOnError = true;
  opts.returnState = true;
  opts.allowTrailing = true;
  var done = false,
      buffer = "";
  function exec() {
    if (done && !buffer.length) {
      return false;
    }
    var res;
    try {
      res = parse(collect(parser, {min: 1}), buffer, opts);
      opts.position = res.position;
      buffer = res.input.slice(res.offset);
    } catch (e) {
      if (!e.wasEof || done) {
        callback(e);
      }
      return false;
    }
    res.value.forEach(function(val) {
      callback(null, val);
    });
    return true;
  }
  function errIfDone(cb) {
    return function() {
      if (done) {
        throw new Error("AsyncParser closed");
      } else {
        return cb.apply(null, arguments);
      }
    };
  }
  var handle = {
    done: errIfDone(function() {
      done = true;
      buffer = "";
      while(exec()){}
      return handle;
    }),
    data: errIfDone(function(data) {
      buffer += data;
      while(exec()){}
      return handle;
    }),
    error: errIfDone(function(error) {
      done = true;
      callback(error);
      return handle;
    })
  };
  return handle;
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
function SourcePosition(name, line, column) {
  this.name = name;
  this.line = line || 1;
  this.column = column || 0;
}

/**
 * Information about a parsing failure.
 * @typedef {Object} ParserError
 * @property {api.SourcePosition} position - Source position for the error.
 * @property {Array} messages - Array containing relevant error messages.
 * @property {String} type - The type of parsing error.
 * @memberof module:mona/api
 */
function ParserError(pos, messages, type, wasEof) {
  if (Error.captureStackTrace) {
    // For pretty-printing errors on node.
    Error.captureStackTrace(this, this);
  }
  this.position = pos;
  this.messages = messages;
  this.type = type;
  this.wasEof = wasEof;
  this.message = ("(line "+ this.position.line +
                  ", column "+this.position.column+") "+
                  this.messages.join("\n"));
}
ParserError.prototype = new Error();
ParserError.prototype.constructor = ParserError;
ParserError.prototype.name = "ParserError";


/**
 * Core parsers
 *
 * @module mona/core
 */

/**
 * A function accepting parserState as input that transforms it and returns a
 * new parserState.
 * @callback {Function} Parser
 * @param {ParserState} state - Current parser state.
 * @returns {ParserState} state' - Transformed parser state.
 * @memberof module:mona/core
 */

/**
 * Returns a parser that always succeeds without consuming input.
 *
 * @param [val=undefined] - value to use as this parser's value.
 * @memberof module:mona/core
 * @instance
 *
 * @example
 * parse(value("foo"), ""); // => "foo"
 */
function value(val) {
  return function(parserState) {
    var newState = copy(parserState);
    newState.value = val;
    return newState;
  };
}

/**
 * Returns a parser that calls `fun` on the value resulting from running
 * `parser` on the current parsing state. Fails without executing `fun` if
 * `parser` fails.
 *
 * @param {Parser} parser - The parser to execute.
 * @param {Function} fun - Function called with the resulting value of
 *                         `parser`. Must return a parser.
 * @memberof module:mona/core
 * @instance
 *
 * @example
 * parse(bind(token(), function(x) { return value(x+"!"); }), "a"); // => "a!"
 */
function bind(parser, fun) {
  return function(parserState) {
    var newParserState = invokeParser(parser, parserState);
    if (newParserState.failed) {
      return newParserState;
    } else {
      return fun(newParserState.value)(newParserState);
    }
  };
}

/**
 * Returns a parser that always fails without consuming input. Automatically
 * includes the line and column positions in the final ParserError.
 *
 * @param {String} msg - Message to report with the failure.
 * @param {String} type - A type to apply to the ParserError.
 * @memberof module:mona/core
 * @instance
 */
function fail(msg, type) {
  msg = msg || "parser error";
  type = type || "failure";
  return function(parserState) {
    parserState = copy(parserState);
    parserState.failed = true;
    var newError = new ParserError(parserState.position, [msg],
                                   type, type === "eof");
    parserState.error = mergeErrors(parserState.error, newError);
    return parserState;
  };
}

/**
 * Returns a parser that will label a `parser` failure by replacing its error
 * messages with `msg`.
 *
 * @param {Parser} parser - Parser whose errors to replace.
 * @param {String} msg - Error message to replace errors with.
 * @memberof module:mona/core
 * @instance
 *
 * @example
 * parse(token(), ""); // => unexpected eof
 * parse(label(token(), "thing"), ""); // => expected thing
 */
function label(parser, msg) {
  return function(parserState) {
    var newState = invokeParser(parser, parserState);
    if (newState.failed) {
      newState = copy(newState);
      newState.error = new ParserError(newState.error.position,
                                       ["expected "+msg],
                                       "expectation",
                                       newState.error.wasEof);
    }
    return newState;
  };
}

/**
 * Returns a parser that consumes a single item from the input, or fails with an
 * unexpected eof error if there is no input left.
 *
 * @param {Integer} [count=1] - number of tokens to consume. Must be > 0.
 * @memberof module:mona/core
 * @instance
 *
 * @example
 * parse(token(), "a"); // => "a"
 */
function token(count) {
  count = count || 1; // force 0 to 1, as well.
  return function(parserState) {
    var input = parserState.input,
        offset = parserState.offset,
        newOffset = offset + count,
        newParserState = copy(parserState),
        newPosition = copy(parserState.position);
    newParserState.position = newPosition;
    for (var i = offset; i < newOffset && input.length >= i; i++) {
      if (input.charAt(i) === "\n") {
        newPosition.column = 0;
        newPosition.line += 1;
      } else {
        newPosition.column += 1;
      }
    }
    newParserState.offset = newOffset;
    if (input.length >= newOffset) {
      newParserState.value = input.slice(offset, newOffset);
      return newParserState;
    } else {
      return fail("unexpected eof", "eof")(newParserState);
    }
  };
}

/**
 * Returns a parser that succeeds with a value of `true` if there is no more
 * input to consume.
 *
 * @memberof module:mona/core
 * @instance
 *
 * @example
 * parse(eof(), ""); // => true
 */
function eof() {
  return function(parserState) {
    if (parserState.input.length === parserState.offset) {
      return value(true)(parserState);
    } else {
      return fail("expected end of input", "expectation")(parserState);
    }
  };
}

/**
 * Delays calling of a parser constructor function until parse-time. Useful for
 * recursive parsers that would otherwise blow the stack at construction time.
 *
 * @param {Function} constructor - A function that returns a Parser.
 * @param {...*} args - Arguments to apply to the constructor.
 * @memberof module:mona/core
 * @instance
 *
 * @example
 * // The following would usually result in an infinite loop:
 * function foo() {
 *   return or(x(), foo());
 * }
 * // But you can use delay() to remedy this...
 * function foo() {
 *   return or(x(), delay(foo));
 * }
 */
function delay(constructor) {
  var args = [].slice.call(arguments, 1);
  return function(parserState) {
    return constructor.apply(null, args)(parserState);
  };
}

/**
 * Debugger parser that logs the ParserState with a tag.
 *
 * @param {Parser} parser - Parser to wrap.
 * @param {String} tag - Tag to use when logging messages.
 * @param {String} [level="log"] - 'log', 'info', 'debug', 'warn', 'error'.
 * @memberof module:mona/core
 * @instance
 */
function log(parser, tag, level) {
  level = level || "log";
  return function(parserState) {
    var newParserState = invokeParser(parser, parserState);
    console[level](tag+" :: ", parserState, " => ", newParserState);
    return newParserState;
  };
}

/**
 * Returns a parser that transforms the resulting value of a successful
 * application of its given parser. This function is a lot like `bind`, except
 * it always succeeds if its parser succeeds, and is expected to return a
 * transformed value, instead of another parser.
 *
 * @param {Function} transformer - Function called on `parser`'s value. Its
 *                                 return value will be used as the `map`
 *                                 parser's value.
 * @param {Parser} parser - Parser that will yield the input value.
 * @memberof module:mona/core
 * @instance
 *
 * @example
 * parse(map(parseFloat, text()), "1234.5"); // => 1234.5
 */
function map(transformer, parser) {
  return bind(parser, function(result) {
    return value(transformer(result));
  });
}

/**
 * Returns a parser that returns an object with a single key whose value is the
 * result of the given parser.
 *
 * @param {Parser} parser - Parser whose value will be tagged.
 * @param {String} tag - String to use as the object's key.
 * @memberof module:mona/core
 * @instance
 *
 * @example
 * parse(tag(token(), "myToken"), "a"); // => {myToken: "a"}
 */
function tag(parser, key) {
  return map(function(x) { var ret = {}; ret[key] = x; return ret; }, parser);
}

/**
 * Returns a parser that runs a given parser without consuming input, while
 * still returning a success or failure.
 *
 * @param {Parser} test - Parser to execute.
 * @memberof module:mona/core
 * @instance
 *
 * @example
 * parse(and(lookAhead(token()), token()), "a"); // => "a"
 */
function lookAhead(parser) {
  return function(parserState) {
    var ret = invokeParser(parser, parserState),
        newState = copy(parserState);
    newState.value = ret.value;
    return newState;
  };
}

/**
 * Returns a parser that succeeds if `predicate` returns true when called on a
 * parser's result.
 *
 * @param {Function} predicate - Tests a parser's result.
 * @param {Parser} [parser=token()] - Parser to run.
 * @memberof module:mona/core
 * @instance
 *
 * @example
 * parse(is(function(x) { return x === "a"; }), "a"); // => "a"
 */
function is(predicate, parser) {
  return bind(parser || token(), function(x) {
    return predicate(x) ? value(x) : fail();
  });
}

/**
 * Returns a parser that succeeds if `predicate` returns false when called on a
 * parser's result.
 *
 * @param {Function} predicate - Tests a parser's result.
 * @param {Parser} [parser=token()] - Parser to run.
 * @memberof module:mona/core
 * @instance
 *
 * @example
 * parse(isNot(function(x) { return x === "a"; }), "b"); // => "b"
 */
function isNot(predicate, parser) {
  return is(function(x) { return !predicate(x); }, parser);
}

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
 * parse(and(token(), token()), "ab"); // => "b"
 */
function and(firstParser) {
  if (!firstParser) {
    throw new Error("and() requires at least one parser");
  }
  return andHelper(arguments);
}

function andHelper(parsers) {
  return function (parserState) {
    var res = parserState, i;
    for (i = 0; i < parsers.length; i++) {
      res = invokeParser(parsers[i], res);
      if (res.failed) {
        return res;
      }
    }
    return res;
  };
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
 * parse(or(string("foo"), string("bar")), "bar"); // => "bar"
 */
function or() {
  var labelMsg = (typeof arguments[arguments.length-1] === "string" &&
                  arguments[arguments.length-1]),
      args = labelMsg ?
        [].slice.call(arguments, 0, arguments.length-1) : arguments,
      parser = orHelper(args);
  if (labelMsg) {
    return label(parser, labelMsg);
  } else {
    return parser;
  }
}

function orHelper(parsers) {
  return function(parserState) {
    var errors = [], res, i;
    for (i = 0; i < parsers.length; i++) {
      res = invokeParser(parsers[i], parserState);
      if (res.failed) {
        errors.push(res.error);
      } else {
        return res;
      }
    }
    var finalState = copy(res);
    finalState.error = errors.reduce(mergeErrors);
    return finalState;
  };
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
 * parse(maybe(token()), ""); // => undefined
 */
function maybe(parser) {
  return or(parser, value());
}

/**
 * Returns a parser that succeeds if `parser` fails. Does not consume.
 *
 * @param {Parser} parser - parser to test.
 * @memberof module:mona/combinators
 * @instance
 *
 * @example
 * parse(and(not(string("a")), token()), "b"); // => "b"
 */
function not(parser) {
  return function(parserState) {
    return invokeParser(parser, parserState).failed ?
      invokeParser(value(true), parserState) :
      invokeParser(fail("expected parser to fail", "expectation"), parserState);
  };
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
 * parse(unless(string("a"), token()), "b"); // => "b"
 */
function unless(parser) {
  var moreParsers = [].slice.call(arguments, 1);
  return and.apply(null, [not(parser)].concat(moreParsers));
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
 *  var x = s(mona.token());
 *  var y = s(mona.string('b'));
 *  return mona.value(x+y);
 * });
 */
function sequence(fun) {
  return function(parserState) {
    var state = parserState, failwhale = {};
    function s(parser) {
      state = invokeParser(parser, state);
      if (state.failed) {
        throw failwhale;
      } else {
        return state.value;
      }
    }
    try {
      var ret = fun(s);
      if (typeof ret !== "function") {
        throw new Error("sequence function must return a parser");
      }
      var newState = ret(state);
      if (!(newState instanceof ParserState)) {
        throw new Error("sequence function must return a parser");
      }
      return newState;
    } catch(x) {
      if (x === failwhale) {
        return state;
      } else {
        throw x;
      }
    }
  };
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
 * parse(followedBy(string("a"), string("b")), "ab"); // => "a"
 */
function followedBy(parser) {
  var parsers = [].slice.call(arguments, 1);
  return bind(parser, function(result) {
    return bind(and.apply(null, parsers), function() {
      return value(result);
    });
  });
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
 * parse(split(token(), space()), "a b c d"); // => ["a","b","c","d"]
 */
function split(parser, separator, opts) {
  opts = opts || {};
  if (!opts.min) {
    return or(split(parser, separator, {min: 1, max: opts.max}),
              value([]));
  } else {
    opts = copy(opts);
    opts.min = opts.min && opts.min-1;
    opts.max = opts.max && opts.max-1;
    return sequence(function(s) {
      var x = s(parser);
      var xs = s(collect(and(separator, parser), opts));
      var result = [x].concat(xs);
      return value(result);
    });
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
 * parse(splitEnd(token(), space()), "a b c "); // => ["a", "b", "c"]
 */
function splitEnd(parser, separator, opts){
  opts = opts || {};
  var enforceEnd = typeof opts.enforceEnd === "undefined" ?
        true :
        opts.enforceEnd;
  if (enforceEnd) {
    return collect(followedBy(parser, separator), opts);
  } else {
    // TODO - This is bloody terrible and should die a horrible, painful death,
    //        but at least the tests seem to pass. :\
    return sequence(function(s) {
      var min = opts.min || 0,
          max = opts.max || Infinity,
          last;
      var results = s(splitEnd(parser, separator, {min: opts.min && min-1,
                                                   max: opts.max && max-1}));
      if (opts.min > results.length || opts.max) {
        last = s(followedBy(parser, maybe(separator)));
        return value(results.concat([last]));
      } else {
        last = s(maybe(parser));
        if (last) {
          return value(results.concat([last]));
        } else {
          return value(results);
        }
      }
    });
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
 * parse(collect(token()), "abcd"); // => ["a", "b", "c", "d"]
 */
function collect(parser, opts) {
  opts = opts || {};
  var min = opts.min || 0,
      max = typeof opts.max === "undefined" ? Infinity : opts.max;
  if (min > max) { throw new Error("min must be less than or equal to max"); }
  return function(parserState) {
    var prev = parserState,
        s = parserState,
        res = [],
        i = 0;
    while(s = invokeParser(parser, s), i < max && !s.failed) {
      res.push(s.value);
      i++;
      prev = s;
    }
    if (min && (res.length < min)) {
      return s;
    } else {
      return value(res)(prev);
    }
  };
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
 * parse(exactly(token(), 4), "abcd"); // => ["a", "b", "c", "d"]
 */
function exactly(parser, n) {
  return collect(parser, {min: n, max: n});
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
 * parse(between(string("("), string(")"), token()), "(a)"); // => "a"
 */
function between(open, close, parser) {
  return and(open, followedBy(parser, close));
}

/**
 * Returns a parser that skips input until `parser` stops matching.
 *
 * @param {Parser} parser - Determines whether to continue skipping.
 * @memberof module:mona/combinators
 * @instance
 *
 * @example
 * parse(and(skip(string("a")), token()), "aaaab"); // => "b"
 */
function skip(parser) {
  return and(collect(parser), value());
}

/**
 * Returns a parser that accepts a parser if its result is within range of
 * `start` and `end`.
 *
 * @param {*} start - lower bound of the range to accept.
 * @param {*} end - higher bound of the range to accept.
 * @param {Parser} [parser=token()] - parser whose results to test
 * @param {Function} [predicate=function(x,y){return x<=y; }] - Tests range
 * @memberof module:mona/combinators
 * @instance
 *
 * @example
 * parse(range("a", "z"), "d"); // => "d"
 */
function range(start, end, parser, predicate) {
  parser = parser || token();
  predicate = predicate || function(x,y) { return x <= y; };
  return label(bind(parser, function(result) {
    if (predicate(start, result) && predicate(result, end)) {
      return value(result);
    } else {
      return fail();
    }
  }), "value between {"+start+"} and {"+end+"}");
}

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
 * parse(stringOf(collect(token())), "aaa"); // => "aaa"
 */
function stringOf(parser) {
  return bind(parser, function(xs) {
    if (xs.hasOwnProperty("length") &&
        xs.join) {
      return value(xs.join(""));
    } else {
      return fail();
    }
  });
}

/**
 * Returns a parser that succeeds if the next token or string matches one of the
 * given inputs.
 *
 * @param {String|Array} matches - Characters or strings to match. If this
 *                                 argument is a string, it will be treated as
 *                                 if matches.split("") were passed in.
 * @param {Boolean} [caseSensitive=true] - Whether to match char case exactly.
 * @memberof module:mona/strings
 * @instance
 *
 * @example
 * parse(oneOf("abcd"), "c"); // => "c"
 * parse(oneOf(["foo", "bar", "baz"]), "bar"); // => "bar"
 */
function oneOf(_matches, caseSensitive) {
  caseSensitive = typeof caseSensitive === "undefined" ? true : caseSensitive;
  var matches = typeof _matches === "string" ? _matches.split("") : _matches;
  return or.apply(null, matches.map(function(m) {
    return string(m, caseSensitive);
  }).concat(["one of {"+matches+"}"]));
}

/**
 * Returns a parser that fails if the next token or string matches one of the
 * given inputs. If the third `parser` argument is given, that parser will be
 * used to collect the actual value of `noneOf`.
 *
 * @param {String|Array} matches - Characters or strings to match. If this
 *                                 argument is a string, it will be treated as
 *                                 if matches.split("") were passed in.
 * @param {Boolean} [caseSensitive=true] - Whether to match char case exactly.
 * @param {Parser} [parser=token()] - What to actually parse if none of the
 *                                    given matches succeed.
 * @memberof module:mona/strings
 * @instance
 *
 * @example
 * parse(noneOf("abc"), "d"); // => "d"
 * parse(noneOf(["foo", "bar", "baz"]), "frob"); // => "f"
 * parse(noneOf(["foo", "bar", "baz"], true, text()), "frob"); // => "frob"
 */
function noneOf(_matches, caseSensitive, parser) {
  caseSensitive = typeof caseSensitive === "undefined" ? true : caseSensitive;
  var matches = typeof _matches === "string" ? _matches.split("") : _matches;
  return label(and(not(or.apply(null, matches.map(function(m) {
    return string(m, caseSensitive);
  }))), parser || token()), "none of {"+matches+"}");
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
 * parse(string("foo"), "foo"); // => "foo"
 */
function string(str, caseSensitive) {
  caseSensitive = typeof caseSensitive === "undefined" ? true : caseSensitive;
  str = caseSensitive ? str : str.toLowerCase();
  return label(sequence(function(s) {
    var x = s(is(function(x) {
      x = caseSensitive ? x : x.toLowerCase();
      return  x === str.charAt(0);
    }));
    var xs = (str.length > 1)?s(string(str.slice(1), caseSensitive)):"";
    return value(x+xs);
  }), "string matching {"+str+"}");
}

/**
 * Returns a parser that matches a single non-unicode uppercase alphabetical
 * character.
 *
 * @memberof module:mona/strings
 * @instance
 *
 * @example
 * parse(alphaUpper(), "D"); // => "D"
 */
function alphaUpper() {
  return label(range("A", "Z"), "uppercase alphabetical character");
}

/**
 * Returns a parser that matches a single non-unicode lowercase alphabetical
 * character.
 *
 * @memberof module:mona/strings
 * @instance
 *
 * @example
 * parse(alphaLower(), "d"); // => "d"
 */
function alphaLower() {
  return label(range("a", "z"), "lowercase alphabetical character");
}

/**
 * Returns a parser that matches a single non-unicode alphabetical character.
 *
 * @memberof module:mona/strings
 * @instance
 *
 * @example
 * parse(alpha(), "a"); // => "a"
 * parse(alpha(), "A"); // => "A"
 */
function alpha() {
  return or(alphaLower(), alphaUpper(), "alphabetical character");
}

/**
 * Returns a parser that parses a single digit character token from the input.
 *
 * @param {Integer} [base=10] - Optional base for the digit.
 * @memberof module:mona/strings
 * @instance
 *
 * @example
 * parse(digit(), "5"); // => "5"
 */
function digit(base) {
  base = base || 10;
  return label(is(function(x) { return !isNaN(parseInt(x, base)); }),
               "digit");
}

/**
 * Returns a parser that matches an alphanumeric character.
 *
 * @param {Integer} [base=10] - Optional base for numeric parsing.
 * @memberof module:mona/strings
 * @instance
 *
 * @example
 * parse(alphanum(), "1"); // => "1"
 * parse(alphanum(), "a"); // => "a"
 * parse(alphanum(), "A"); // => "A"
 */
function alphanum(base) {
  return label(or(alpha(), digit(base)), "alphanum");
}

/**
 * Returns a parser that matches one whitespace character.
 *
 * @memberof module:mona/strings
 * @instance
 *
 * @example
 * parse(space(), "\r"); // => "\r"
 */
function space() {
  return label(oneOf(" \t\n\r"), "space");
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
 * parse(spaces(), "   \r\n\t \r \n"); // => " "
 */
function spaces() {
  return label(and(space(), skip(space()), value(" ")), "spaces");
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
 * parse(text(), "abcde"); // => "abcde"
 * parse(text(noneOf("a")), "bcde"); // => "bcde"
 */
function text(parser, opts) {
  parser = parser || token();
  opts = opts || {};
  return stringOf(collect(parser, opts));
}

/**
 * Returns a parser that trims any whitespace surrounding `parser`.
 *
 * @param {Parser} parser - Parser to match after cleaning up whitespace.
 * @memberof module:mona/strings
 * @instance
 *
 * @example
 * parse(trim(token()), "    \r\n  a   \t"); // => "a"
 */
function trim(parser) {
  return between(maybe(spaces()),
                 maybe(spaces()),
                 parser);
}

/**
 * Returns a parser that trims any leading whitespace before `parser`.
 *
 * @param {Parser} parser - Parser to match after cleaning up whitespace.
 * @memberof module:mona/strings
 * @instance
 *
 * @example
 * parse(trimLeft(token()), "    \r\n  a"); // => "a"
 */
function trimLeft(parser) {
  return and(maybe(spaces()), parser);
}

/**
 * Returns a parser that trims any trailing whitespace before `parser`.
 *
 * @param {Parser} parser - Parser to match after cleaning up whitespace.
 * @memberof module:mona/strings
 * @instance
 *
 * @example
 * parse(trimRight(token()), "a   \r\n"); // => "a"
 */
function trimRight(parser) {
  return followedBy(parser, maybe(spaces()));
}

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
 * parse(natural(), "1234"); // => 1234
 */
function natural(base) {
  base = base || 10;
  return map(function(str) { return parseInt(str, base); },
             text(digit(base), {min: 1}));
}

/**
 * Returns a parser that matches an integer, with an optional + or - sign.
 *
 * @param {Integer} [base=10] - Base to use when parsing the integer.
 * @memberof module:mona/numbers
 * @instance
 *
 * @example
 * parse(integer(), "-1234"); // => -1234
 */
function integer(base) {
  base = base || 10;
  return sequence(function(s) {
    var sign = s(maybe(or(string("+"),
                          string("-")))),
        num = s(natural(base));
    return value(num * (sign === "-" ? -1 : 1));
  });
}

/**
 * Returns a parser that will parse floating point numbers.
 *
 * @memberof module:mona/numbers
 * @instance
 *
 * @example
 * parse(real(), "-1234e-10"); // => -1.234e-7
 */
function real() {
  return sequence(function (s) {
    var sign = s(or(string("+"), string("-"), value("")));
    var leftSide = s(text(digit(), {min: 1}));
    var rightSide = s(or(and(string("."),
      map(function (str) { return "." + str; },
        text(digit(), {min: 1}))),
      value("")));
    var exponent = s(or(and(string("e", false),
      sequence(function (s) {
        var exp_sign = s(or(string("+"), string("-"), value("")));
        var exp_value = s(text(digit(), {min: 1}));
        return value("e" + exp_sign + exp_value);
      })),
      value("")));
    return value(parseFloat(sign + leftSide + rightSide + exponent));
  });
}

/**
 * Returns a parser that will parse english cardinal numbers into their
 * numerical counterparts.
 *
 * @memberof module:mona/numbers
 * @instance
 *
 * @example
 * parse(cardinal(), "two thousand"); // => 2000
 */
function cardinal() {
  return or(numeralUpToVeryBig(),
            "cardinal");
}

/**
 * Returns a parser that will parse english ordinal numbers into their numerical
 * counterparts.
 *
 * @memberof module:mona/numbers
 * @instance
 *
 * @example
 * parse(ordinal(), "one-hundred thousand and fifth"); // 100005
 */
function ordinal() {
  return or(numeralUpToVeryBig(true),
            "ordinal");
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
 * parse(shortOrdinal(), "5th"); // 5
 */
function shortOrdinal(strict) {
  strict = typeof strict === "undefined" ? true : strict;
  if (strict) {
    return sequence(function(s) {
      var num = s(integer());
      switch ((""+num).substr(-1)) {
      case "1":
        s(string("st"));
        break;
      case "2":
        s(oneOf(["nd", "d"]));
        break;
      case "3":
        s(oneOf(["rd", "d"]));
        break;
      default:
        s(string("th"));
        break;
      }
      return value(num);
    });
  } else {
    return followedBy(integer(), oneOf(["th", "st", "nd", "rd"]));
  }
}

/*
 * English numbers support
 */
function numeralUpToVeryBig(ordinalMode) {
  return or(sequence(function(s) {
    var numOfBigs = s(numeralUpToThreeNines());
    s(numeralSeparator());
    var bigUnit = s(oneOf(CARDINALS["evenBigger sorted"], false));
    var bigUnitIndex = CARDINALS.evenBigger.indexOf(bigUnit.toLowerCase());
    var bigUnitMultiplier = Math.pow(10, (bigUnitIndex+1)*3);
    var lesserUnit = s(is(function(x) {
      return x < bigUnitMultiplier;
    }, or(and(or(and(string(","), spaces()),
                 numeralSeparator()),
              numeralUpToVeryBig(ordinalMode)),
          and(numeralSeparator(), string("and"), numeralSeparator(),
              numeralUpToThreeNines(ordinalMode)),
          value(null))));
    if (lesserUnit === null && ordinalMode) {
      s(string("th"));
      lesserUnit = 0;
    }
    return value((numOfBigs * bigUnitMultiplier) + lesserUnit);
  }), numeralUpToThreeNines(ordinalMode));
}

function numeralUpToThreeNines(ordinalMode) {
  return or(numeralHundreds(numeralUpToNinetyNine(ordinalMode),
                             1, ordinalMode),
            numeralUpToNinetyNine(ordinalMode));
}

function numeralSeparator() {
  return or(spaces(), string("-"));
}

function numeralHundreds(nextParser, multiplier, ordinalMode) {
  return sequence(function(s) {
    var numOfHundreds = s(numeralOneThroughNine());
    s(numeralSeparator());
    s(string("hundred"));
    var smallNum = s(or(
      and(numeralSeparator(),
          multiplier > 1 ?
          value() :
          maybe(and(string("and"), numeralSeparator())),
          nextParser),
      value(null)));
    if (smallNum === null && ordinalMode) {
      s(string("th"));
      smallNum = 0;
    }
    return value(((numOfHundreds * 100) + smallNum) * multiplier);
  });
}

function numeralUpToNinetyNine(ordinalMode) {
  return or(sequence(function(s) {
    var ten = s(oneOf(CARDINALS["tens sorted"], false));
    var tenIndex = CARDINALS.tens.indexOf(ten.toLowerCase());
    var small = s(or(and(numeralSeparator(),
                         numeralOneThroughNine(ordinalMode)),
                     value(0)));
    return value(((tenIndex + 2) * 10) + small);
  }), !ordinalMode?fail():sequence(function(s) {
    var ten = s(oneOf(ORDINALS["tens sorted"], false));
    var tenIndex = ORDINALS.tens.indexOf(ten.toLowerCase());
    return value((tenIndex + 2) * 10);
  }), numeralUpToNineteen(ordinalMode));
}

function numeralOneThroughNine(ordinalMode) {
  var source = ordinalMode ? ORDINALS : CARDINALS;
  return map(function(x) {
    return source["1-9"].indexOf(x.toLowerCase()) + 1;
  }, oneOf(source["1-9 sorted"], false));
}

function numeralUpToNineteen(ordinalMode) {
  var source = ordinalMode ? ORDINALS : CARDINALS;
  return map(function(x) {
    return source["0-19"].indexOf(x.toLowerCase());
  }, oneOf(source["0-19 sorted"], false));
}

var CARDINALS = {
  "1-9": ["one", "two", "three", "four", "five", "six",
          "seven", "eight", "nine"],
  "0-19": ["zero", "one", "two", "three", "four", "five", "six",
           "seven", "eight", "nine", "ten", "eleven", "twelve",
           "thirteen", "fourteen", "fifteen", "sixteen", "seventeen",
           "eighteen", "nineteen"],
  tens: ["twenty", "thirty", "forty", "fifty", "sixty",
         "seventy", "eighty", "ninety"],
  evenBigger: ["thousand", "million", "billion", "trillion",
               "quadrillion", "quintillion", "sextillion", "septillion",
               "octillion", "nonillion", "decillion", "undecillion",
               "duodecillion", "tredecillion"] // At this point, wikipedia ran
                                               // out of numbers until the
                                               // googol and googelplex
};

var ORDINALS = {
  "1-9": ["first", "second", "third", "fourth", "fifth", "sixth",
          "seventh", "eighth", "ninth"],
  "0-19": ["zeroeth", "first", "second", "third", "fourth", "fifth",
           "sixth", "seventh", "eighth", "ninth", "tenth", "eleventh",
           "twelfth", "thirteenth", "fourteenth", "fifteenth",
           "sixteenth", "seventeenth", "eighteenth", "nineteenth"],
  tens: ["twentieth", "thirtieth", "fortieth", "fiftieth",
         "sixtieth", "seventieth", "eightieth", "ninetieth"]
};

// We need a sorted version because we need the longest strings to show up
// first.
function _sortByLength(a, b) {
  return b.length - a.length;
}
for (var group in CARDINALS) {
  if (CARDINALS.hasOwnProperty(group)) {
    CARDINALS[group + " sorted"] = CARDINALS[group].slice();
    CARDINALS[group + " sorted"].sort(_sortByLength);
  }
}
for (group in ORDINALS) {
  if (ORDINALS.hasOwnProperty(group)) {
    ORDINALS[group + " sorted"] = ORDINALS[group].slice();
    ORDINALS[group + " sorted"].sort(_sortByLength);
  }
}

module.exports = {
  // API
  version: VERSION,
  parse: parse,
  parseAsync: parseAsync,
  // Base parsers
  value: value,
  bind: bind,
  fail: fail,
  label: label,
  token: token,
  eof: eof,
  log: log,
  delay: delay,
  map: map,
  tag: tag,
  lookAhead: lookAhead,
  is: is,
  isNot: isNot,
  // Combinators
  and: and,
  or: or,
  maybe: maybe,
  not: not,
  unless: unless,
  sequence: sequence,
  followedBy: followedBy,
  split: split,
  splitEnd: splitEnd,
  collect: collect,
  exactly: exactly,
  between: between,
  skip: skip,
  range: range,
  // String-related parsers
  stringOf: stringOf,
  oneOf: oneOf,
  noneOf: noneOf,
  string: string,
  alphaLower: alphaLower,
  alphaUpper: alphaUpper,
  alpha: alpha,
  digit: digit,
  alphanum: alphanum,
  space: space,
  spaces: spaces,
  text: text,
  trim: trim,
  trimLeft: trimLeft,
  trimRight: trimRight,
  // Numbers
  natural: natural,
  integer: integer,
  "float": real, // For compatibility
  real: real,
  cardinal: cardinal,
  ordinal: ordinal,
  shortOrdinal: shortOrdinal
};

/*
 * Internals
 */
function copy(obj) {
  var newObj = Object.create(Object.getPrototypeOf(obj));
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      newObj[key] = obj[key];
    }
  }
  return newObj;
}

function invokeParser(parser, parserState) {
  if (typeof parser !== "function") {
    throw new Error("Parser needs to be a function, but got " +
                    parser + " instead");
  }
  if (!(parserState instanceof ParserState)) {
    throw new Error("Expected parserState to be a ParserState");
  }
  var newParserState = parser(parserState);
  if (!(newParserState instanceof ParserState)) {
    throw new Error("Parsers must return a parser state object");
  }
  return newParserState;
}

function mergeErrors(err1, err2) {
  if (!err1 || (!err1.messages.length && err2.messages.length)) {
    return err2;
  } else if (!err2 || (!err2.messages.length && err1.messages.length)) {
    return err1;
  } else {
    switch (comparePositions(err1.position, err2.position)) {
    case "gt":
      return err1;
    case "lt":
      return err2;
    case "eq":
      var newMessages =
        (err1.messages.concat(err2.messages)).reduce(function(acc, x) {
          return (~acc.indexOf(x)) ? acc : acc.concat([x]);
        }, []);
      return new ParserError(err2.position,
                             newMessages,
                             err2.type,
                             err2.wasEof || err1.wasEof);
    default:
      throw new Error("This should never happen");
    }
  }
}

function comparePositions(pos1, pos2) {
  if (pos1.line < pos2.line) {
    return "lt";
  } else if (pos1.line > pos2.line) {
    return "gt";
  } else if (pos1.column < pos2.column) {
    return "lt";
  } else if (pos1.column > pos2.column) {
    return "gt";
  } else {
    return "eq";
  }
}

function ParserState(value, input, offset, userState,
                     position, hasConsumed, error, failed) {
  this.value = value;
  this.input = input;
  this.offset = offset;
  this.position = position;
  this.userState = userState;
  this.failed = failed;
  this.error = error;
}
