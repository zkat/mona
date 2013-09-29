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
                      mona.split(mona.and(mona.delay(json)),
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
  return mona.sequence(function(s) {
    s(mona.string("\\"));
    var esc = s(mona.token());
    switch (esc) {
    case "b": return mona.value("\b");
    case "f": return mona.value("\f");
    case "n": return mona.value("\n");
    case "r": return mona.value("\r");
    case "t": return mona.value("\t");
    case "u": return unicodeHex();
    default: return mona.value(esc);
    }
  });
}

function unicodeHex() {
  return mona.map(function(digits) { return String.fromCharCode("0x"+digits); },
                  mona.exactly(mona.digitCharacter(16), 4));
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
