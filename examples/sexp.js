'use strict'

var mona = require('..')

function sexp () {
  return mona.or(list(), atom())
}

function atom () {
  return mona.or(mona.integer(), symbol())
}

function symbol () {
  return mona.text(symbolToken(), {min: 1})
}

function symbolToken () {
  return mona.unless(mona.space(),
                     mona.noneOf('()'))
}

function list () {
  return mona.between(mona.string('('),
                      mona.string(')'),
                      mona.split(mona.delay(sexp), mona.spaces()))
}

function read (string) {
  return mona.parse(sexp(), string)
}
module.exports.read = read

function runExample () {
  var text = '(1 23 (foo 6) () bar! -10 baz)'
  console.log('Parsing ', text, ' => ', read(text))

  // Defining a mini-lisp evaluator
  function add () { // eslint-disable-line
    return [].reduce.call(arguments, function (acc, x) {
      return acc + x
    }, 0)
  }
  function mult () { // eslint-disable-line
    return [].reduce.call(arguments, function (acc, x) {
      return acc * x
    }, 1)
  }
  var magicMultiplier = 2 // eslint-disable-line
  function lispEval (code) {
    if (({}).toString.call(code) === '[object Array]') {
      return eval(code[0]).apply(null, code.slice(1).map(lispEval)) // eslint-disable-line
    } else {
      return eval(code) // eslint-disable-line
    }
  }

  var lisp = '(add 2 (mult 8 magicMultiplier 2) 8)'
  console.log('Lisping ', lisp, ' => ', lispEval(read(lisp)))
}
if (module.id === '.') runExample()
