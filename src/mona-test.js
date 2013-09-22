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
      it("uses a parser returned by its callback as the next parser", function() {
        assert.equal(parse(mona.bind(mona.value("foo"), function(val) {
          return mona.value(val + "bar");
        }), ""), "foobar");
      });
    });
    describe("fail", function() {
      it("fails the parse with the given message", function() {
        assert.equal(parse(mona.fail("hi"),
                           "abc",
                           {throwOnError: false}).messages[0],
                     "hi");
      });
      it("uses 'parser error' as the error message if none is given", function() {
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
    describe("token", function() {
      it("consumes a single character from the input and returns it", function() {
        assert.equal(parse(mona.token(), "a"), "a");
        assert.equal(parse(mona.and(mona.token(), mona.token()), "ab"), "b");
      });
      it("fails if there is no more input", function() {
        assert.throws(function() {
          parse(mona.token(), "");
        });
        assert.throws(function() {
          parse(mona.and(mona.token(), mona.token()), "a");
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
  });
  describe("combinators", function() {
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
        assert.equal(parse(mona.unless(mona.fail("fail"), mona.value("success")),
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
  });
  describe("string-related parsers", function() {
    describe("satisfies", function() {
      it("parses a token matching a predicate", function() {
        var parser = mona.character("\n");
        assert.equal(parse(parser, "\n"), "\n");
        assert.equal(parse(mona.or(parser, mona.value("fail")), "\r"), "fail");
      });
    });
    describe("character", function() {
      it("succeeds if the next token matches the given character", function() {
        var parser = mona.satisfies(function(t) {
          return t === "\n";
        });
        assert.equal(parse(parser, "\n"), "\n");
        assert.equal(parse(mona.or(parser, mona.value("fail")), "\r"), "fail");
      });
    });
  });
});
