"use strict";

var mona = require("../src/mona");

function sexp() {
  return mona.or(list(), atom());
}

function atom() {
  return mona.integer();
}

function list() {
  return mona.between(mona.character("("),
                      mona.character(")"),
                      mona.separatedBy(mona.delay(sexp),
                                       mona.spaces()));
}

function runExample() {
  var text = "(1 23 (345 6) () 789 10)";
  console.log("Parsing ", text, " => ", mona.parse(sexp(), text));
}
if (module.id === ".") runExample();
