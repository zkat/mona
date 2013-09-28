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
  describe("parseAsync", function() {
    it("executes a callback on asynchronous results", function(done) {
      var step = 0;
      var handle = mona.parseAsync(mona.token(), function(err, token) {
        step++;
        assert.equal(token, "a");
        if (step === 2) {
          done();
        }
      });
      handle.data("aa");
      handle.done();
    });
    it("stops if a non-eof error happens", function(done) {
      var step = 0;
      var handle = mona.parseAsync(mona.string("foo"), function(err, data) {
        step++;
        if (step < 4) {
          assert.equal(err, null);
          assert.equal(data, "foo");
        } else {
          if (step > 4) {
            throw new Error("It was never supposed to be like this!");
          }
          assert.equal(err.message,
                       "(line 1, column 10) expected string matching {foo}");
          done();
        }
      });
      handle.data("fo");
      handle.data("ofoo");
      handle.data("foox");
    });
    it("throws an error if anything is done to a closed handle", function() {
      var handle = mona.parseAsync(mona.token(), function() {});
      handle.done();
      assert.throws(handle.done);
      assert.throws(handle.data);
      assert.throws(handle.error);
    });
    it("calls function with an error and closes on .error()", function(done) {
      var testErr = new Error("test");
      var handle = mona.parseAsync(mona.token(), function(err) {
        assert.equal(err, testErr);
        done();
      });
      handle.error(testErr);
    });
    it("includes correct source position info in errors", function(done) {
      var parser = mona.string("foo\n");
      var handle = mona.parseAsync(parser, function(err) {
        if (err) {
          assert.equal(err.message,
                       "(line 5, column 1) expected string matching {foo\n}");
          done();
        }
      });
      handle.data("fo");
      handle.data("o\nfoo");
      handle.data("\nf");
      handle.data("oo\nfoo\nbbbb");
      handle.done();
    });
    describe("#data()", function() {
      it("returns the handle", function() {
        var handle = mona.parseAsync(mona.token(), function(){});
        assert.equal(handle.data("foo"), handle);
      });
    });
    describe("#done()", function() {
      it("returns the handle", function() {
        var handle = mona.parseAsync(mona.token(), function(){});
        assert.equal(handle.done(), handle);
      });
    });
    describe("#error()", function() {
      it("returns the handle", function() {
        var handle = mona.parseAsync(mona.token(), function(){});
        assert.equal(handle.error(new Error("bye")), handle);
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
        parse(mona.and(mona.string("a"),
                       mona.string("a"),
                       mona.string("a")),
              "aab",
              {throwOnError:false}).position.column,
        3);
      var parser = mona.and(mona.token(), mona.token(), mona.token(),
                            mona.token(), mona.fail()),
          result = parse(parser, "\na\nbcde", {throwOnError: false});
      assert.equal(result.position.column, 2);
    });
  });
  describe("base parsers", function() {
    describe("value", function() {
      it("parses to the given value", function() {
        assert.equal(parse(mona.value("foo"), ""), "foo");
      });
      it("does not consume input", function() {
        assert.equal(parse(mona.followedBy(mona.value("foo"), mona.token()),
                           "a"),
                     "foo");
      });
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
      it("throws an error if a parser returns the wrong thing", function() {
        assert.throws(function() {
          parse(mona.bind(function() { return "nope"; }), "");
        }, /Parsers must return a parser state object/);
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
        assert.equal(result.messages[0], "expected something");
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
                     "expected end of input");
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
        var parser = mona.delay(mona.value, "foo");
        assert.equal(parse(parser, ""), "foo");
      });
    });
    describe("map", function() {
      it("transforms a parser's result", function() {
        assert.equal(parse(mona.map(function(txt) {
          return txt.toUpperCase();
        }, mona.text()), "abc"), "ABC");
      });
      it("does not call function if the parser fails", function() {
        var parser = mona.map(function(x) {throw x;}, mona.token());
        assert.equal(parse(parser, "", {throwOnError: false}).message,
                     "(line 1, column 1) unexpected eof");
      });
    });
    describe("wrap", function() {
      it("wraps a parser's output with a tagging object", function() {
        assert.deepEqual(parse(mona.tag(mona.text(), "txt"), "foo"),
                         {txt: "foo"});
      });
    });
    describe("lookAhead", function() {
      it("returns a parser's value without consuming input", function() {
        assert.equal(parse(mona.followedBy(mona.lookAhead(mona.token()),
                                           mona.token()),
                           "a"),
                     "a");
      });
    });
    describe("is", function() {
      it("parses a token matching a predicate", function() {
        var parser = mona.is(function(t) {
          return t === "\n";
        });
        assert.equal(parse(parser, "\n"), "\n");
        assert.equal(parse(mona.or(parser, mona.value("fail")), "\r"), "fail");
      });
    });
    describe("isNot", function() {
      it("parses a token not matching a predicate", function() {
        var parser = mona.isNot(function(t) {
          return t !== "\n";
        });
        assert.equal(parse(parser, "\n"), "\n");
        assert.equal(parse(mona.or(parser, mona.value("fail")), "\r"), "fail");
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
      it("reports all the accumulated errors", function() {
        var result = parse(mona.or(mona.fail("foo"),
                                   mona.fail("bar"),
                                   mona.fail("baz"),
                                   mona.fail("quux")),
                           "", {throwOnError: false});
        assert.equal(result.message,
                     "(line 1, column 1) foo\nbar\nbaz\nquux");
      });
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
        assert.throws(function() {
          var parser = mona.sequence(function(s) {
            var x = s(mona.token());
            assert.equal(x, "a");
            return mona.token();
          });
          parse(parser, "a");
        }, /\(line 1, column 2\) unexpected eof/);
        assert.throws(function() {
          var parser = mona.sequence(function(s) {
            s(mona.token());
            s(mona.token());
            s(mona.token());
            return mona.eof();
          });
          parse(parser, "aa");
        }, /\(line 1, column 3\) unexpected eof/);
      });
      it("throws an error if callback fails to return a parser", function() {
        assert.throws(function() {
          parse(mona.sequence(function() { return "nope"; }), "");
        }, /must return a parser/);
        assert.throws(function() {
          parse(mona.sequence(function() { return function() {}; }), "");
        }, /must return a parser/);
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
          parse(mona.separatedBy(mona.token(), mona.string(".")), "a.b.c.d"),
          ["a", "b", "c", "d"]);
      });
      it("returns an empty array if it fails", function() {
        assert.deepEqual(parse(mona.separatedBy(mona.string("a"),
                                                mona.string(".")),
                               "b.c.d"),
                         []);
      });
      it("accepts a min count", function() {
        var parser = mona.separatedBy(mona.token(), mona.string("."),
                                      {min: 3});
        assert.deepEqual(parse(parser, "a.b.c"), ["a", "b", "c"]);
        assert.throws(function() {
          parse(parser, "a.b");
        });
      });
    });
    describe("endedBy", function() {
      it("collects matches separated and ended by a parser", function() {
        assert.deepEqual(
          parse(mona.followedBy(
            mona.endedBy(mona.token(), mona.string(".")),
            mona.eof()), "a.b.c.d."),
          ["a", "b", "c", "d"]);
        assert.throws(function() {
          parse(mona.followedBy(
            mona.endedBy(mona.token(), mona.string(".")),
            mona.eof()), "a.b.c.d");
        });
      });
      it("accepts a flag to make the ender optional", function() {
        assert.deepEqual(
          parse(mona.followedBy(
            mona.endedBy(mona.token(), mona.string("."), false),
            mona.eof()), "a.b.c.d"),
          ["a", "b", "c", "d"]);
        assert.deepEqual(
          parse(mona.followedBy(
            mona.endedBy(mona.token(), mona.string("."), false),
            mona.eof()), "a.b.c.d."),
          ["a", "b", "c", "d"]);
      });
      it("accepts a minimum count as a fourth argument", function() {
        var parser = mona.endedBy(mona.token(), mona.string("."), true, 3);
        assert.deepEqual(parse(parser, "a.b.c."), ["a", "b", "c"]);
        assert.throws(function() {
          parse(parser, "a.b.");
        });
      });
    });
    describe("collect", function() {
      it("collects zero or more matches by default", function() {
        var parser = mona.collect(mona.token());
        assert.deepEqual(parse(parser, "abc"), ["a", "b", "c"]);
      });
      it("succeeds even if no matches are found", function() {
        var parser = mona.collect(mona.token());
        assert.deepEqual(parse(parser, ""), []);
      });
      it("accepts a minimum count", function() {
        var parser = mona.collect(mona.token(), {min: 1});
        assert.deepEqual(parse(parser, "a"), ["a"]);
        assert.throws(function() {
          parse(parser, "");
        }, /unexpected eof/);
      });
      it("accepts a maximum count", function() {
        var parser = mona.followedBy(
          mona.collect(mona.token(), {min: 1, max: 4}),
          mona.collect(mona.token()));
        assert.deepEqual(parse(parser, "aaaaa"), ["a", "a", "a", "a"]);
      });
    });
    describe("exactly", function() {
      it("collects exactly n matches", function() {
        var parser = mona.followedBy(mona.exactly(mona.token(), 3),
                                     mona.collect(mona.token()));
        assert.deepEqual(parse(parser, "aaaaaaa"), ["a", "a", "a"]);
        assert.throws(function() {
          parse(parser, "aa");
        }, /unexpected eof/);
      });
    });
    describe("between", function() {
      it("returns a value in between two other parsers", function() {
        var parser = mona.between(mona.string("("),
                                  mona.string(")"),
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
        var maybeParser = mona.between(mona.string("("),
                                       mona.string(")"),
                                       mona.maybe(mona.integer()));
        assert.equal(parse(maybeParser, "()"), undefined);
      });
    });
    describe("skip", function() {
      it("skips input until parser stops matching", function() {
        var parser = mona.and(mona.skip(mona.string("a")), mona.token());
        assert.equal(parse(parser, "aaaaaaaaaaab"), "b");
      });
    });
  });
  describe("string-related parsers", function() {
    describe("oneOf", function() {
      it("succeeds if the next token is present in the char bag", function() {
        assert.equal(parse(mona.oneOf("abc"), "b"), "b");
        assert.throws(function() {
          parse(mona.oneOf("abc"), "d");
        });
      });
      it("optionally does a case-insensitive match", function() {
        assert.equal(parse(mona.oneOf("abc", false), "B"), "B");
        assert.equal(parse(mona.or(mona.oneOf("abc", true),
                                   mona.value("fail")), "B"),
                     "fail");
      });
      it("defaults to being case-sensitive", function() {
        assert.equal(parse(mona.or(mona.oneOf("abc"),
                                   mona.value("fail")), "B"),
                     "fail");
      });
    });
    describe("noneOf", function() {
      it("succeeds if the next token is not in the char bag", function() {
        assert.equal(parse(mona.noneOf("abc"), "d"), "d");
        assert.throws(function() {
          parse(mona.noneOf("abc"), "b");
        });
      });
      it("optionally does a case-insensitive match", function() {
        assert.equal(parse(mona.noneOf("abc", true), "B"), "B");
        assert.equal(parse(mona.or(mona.noneOf("abc", false),
                                   mona.value("fail")), "B"),
                     "fail");
      });
      it("defaults to being case-sensitive", function() {
        assert.equal(parse(mona.or(mona.noneOf("abc"),
                                   mona.value("fail")), "b"),
                     "fail");
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
      it("optionally does a case-insensitive match", function() {
        assert.equal(parse(mona.string("abc", false), "AbC"), "AbC");
        assert.equal(parse(mona.or(mona.string("abc", true),
                                   mona.value("fail")), "AbC"),
                     "fail");
      });
      it("defaults to being case-sensitive", function() {
        assert.equal(parse(mona.or(mona.string("abc"),
                                   mona.value("fail")), "AbC"),
                     "fail");
      });
    });
    describe("alpha", function() {
      it("parses one alphabetical character", function() {
        var alphabet = "abcdefghijklmnopqrstuvwxyz";
        for (var i = 0; i < alphabet.length; i++) {
          assert.equal(parse(mona.alpha(), alphabet.charAt(i)),
                       alphabet.charAt(i));
        }
        assert.throws(function() {
          parse(mona.alpha(), "0");
        }, /expected alpha/);
      });
    });
    describe("digit", function() {
      it("succeeds if the next token is a digit character", function() {
        assert.equal(parse(mona.digit(), "1"), "1");
        assert.throws(function() {
          parse(mona.digit(), "z");
        });
      });
      it("accepts an optional base/radix argument", function() {
        assert.equal(parse(mona.digit(16), "f"), "f");
      });
      it("defaults to base 10", function() {
        assert.equal(parse(mona.digit(), "0"), "0");
        assert.equal(parse(mona.digit(), "9"), "9");
        assert.throws(function() {
          parse(mona.digit(), "a");
        });
      });
    });
    describe("alphanum", function() {
      it("parses either an alphabetical character or a digit", function() {
        assert.equal(parse(mona.alphanum(), "x"), "x");
        assert.equal(parse(mona.alphanum(), "7"), "7");
        assert.throws(function() {
          parse(mona.alphanum(), "?");
        }, /expected alphanum/);
      });
      it("accepts an optional base/radix argument", function() {
        assert.equal(parse(mona.alphanum(16), "f"), "f");
      });
      it("defaults to base 10", function() {
        assert.equal(parse(mona.alphanum(), "0"), "0");
        assert.equal(parse(mona.alphanum(), "9"), "9");
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
        assert.equal(parse(mona.text(mona.string("a")), "aaaab"), "aaaa");
      });
      it("defaults to token()", function() {
        assert.equal(parse(mona.text(), "abcde"), "abcde");
      });
      it("accepts a minumum and maximum option", function() {
        assert.equal(parse(mona.text(mona.token(), {max: 3}),
                           "aaaa"),
                     "aaa");
      });
    });
    describe("trim", function() {
      it("trims leading and trailing whitespace", function() {
        assert.equal(parse(mona.trim(mona.token()), "   a    "), "a");
        assert.equal(parse(mona.trim(mona.token()), "a    "), "a");
        assert.equal(parse(mona.trim(mona.token()), "   a"), "a");
      });
    });
    describe("trimLeft", function() {
      it("trims leading whitespace only", function() {
        var parser = mona.between(mona.string("|"),
                                  mona.string("|"),
                                  mona.trimLeft(mona.string("a")));
        assert.equal(parse(parser, "|   a|"), "a");
        assert.throws(function() {
          parse(parser, "|   a    |");
        }, /expected string matching \{\|\}/);
      });
    });
    describe("trimRight", function() {
      it("trims trailing whitespace only", function() {
        var parser = mona.between(mona.string("|"),
                                  mona.string("|"),
                                  mona.trimRight(mona.string("a")));
        assert.equal(parse(parser, "|a     |"), "a");
        assert.throws(function() {
          parse(parser, "|   a    |");
        }, /expected string matching \{\a\}/);
      });
    });
  });
  describe("number-related parsers", function() {
    describe("natural", function() {
      it("matches a natural number without a sign", function() {
        assert.equal(parse(mona.natural(), "1234"), 1234);
        assert.throws(function() {
          parse(mona.natural(), "-123");
        });
      });
      it("accepts a base/radix argument", function() {
        assert.equal(parse(mona.natural(2), "101110"),
                     parseInt("101110", 2));
        assert.equal(parse(mona.natural(16), "deadbeef"),
                     0xdeadbeef);
      });
    });
    describe("integer", function() {
      it("matches a positive or negative possibly-signed integer", function() {
        assert.equal(parse(mona.integer(), "1234"), 1234);
        assert.equal(parse(mona.integer(), "+1234"), 1234);
        assert.equal(parse(mona.integer(), "-1234"), -1234);
      });
      it("accepts a base/radix argument", function() {
        assert.equal(parse(mona.integer(2), "101110"), parseInt("101110", 2));
        assert.equal(parse(mona.integer(16), "deadbeef"), 0xdeadbeef);
        assert.equal(parse(mona.integer(16), "-deadbeef"), -0xdeadbeef);
      });
    });
    describe("float", function() {
      it("parses a number with decimal points into a JS float", function() {
        assert.equal(parse(mona.float(), "1.2"), 1.2);
        assert.equal(parse(mona.float(), "-1.25"), -1.25);
        assert.equal(parse(mona.float(), "+1.25"), 1.25);
      });
      it("supports e-notation", function() {
        assert.equal(parse(mona.float(), "1.25e10"), 1.25e10);
        assert.equal(parse(mona.float(), "1.25e3"), 1.25e3);
        assert.equal(parse(mona.float(), "1.25e-3"), 1.25e-3);
      });
    });
  });
});
