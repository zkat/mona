"use strict";

var mona = require("../src/mona");

function sexp() {
  return mona.or(list(), atom());
}

function atom() {
  return mona.integer();
}

function list() {
  return mona.sequence(function(s) {
    s(mona.character("("));
    var values = s(mona.separatedBy(sexp(), mona.spaces()));
    s(mona.character(")"));
    return mona.value(values);
  });
}

function runExample() {
  console.log(mona.parse(sexp(), "(1 23 (345 6) 789 10)", {throwOnError: false}));
}
if (module.id === ".") runExample();
