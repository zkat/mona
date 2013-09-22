"use strict";

function copy(obj) {
  var newObj = Object.create(Object.getPrototypeOf(obj));
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      newObj[key] = obj[key];
    }
  }
  return newObj;
}

function attr(obj, name, arg) {
  if (arguments.length < 2) {
    return copy(obj);
  } else if (arguments.length < 3) {
    return obj[name];
  } else {
    var newObj = copy(obj);
    newObj[name] = (typeof arg === "function") ?
      arg(obj[name]) :
      arg;
    return newObj;
  }
}

function SourcePosition(name, line, column) {
  this.name = name;
  this.line = line || 1;
  this.column = column || 1;
}

function ParseError(pos, messages, type) {
  this.position = pos;
  this.messages = messages;
  this.type = type;
}

function mergeErrors(err1, err2) {
  if (!err1 || (!err1.messages.length && err2.messages.length)) {
    return err2;
  } else if (!err2 || (!err2.messages.length && err1.messages.length)) {
    return err1;
  } else {
    return new ParseError(err1.pos, err1.messages.concat(err2.messages));
  }
}

function ParserState(value, restOfInput, userState,
                     position, hasConsumed, error) {
  this.value = value;
  this.restOfInput = restOfInput;
  this.position = position;
  this.userState = userState;
  this.hasConsumed = hasConsumed;
  this.error = error;
}

function runParser(parser, string, opts) {
  opts = opts || {
    throwOnError: true
  };
  var parseState = parser(
    new ParserState(undefined, string, opts.userState,
                    new SourcePosition(opts.fileName), false));
  if (parseState.error && opts.throwOnError) {
    throw parseState.error;
  } else if (parseState.error && !opts.throwOnError) {
    return parseState.error;
  } else {
    return parseState.value;
  }
}

function parserReturn(val) {
  return function(parserState) {
    return attr(parserState, "value", val);
  };
}

function parserBind(parser, fun) {
  return function(parserState) {
    var newParserState = parser(parserState);
    return fun(newParserState.value)(newParserState);
  };
}

function parserFail(msg, type) {
  msg = msg || "parser error";
  type = type || "failure";
  return function(parserState) {
    return attr(parserState, "error", function(oldErr) {
      return mergeErrors(
        oldErr, new ParseError(parserState.position, [msg], type));
    });
  };
}

function parserToken() {
  return function(parserState) {
    var input = parserState.restOfInput;
    if (input.length) {
      var newParserState = copy(parserState),
          newPosition = copy(parserState.position);
      if (input[0] === "\n") {
        newPosition.column = 1;
        newPosition.line += 1;
      } else {
        newPosition.column += 1;
      }
      newParserState.value = input[0];
      newParserState.restOfInput = input.slice(1);
      newParserState.position = newPosition;
      return newParserState;
    } else {
      return parserFail("unexpected eof", "eof")(parserState);
    }
  };
}

function parserAnd(parser) {
  var moreParsers = [].slice.call(arguments, 1);
  return parserBind(parser, function(result) {
    return moreParsers.length ?
      parserAnd.apply(null, moreParsers) :
      parserReturn(result);
  });
}

function parserOr() {
  function orHelper() {
    var parsers = [].slice.call(arguments);
    return function(parserState) {
      var res = parsers[0](parserState);
      if (res.error && parsers[1]) {
        return orHelper.apply(null, parsers.slice(1))(parserState);
      } else {
        return res;
      }
    };
  }
  return orHelper.apply(null, arguments);
}

function parserMaybe(parser) {
  return parserOr(parser, parserReturn());
}

function parserEof() {
  return function(parserState) {
    if (!parserState.restOfInput) {
      return attr(parserState, "value", true);
    } else {
      return parserFail("expected an eof", "expectation");
    }
  };
}

function parserNot(parser) {
  return function(parserState) {
    return parser(parserState).error ?
      parserReturn(true)(parserState) :
      parserFail("expected parser to fail")(parserState);
  };
}

function parserUnless(parser) {
  var moreParsers = [].slice.call(arguments, 1);
  return parserAnd.apply(null, [parserNot(parser)].concat(moreParsers));
}

function parserSeq(fun) {
  return function(parserState) {
    var state = parserState, failwhale = {};
    function s(parser) {
      state = parser(state);
      if (state.error) {
        throw failwhale;
      } else {
        return state.value;
      }
    }
    try {
      return fun(s)(state);
    } catch(x) {
      if (x === failwhale) {
        return state;
      } else {
        throw x;
      }
    }
  };
}

function parserFollowedBy(parser) {
  var parsers = [].slice.call(arguments, 1);
  return parserBind(parser, function(result) {
    return parserBind(parserAnd.apply(null, parsers), function() {
      return parserReturn(result);
    });
  });
}

function parserZeroOrMore(parser) {
  return function(parserState) {
    for (var s = parser(parserState), res = []; !s.error; s = parser(s)) { 
      res.push(s.value);
    }
    console.log(res);
    return parserReturn(res)(s);
  };
}

function parserOneOrMore(parser) {
  return parserSeq(function(s) {
    var x = s(parser),
        y = s(parserZeroOrMore(parser));
    return parserReturn([x].concat(y));
  });
}

function parserSatisfies(fun) {
  return parserBind(parserToken(), function(c) {
    if (fun(c)) {
      return parserReturn(c);
    } else {
      return parserFail("token does not match predicate");
    }
  });
}

function parserStringOf(parser) {
  return parserBind(parser, function(xs) { return parserReturn(xs.join("")); });
}

function parserCharacter(x) {
  return parserSatisfies(function(y) {
    return x === y;
  });
}

function parserOneOf(chars) {
  return parserSatisfies(function(x) { return ~chars.indexOf(x); });
}

function parserNoneOf(chars) {
  return parserSatisfies(function(x) { return !~chars.indexOf(x); });
}

function parserString(str) {
  return !str.length ?
    parserReturn("") :
    parserSeq(function(s) {
      s(parserCharacter(str[0]));
      s(parserString(str.substr(1)));
      return parserReturn(str);
    });
}

function parserDigitCharacter(base) {
  base = base || 10;
  return parserSatisfies(function(x) { return !isNaN(parseInt(x, base)); });
}

function parserSpace() {
  return parserOneOf(" \t\n\r");
}

function parserSpaces() {
  return parserAnd(parserOneOrMore(parserSpace()), parserReturn(" "));
}

function parserText(parser) {
  parser = parser || parserToken();
  return parserStringOf(parserOneOrMore(parser));
}

function parserDigit(base) {
  base = base || 10;
  return parserSeq(function(s) {
    var c = s(parserToken),
        digit = s(parserReturn(parseInt(c, base)));
    return isNaN(digit) ? parserFail("invalid digit") : parserReturn(digit);
  });
}

function parserNaturalNumber(base) {
  base = base || 10;
  return parserSeq(function(s) {
    var xs = s(parserOneOrMore(parserDigitCharacter(base)));
    return parserReturn(parseInt(xs.join(""), base));
  });
}

function parserInteger(base) {
  base = base || 10;
  return parserSeq(function(s) {
    var sign = s(parserMaybe(parserOr(parserCharacter("+"),
                                      parserCharacter("-")))),
        num = s(parserNaturalNumber(base));
    return parserReturn(num * (sign === "-" ? -1 : 1));
  });
}

var mona = module.exports = {
  // API
  parse: runParser,
  // Base parsers
  value: parserReturn,
  bind: parserBind,
  fail: parserFail,
  token: parserToken,
  eof: parserEof,
  // Combinators
  and: parserAnd,
  or: parserOr,
  maybe: parserMaybe,
  not: parserNot,
  unless: parserUnless,
  sequence: parserSeq,
  followedBy: parserFollowedBy,
  zeroOrMore: parserZeroOrMore,
  oneOrMore: parserOneOrMore,
  // String-related parsers
  satisfies: parserSatisfies,
  stringOf: parserStringOf,
  character: parserCharacter,
  oneOf: parserOneOf,
  noneOf: parserNoneOf,
  string: parserString,
  digitCharacter: parserDigitCharacter,
  space: parserSpace,
  spaces: parserSpaces,
  text: parserText,
  // Numbers
  digit: parserDigit,
  naturalNumber: parserNaturalNumber,
  integer: parserInteger
};

module.exports = mona;
