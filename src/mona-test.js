/* global describe, it */
"use strict";

var assert = require("assert"),
    mona = require("./mona"),
    parse = mona.parse;

describe("mona", function() {
  describe("parse", function() {
    it("executes a parser on some input and returns the result", function() {
      var result = {};
      assert.equal(parse(mona.value(result), ""), result);
    });
    it("returns an error object if throwOnError is falsy", function() {
      var result = parse(mona.fail("nop"), "", {throwOnError: false});
      assert.equal(result.messages.length, 1);
      assert.equal(result.messages[0], "nop");
    });
    it("throws a ParseError if throwOnError is truthy", function() {
      assert.throws(function() {
        parse(mona.fail("nop"), "", {throwOnError: true});
      });
    });
    it("defaults to throwing a ParseError if it fails", function() {
      assert.throws(function() {
        parse(mona.fail("nop"), "");
      });
    });
  });
  describe("ParseError", function() {
    it("reports the line in which an error happened", function() {
      assert.equal(parse(mona.token(), "", {throwOnError: false}).position.line,
                   1);
      assert.equal(parse(mona.and(mona.token(), mona.token()),
                         "\n",
                         {throwOnError: false}).position.line,
                   2);
    });
    it("reports the column in which an error happened", function() {
      assert.equal(
        parse(mona.fail(), "", {throwOnError:false}).position.column,
        1);
      assert.equal(
        parse(mona.and(mona.token(), mona.fail()),
              "ab",
              {throwOnError:false}).position.column,
        2);
      var parser = mona.and(mona.token(), mona.token(), mona.token(),
                            mona.token(), mona.fail()),
          result = parse(parser, "\na\nbcde", {throwOnError: false});
      assert.equal(result.position.column, 2);
    });
    it("toStrings to a human-readable error message");
  });
  describe("base parsers", function() {
    describe("value", function() {
      it("parses to the given value", function() {
        assert.equal(parse(mona.value("foo"), ""), "foo");
      });
      it("does not consume input");
    });
    describe("bind", function() {
      it("calls a function with the result of a parser", function() {
        parse(mona.bind(mona.value("test"), function(val) {
          assert.equal(val, "test");
          return mona.value(val);
        }), "");
      });
      it("uses a parser returned by its fun as the next parser", function() {
        assert.equal(parse(mona.bind(mona.value("foo"), function(val) {
          return mona.value(val + "bar");
        }), ""), "foobar");
      });
      it("does not call the function if the parser fails", function() {
        assert.ok(parse(mona.bind(mona.fail(), function() {
          throw new Error("This can't be happening...");
        }), "", {throwOnError: false}));
      });
    });
    describe("fail", function() {
      it("fails the parse with the given message", function() {
        assert.equal(parse(mona.fail("hi"),
                           "abc",
                           {throwOnError: false}).messages[0],
                     "hi");
      });
      it("uses 'parser error' as the message if none is given", function() {
        assert.equal(parse(mona.fail(),
                           "", {throwOnError: false}).messages[0],
                     "parser error");
      });
      it("accepts a 'type' argument used by the ParseError object", function() {
        assert.equal(parse(mona.fail("hi", "criticalExplosion"),
                           "abc",
                           {throwOnError: false}).type,
                     "criticalExplosion");
      });
      it("uses 'failure' as the default error type", function() {
        assert.equal(parse(mona.fail(), "", {throwOnError: false}).type,
                     "failure");
      });
    });
    describe("expected", function() {
      it("fails the parse reporting what was expected", function() {
        var result = parse(mona.expected("something"),
                           "",
                           {throwOnError: false});
        assert.equal(result.type, "expectation");
        assert.equal(result.messages[0], "expected 'something'");
      });
    });
    describe("token", function() {
      it("consumes one character from the input and returns it", function() {
        assert.equal(parse(mona.token(), "a"), "a");
        assert.equal(parse(mona.and(mona.token(), mona.token()), "ab"), "b");
      });
      it("optionally accepts a count of items to consume", function() {
        assert.equal(parse(mona.token(5), "abcde"), "abcde");
      });
      it("fails if there is no more input", function() {
        assert.throws(function() {
          parse(mona.token(), "");
        });
        assert.throws(function() {
          parse(mona.and(mona.token(), mona.token()), "a");
        });
        assert.throws(function() {
          parse(mona.and(mona.token(5)), "abcd");
        });
      });
      it("reports the error as 'unexpected eof' if it fails", function() {
        assert.equal(parse(mona.token(), "", {throwOnError: false}).messages[0],
                     "unexpected eof");
      });
      it("reports the error type as 'eof'", function() {
        assert.equal(parse(mona.token(), "", {throwOnError: false}).type,
                     "eof");
      });
    });
    describe("eof", function() {
      it("succeeds with true if we're out of input", function() {
        assert.equal(parse(mona.eof(), ""), true);
      });
      it("fails with useful message if there is still input left", function() {
        assert.equal(parse(mona.eof(), "a", {throwOnError: false}).messages[0],
                     "expected 'end of input'");
      });
    });
    describe("delay", function() {
      it("delays calling a parser constructor until parse-time", function() {
        var parser = mona.delay(function() {
          throw new Error("Parser explosion");
        });
        assert.throws(function() { parse(parser, ""); });
      });
      it("returns a parser with the arguments applied", function() {
        var parser = mona.delay(mona.integer, 16);
        assert.equal(parse(parser, "deadbeef"), 0xdeadbeef);
      });
    });
  });
  describe("combinators", function() {
    describe("and", function() {
      it("returns the last result if all previous ones succeed",  function() {
        assert.equal(parse(mona.and(mona.token(), mona.token()), "ab"), "b");
        assert.equal(parse(mona.and(mona.token()), "ab"), "a");
        assert.throws(function() {
          parse(mona.and(), "ab");
        });
      });
    });
    describe("or", function() {
      it("returns the result of the first parser that succeeds", function() {
        assert.equal(parse(mona.or(mona.value("foo"), mona.value("bar")), ""),
                     "foo");
        assert.equal(parse(mona.or(mona.fail("nope"), mona.value("yup")), ""),
                     "yup");
      });
      it("returns the last error if no parsers succeed");
    });
    describe("maybe", function() {
      it("returns the result of the parser, if it succeeds", function() {
        assert.equal(parse(mona.maybe(mona.value("foo")), ""), "foo");
      });
      it("returns undefined without consuming if the parser fails", function() {
        assert.equal(parse(mona.maybe(mona.fail("nope")), ""), undefined);
        assert.equal(parse(mona.and(mona.maybe(mona.fail("nope")),
                                    mona.token()),
                           "a"),
                     "a");
      });
    });
    describe("not", function() {
      it("returns true if the given parser fails", function() {
        assert.equal(parse(mona.not(mona.token()), ""), true);
      });
      it("fails if the given parser succeeds", function() {
        assert.equal(parse(mona.and(mona.not(mona.token()), mona.value("test")),
                           ""),
                     "test");
      });
    });
    describe("unless", function() {
      it("returns the last result if the first parser fails", function() {
        assert.equal(parse(mona.unless(mona.fail("fail"),
                                       mona.value("success")),
                           ""),
                     "success");
        assert.ok(parse(mona.unless(mona.value("success"), mona.value("fail")),
                        "",
                        {throwOnError: false}).messages[0],
                  "expected parser to fail");
      });
    });
    describe("sequence", function() {
      it("simulates do notation", function() {
        var parser = mona.sequence(function(s) {
          var x = s(mona.token());
          assert.equal(x, "a");
          var y = s(mona.token());
          assert.equal(y, "b");
          return mona.value(y+x);
        });
        assert.equal(parse(parser, "ab"), "ba");
      });
      it("errors with the correct message if an parser fails", function() {
        var parser = mona.sequence(function(s) {
          var x = s(mona.token());
          assert.equal(x, "a");
          return mona.token();
        });
        assert.equal(parse(parser, "a", {throwOnError: false}).messages[0],
                     "unexpected eof");
      });
    });
    describe("followedBy", function() {
      it("returns the first result if the others also succeed", function() {
        var parserSuccess = mona.followedBy(mona.value("pass"),
                                            mona.value("yay"));
        assert.equal(parse(parserSuccess, ""), "pass");
        var parserFail = mona.followedBy(mona.value("pass"),
                                         mona.fail("nope"));
        assert.equal(parse(mona.or(parserFail, mona.value("fail")), ""),
                     "fail");
      });
    });
    describe("separatedBy", function() {
      it("returns an array of values separated by a separator", function() {
        assert.deepEqual(
          parse(mona.separatedBy(mona.token(), mona.character(".")), "a.b.c.d"),
          ["a", "b", "c", "d"]);
      });
      it("returns an empty array if it fails", function() {
        assert.deepEqual(parse(mona.separatedBy(mona.character("a"),
                                                mona.character(".")),
                               "b.c.d"),
                         []);
      });
      it("accepts a minimum count as a third argument", function() {
        var parser = mona.separatedBy(mona.token(), mona.character("."), 3);
        assert.deepEqual(parse(parser, "a.b.c"), ["a", "b", "c"]);
        assert.throws(function() {
          parse(parser, "a.b");
        });
      });
    });
    describe("zeroOrMore", function() {
      it("returns zero or more matches for a given parser", function() {
        var parser = mona.zeroOrMore(mona.token());
        assert.equal(parse(parser, "abc").length, 3);
      });
      it("succeeds even if no matches are found", function() {
        var parser = mona.zeroOrMore(mona.token());
        assert.equal(parse(parser, "").length, 0);
      });
    });
    describe("oneOrMore", function() {
      it("returns one or more matches for a given parser", function() {
        var parser = mona.oneOrMore(mona.token());
        assert.equal(parse(parser, "abc").length, 3);
      });
      it("succeeds if at least one match is found", function() {
        var parser = mona.oneOrMore(mona.token());
        assert.equal(parse(parser, "a").length, 1);
      });
    });
    describe("between", function() {
      it("returns a value in between two other parsers", function() {
        var parser = mona.between(mona.character("("),
                                  mona.character(")"),
                                  mona.integer());
        assert.equal(parse(parser, "(123)"), 123);
        assert.throws(function() {
          parse(parser, "123)");
        });
        assert.throws(function() {
          parse(parser, "(123");
        });
        assert.throws(function() {
          parse(parser, "()");
        });
        var maybeParser = mona.between(mona.character("("),
                                       mona.character(")"),
                                       mona.maybe(mona.integer()));
        assert.equal(parse(maybeParser, "()"), undefined);
      });
    });
    describe("skip", function() {
      it("skips input until parser stops matching", function() {
        var parser = mona.and(mona.skip(mona.character("a")), mona.token());
        assert.equal(parse(parser, "aaaaaaaaaaab"), "b");
      });
    });
  });
  describe("string-related parsers", function() {
    describe("satisfies", function() {
      it("parses a token matching a predicate", function() {
        var parser = mona.satisfies(function(t) {
          return t === "\n";
        });
        assert.equal(parse(parser, "\n"), "\n");
        assert.equal(parse(mona.or(parser, mona.value("fail")), "\r"), "fail");
      });
    });
    describe("character", function() {
      it("succeeds if the next token matches the given character", function() {
        var parser = mona.character("\n");
        assert.equal(parse(parser, "\n"), "\n");
        assert.equal(parse(mona.or(parser, mona.value("fail")), "\r"), "fail");
      });
    });
    describe("oneOf", function() {
      it("succeeds if the next token is present in the char bag", function() {
        assert.equal(parse(mona.oneOf("abc"), "b"), "b");
        assert.throws(function() {
          parse(mona.oneOf("abc"), "d");
        });
      });
      it("reports that it expected one of the given characters on failure");
    });
    describe("noneOf", function() {
      it("succeeds if the next token is not in the char bag", function() {
        assert.equal(parse(mona.noneOf("abc"), "d"), "d");
        assert.throws(function() {
          parse(mona.noneOf("abc"), "b");
        });
      });
    });
    describe("string", function() {
      it("succeeds if the string matches a string in the input", function() {
        assert.equal(parse(mona.string("foo"), "foo"), "foo");
        assert.equal(parse(mona.string("foo"), "foobarbaz"), "foo");
        assert.throws(function() {
          parse(mona.string("bar"), "foobarbaz");
        });
      });
    });
    describe("digitCharacter", function() {
      it("succeeds if the next token is a digit character", function() {
        assert.equal(parse(mona.digitCharacter(), "1"), "1");
        assert.throws(function() {
          parse(mona.digitCharacter(), "z");
        });
      });
      it("accepts an optional base/radix argument", function() {
        assert.equal(parse(mona.digitCharacter(16), "f"), "f");
      });
      it("defaults to base 10", function() {
        assert.equal(parse(mona.digitCharacter(), "0"), "0");
        assert.equal(parse(mona.digitCharacter(), "9"), "9");
        assert.throws(function() {
          parse(mona.digitCharacter(), "a");
        });
      });
    });
    describe("space", function() {
      it("consumes a single whitespace character from input", function() {
        assert.equal(parse(mona.space(), " "), " ");
        assert.equal(parse(mona.space(), "\n"), "\n");
        assert.equal(parse(mona.space(), "\t"), "\t");
        assert.equal(parse(mona.space(), "\r"), "\r");
        assert.throws(function() {
          parse(mona.space(), "");
        });
        assert.throws(function() {
          parse(mona.space(), "hi");
        });
      });
    });
    describe("spaces", function() {
      it("consumes one or more whitespace characters", function() {
        var parser = mona.and(mona.spaces(),
                              mona.token());
        assert.equal(parse(parser, "     a"), "a");
        assert.equal(parse(parser, "   \r  \n\t a"), "a");
      });
      it("returns a single space as its success value", function() {
        assert.equal(parse(mona.spaces(), "\r \n\t   \r\t\t\n"), " ");
      });
    });
    describe("text", function() {
      it("Collects one or more parser results into a string", function() {
        assert.equal(parse(mona.text(mona.character("a")), "aaaab"), "aaaa");
      });
      it("defaults to token()", function() {
        assert.equal(parse(mona.text(), "abcde"), "abcde");
      });
    });
  });
  describe("number-related parsers", function() {
    describe("digit", function() {
      it("matches a single digit and returns it as a number", function() {
        assert.equal(parse(mona.digit(), "1"), 1);
      });
      it("accepts a base/radix argument");
      it("defaults to base 10");
    });
    describe("naturalNumber", function() {
      it("matches a natural number without a sign", function() {
        assert.equal(parse(mona.naturalNumber(), "1234"), 1234);
        assert.throws(function() {
          parse(mona.naturalNumber(), "-123");
        });
      });
      it("accepts a base/radix argument");
      it("defaults to base 10");
    });
    describe("integer", function() {
      it("matches a positive or negative possibly-signed integer", function() {
        assert.equal(parse(mona.integer(), "1234"), 1234);
        assert.equal(parse(mona.integer(), "+1234"), 1234);
        assert.equal(parse(mona.integer(), "-1234"), -1234);
      });
      it("accepts a base/radix argument");
      it("defaults to base 10");
    });
  });
});
