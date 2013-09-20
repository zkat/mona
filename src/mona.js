"use strict";

function isEmpty(input) {
  return !input.length;
}

var mona = {
  result: function(value) {
    return function(input) {
      return [{val: value, input: input}];
    };
  },

  // TODO - We could add a message here, to provide better failure messages, but
  // it might need some restructuring of the value data structure.
  fail:  function() {
    return function() {
      return [];
    };
  },

  item: function() {
    return function(input) {
      return isEmpty(input) ? [] : [{
        val: input[0],
        input: input.substr(1)
      }];
    };
  },

  bind: function(parser, fun) {
    return function(input) {
      return parser(input).reduce(function(acc, valObj) {
        return acc.concat(fun(valObj.val)(valObj.input));
      }, []);
    };
  },

  run: function run(parser, input) {
    return parser(input)[0];
  },

  satisfies: function satisfies(predicate) {
    return mona.bind(mona.item(), function(x) {
      return predicate(x) ? mona.result(x) : mona.fail();
    });
  },

  amb: function() {
    var parsers = [].slice.call(arguments);
    return function(input) {
      return parsers.reduce(function(acc, parser) {
        return acc.concat(parser(input));
      }, []);
    };
  },

  endOfInput: function() {
    return function(input) {
      return isEmpty(input) ? [{val: true, input: input}] : [];
    };
  },

  or: function() {
    function orHelper() {
      var parsers = [].slice.call(arguments);
      return function(input) {
        var res = parsers[0](input);
        return res.length ?
          res :
          (parsers.length > 1) ?
          orHelper.apply(this, parsers.slice(1))(input) :
          [];
      };
    }
    return orHelper.apply(this, arguments);
  },

  and: function(parser) {
    var moreParsers = [].slice.call(arguments, 1);
    return mona.bind(parser, function(res) {
      return moreParsers.length ?
        mona.and.apply(null, moreParsers) :
        mona.result(res);
    });
  },

  not: function(parser) {
    return function(input) {
      return parser(input).length ? [] : [{val: true, input: input}];
    };
  },

  unless: function(parser) {
    var moreParsers = [].slice.call(arguments, 1);
    return mona.and.apply(null, [mona.not(parser)].concat(moreParsers));
  },

  character: function(x) {
    return mona.satisfies(function(y) { return x === y; });
  },

  before: function(parser, endParser) {
    return mona.sequence(function(s) {
      var i = s(parser),
          res = s(function(input) {
            return endParser(input).length ? [{val: i, input: input}] : [];
          });
      return mona.result(res);
    });
  },

  string: function(str) {
    return !str.length ?
      mona.result("") :
      mona.sequence(function(s) {
        s(mona.character(str[0]));
        s(mona.string(str.substr(1)));
        return mona.result(str);
      });
  },

  zeroOrMore: function(parser) {
    return function(input) {
      var results = [], value;
      while (value = parser(input), value.length) {
        results.push(value[0].val);
        input = value[0].input;
      }
      return [{val: results, input: input}];
    };
  },

  oneOrMore: function(parser) {
    return mona.sequence(function(s) {
      var x = s(parser),
          y = s(mona.zeroOrMore(parser));
      return mona.result([x].concat(y));
    });
  },

  maybe: function(parser) {
    return mona.or(parser, mona.result(false));
  },

  // TODO - This won't handle ambiguous parses made with amb.
  sequence: function(fun) {
    return function(input) {
      var state, failwhale = {};
      function s(parser) {
        state = parser(input);
        if (state.length > 1) {
          throw new Error("sequence does not currently support "+
                          "ambiguous results. Use bind manually, instead.");
        } else if (state.length) {
          input = state[0].input;
          return state[0].val;
        } else {
          throw failwhale;
        }
      }
      try {
        return fun(s)(input);
      } catch(x) {
        if (x === failwhale) {
          return [];
        } else {
          throw x;
        }
      }
    };
  },

  digitCharacter: function(base) {
    base = base || 10;
    return mona.satisfies(function(x) { return !isNaN(parseInt(x, base)); });
  },

  digit: function(base) {
    base = base || 10;
    return mona.sequence(function(s) {
      var c = s(mona.item()),
          digit = s(mona.result(parseInt(c, base)));
      return isNaN(digit) ? mona.fail() : mona.result(digit);
    });
  },

  naturalNumber: function(base) {
    base = base || 10;
    return mona.sequence(function(s) {
      var xs = s(mona.oneOrMore(mona.digitCharacter(base)));
      return mona.result(parseInt(xs.join(""), base));
    });
  },

  integer: function(base) {
    base = base || 10;
    return mona.sequence(function(s) {
      var sign = s(mona.maybe(mona.or(mona.character("+"),
                                      mona.character("-")))),
          num = s(mona.naturalNumber(base));
      return mona.result(num * (sign === "-" ? -1 : 1));
    });
  },

  oneOf: function(characters) {
    return mona.bind(mona.item(), function(ch) {
      return (characters.indexOf(ch) >= 0) ? mona.result(ch) : mona.fail();
    });
  },

  whitespace: function() {
    return mona.oneOf(" \t\n\r");
  },

  ws: function() {
    return mona.oneOrMore(mona.whitespace());
  },

  skipWhitespace: function() {
    return mona.maybe(mona.ws());
  },

  stringOf: function(parser) {
    return mona.bind(parser, function(xs) { return mona.result(xs.join("")); });
  },

  word: function() {
    return mona.stringOf(
      mona.oneOrMore(mona.unless(mona.whitespace(), mona.item())));
  },

  followedBy: function(parser) {
    var parsers = [].slice.call(arguments, 1);
    return mona.bind(parser, function(result) {
      return mona.bind(mona.and.apply(null, parsers), function() {
        return mona.result(result);
      });
    });
  },

  text: function(parser) {
    parser = parser || mona.item();
    return mona.stringOf(mona.oneOrMore(parser));
  },

  normalizedText: function(parser) {
    return mona.bind(mona.text(parser), function(txt) {
      return mona.result(txt.replace(/\s+/g, " "));
    });
  }
};

module.exports = mona;
