/* global describe, it */
"use strict";

var assert = require("assert"),
    moment = require("moment"),
    parseJSON = require("./json").parseJSON;

function testJSON(data) {
  assert.deepEqual(parseJSON(JSON.stringify(data)), data);
}
describe("json", function() {
  describe("parseJSON()", function() {
    describe("object()", function() {
      it("parses simple objects", function() {
        testJSON({foo: {}});
      });
      it("parses empty objects", function() {
        testJSON({});
      });
      it("parses nested objects", function() {
        testJSON({foo: {bar: {baz: {}}}});
      });
      it.skip("reports syntax errors", function() {
        assert.throws(function() {
          parseJSON("{foo}");
        }, /column 2\) [^\{]+{{}}\n[^\{]+{"}/);
        assert.throws(function() {
          parseJSON('{"foo"}');
        }, /expected string matching {:}/);
      });
    });
    describe("array()", function() {
      it("parses empty arrays", function() {
        testJSON([]);
      });
      it("parses nested arrays", function() {
        testJSON([[[[[]]]]]);
      });
      it("parses arrays with multiple items", function() {
        testJSON([1, 2, {}, 3, "foo"]);
      });
      it.skip("reports comma-related errors", function() {
        assert.throws(function() {
          parseJSON("[1,]");
        }, /foo/);
      });
    });
    describe("bool()", function() {
      it("parses a boolean value", function() {
        testJSON(true);
        testJSON(false);
        testJSON({foo: true, bar: false, baz: "false"});
      });
    });
    describe("nil()", function() {
      it("parses null", function() {
        testJSON(null);
        testJSON({foo: "null", bar: null});
      });
    });
    describe("string()", function() {
      it("parses simple strings", function() {
        testJSON("foo bar baz 123");
        testJSON({foo: "foo bar baz 123"});
      });
      it("handles escaped characters", function() {
        testJSON("\b\f\n\r\t\\");
        testJSON("\u1234");
      });
    });
    describe("number()", function() {
      it("parses integers", function() {
        testJSON("1234");
        testJSON("-1234");
        testJSON("+1234");
      });
      it("parses simple floats", function() {
        testJSON("123.456");
        testJSON("+123.456");
        testJSON("-123.456");
      });
      it("parses floats with the e", function() {
        testJSON("1234e10");
        testJSON("1234.5e10");
        testJSON("1234.5e-10");
      });
    });
  });
});
