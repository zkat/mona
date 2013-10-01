/* global describe, it */
"use strict";

var assert = require("assert"),
    moment = require("moment"),
    parseCSV = require("./csv").parseCSV;

describe("csv", function() {
  describe("parseCSV()", function() {
    it("parses a single row into an array of cells", function() {
      assert.deepEqual(parseCSV("foo,bar,baz\n"), [["foo", "bar", "baz"]]);
    });
    it("parses multiple lines into arrays of cells", function() {
      assert.deepEqual(parseCSV("foo\nbar\nbaz\n"),
                       [["foo"], ["bar"], ["baz"]]);
    });
    it("accepts mixed types of newlines", function() {
      assert.deepEqual(parseCSV("foo\rbar\r\nbaz\n\r\quux\nderp\n"),
                       [["foo"], ["bar"], ["baz"], ["quux"], ["derp"]]);
    });
    it("handles quoted cells", function() {
      assert.deepEqual(parseCSV('"foo\nbar",baz\nquux\n'),
                       [["foo\nbar", "baz"],
                        ["quux"]]);
    });
    it("handles escaped quotes", function() {
      assert.deepEqual(parseCSV('"foo""bar"\n'), [['foo"bar']]);
    });
    it.skip("reports a nice error message when a quote is missing", function() {
      assert.throws(function() {
        parseCSV('"foo');
      }, /closing quote/);
    });
  });
});
