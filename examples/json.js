"use strict";

var mona = require("../src/mona");

/*
 * JSON in JS, without eval(), with nice error reporting.
 *
 * Implements the grammar as described in http://www.json.org/
 */
function json() {
  return mona.trim(
    mona.or(object(), array(), bool(), nil(), string(), number()));
}

function object() {
  return mona.map(function(pairs) {
    var obj = {};
    pairs.forEach(function(p) {
      obj[p[0]] = p[1];
    });
    return obj;
  }, mona.between(mona.trim(mona.string("{")),
                  mona.trim(mona.string("}")),
                  mona.split(keyAndValue(),
                             mona.trim(mona.string(",")))));
}

function keyAndValue() {
  return mona.sequence(function(s) {
    var key = s(string());
    s(mona.trim(mona.string(":")));
    var value = s(json());
    return mona.value([key, value]);
  });
}

function array() {
  return mona.between(mona.trim(mona.string("[")),
                      mona.trim(mona.string("]")),
                      mona.split(mona.delay(json),
                                 mona.trim(mona.string(","))));
}

function bool() {
  return mona.map(function(str) {
    return str === "true";
  }, mona.or(mona.string("true"), mona.string("false")), "boolean");
}

function nil() {
  return mona.label(mona.and(mona.string("null"), mona.value(null)), "null");
}

function number() {
  return mona.float();
}

function string() {
  return mona.between(mona.string("\""),
                      mona.label(mona.string("\""),
                                 "closing double-quote"),
                      mona.text(mona.or(escaped(),
                                        mona.noneOf("\""))));
}

function escaped() {
  return mona.and(mona.string("\\"),
                  mona.or(simpleEscape(),
                          unicodeHex(),
                          mona.token()));
}

var escapeTable = {b: "\b", f: "\f", n: "\n", r: "\r", t: "\t"};
function simpleEscape() {
  return mona.map(function(x) {
    return escapeTable[x];
  }, mona.oneOf("bfnrt"));
}

function unicodeHex() {
  return mona.map(function(digits) {
    return String.fromCharCode("0x"+digits);
  }, mona.and(mona.string("u"), mona.text(mona.digit(16), {min: 4, max: 4})));
}

function parseJSON(text) {
  return mona.parse(json(), text);
}

function runExample() {
  var txt = JSON.stringify([{
    foo: 1,
    bar: "baz",
    quux: ["a", -5, {x: 1}]
  }]);
  console.log("Parsing:\n", txt,
              "=>\n", JSON.stringify(parseJSON(txt)));
}
if (module.id === ".") runExample();

module.exports = {
  parseJSON: parseJSON,
  runExample: runExample
};
