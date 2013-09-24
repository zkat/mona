"use strict";

var mona = require("../src/mona");

function sexp() {
  return mona.or(list(), atom());
}

function atom() {
  return mona.or(mona.integer(), symbol());
}

function symbol() {
  return mona.text(symbolToken());
}

function symbolToken() {
  return mona.noneOf("() \n\t\r");
}

function list() {
  return mona.between(mona.character("("),
                      mona.character(")"),
                      mona.separatedBy(mona.delay(sexp),
                                       mona.spaces()));
}

function read(string) {
  return mona.parse(sexp(), string);
}
module.exports.read = read;

function runExample() {
  var text = "(1 23 (foo 6) () bar! -10 baz)";
  console.log("Parsing ", text, " => ", read(text));

  // Defining a mini-lisp evaluator
  function add() {
    return [].reduce.call(arguments, function(acc, x) {
      return acc + x;
    }, 0);
  };
  function mult() {
    return [].reduce.call(arguments, function(acc, x) {
      return acc * x;
    }, 1);
  };
  var magicMultiplier = 2;
  function lispEval(code) {
    if (({}).toString.call(code) === "[object Array]") {
      return eval(code[0]).apply(null, code.slice(1).map(lispEval));
    } else {
      return eval(code);
    }
  }

  var lisp = "(add 2 (mult 8 magicMultiplier 2) 8)";
  console.log("Lisping ", lisp, " => ", lispEval(read(lisp)));
}
if (module.id === ".") runExample();
