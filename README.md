# mona

[![Travis](https://img.shields.io/travis/zkat/mona.svg)]()
[![npm version](https://img.shields.io/npm/v/mona.svg)]()
[![license](https://img.shields.io/npm/l/mona.svg)]()

`mona` is a Javascript library for easily writing reusable, composable parsers.
It makes parsing complex grammars easy and fun!

With `mona`, you simply write some Javascript functions that parse small pieces
of text and return any Javascript value, and then you glue them together into
big, intricate parsers using `combinators` to... combine them! No custom syntax
or separate files or separate command line tools to run: you can integrate this
into your regular JS app!

It even makes it really really easy to give excellent error messages, including
line and column numbers, and messages with what was expected, with little to no
effort!

New parsers are hella easy to write -- give it a shot! It's pretty fun!

## Table of Contents

* [Install](#install)
* [Examples](#examples)
* [Documentation](#documentation)
    * [API](#api)
        * [parse](#parse)
        * [parseAsync](#parseasync)
        * [core](#core)
        * [combinators](#combinators)
        * [strings](#strings)
        * [numbers](#numbers)
    * [Gentle Introduction to Monadic Parser Combinators](#gentle-introduction-to-monadic-parser-combinators)

## Install

`$ npm install mona`

You can directly require `mona` through your module loader of choice, or you can
use the prebuilt UMD versions found in the `browser/` directory:

* Node.js/CommonJS - `var mona = require('mona')`
* ES6 Modules/Babel - `import mona from 'mona'`
* AMD - `define(['node_modules/mona/browser/mona'], function (mona) { ... })`
* Global - `<script src=/js/node_modules/mona/browser/mona.min.js></script>`

## Examples

### Parse a series of ints separated by commas

```javascript
function commaInts () {
  return mona.split(mona.integer(), mona.string(','))
}
mona.parse(commaInts, '1,2,3,49829,49,139')
// => [1, 2, 3, 49829, 49, 139]
```

### A simple, readable CSV parser in ~50 lines

```javascript
function parseCSV (text) {
  return mona.parse(csv(), text)
}

function csv () {
  return mona.splitEnd(line(), eol())
}

function line () {
  return mona.split(cell(), mona.string(','))
}

function cell () {
  return mona.or(quotedCell(),
                 mona.text(mona.noneOf(',\n\r')))
}

function quotedCell () {
  return mona.between(mona.string('"'),
                      mona.string('"'),
                      mona.text(quotedChar()))
}

function quotedChar () {
  return mona.or(mona.noneOf('"'),
                 mona.and(mona.string('""'),
                          mona.value('"')))
}

function eol () {
  var str = mona.string
  return mona.or(str('\n\r'),
                 str('\r\n'),
                 str('\n'),
                 str('\r'),
                 'end of line')
}

parseCSV('foo,"bar"\n"b""az",quux\n')
// => [['foo', 'bar'], ['b"az', 'quux']]
```

## Documentation

### API

`mona` is a package composed of multiple other packages, re-exported through a
single module. You have the option of installing `mona` from npm directly, or
installing any of the subpackages and using those independently.

This API section is organized such that each parser or function is listed under
the subpackage it belongs to, along with the name of the npm package you can
find it in.

### Gentle Introduction to Monadic Parser Combinators

`mona` works by composing functions called `parsers`. These functions are
created by so-called `parser constructors`. Most of the `mona` API exposes these
constructors.

#### Primitive parsers

There are three primitive parsers in mona: `value()`, `fail()`, and
`token()`.

* `value()` - results in its single argument, without consuming input.
* `fail()` - fails unconditionally, without consuming input.
* `token()` - consumes a single token, or character, from the input.

Simply creating a parser is not enough to execute a parser, though.  We need to
use the `parse` function, to actually execute the parser on an input string:

```javascript
mona.parse(mona.value('foo'), '') // => 'foo'
mona.parse(mona.fail(), '') // => throws an exception
mona.parse(mona.token(), 'a') // => 'a'
mona.parse(mona.token(), '') // => error, unexpected eof
```

#### The primitive combinator

These three parsers do not seem to get us much of anywhere, so we introduce our
first *combinator*: `bind()`. `bind()` accepts a parser as its first argument,
and a function as its second argument. The function will be called with the
parser's result value *only if the parser succeeds*. The function *must then
return another parser*, which will be used to determine `bind()`'s value:

```javascript
mona.parse(mona.bind(mona.token(), function (character) {
  if (character === 'a') {
    return mona.value('found an "a"!')
  } else {
    return mona.fail()
  }
}), 'a') // => 'found an "a"!'
```

#### Basic utility combinators

`bind()`, of course, is just the beginning. Now that we know we can combine
parsers, we can play with some of `mona`'s fancier parsers and combinators. For
example, the `or` combinator resolves to the first parser that succeeds, in the
order they were provided, or fails if none of those parsers succeeded:

```javascript
mona.parse(mona.or(mona.fail('nope'),
                   mona.fail('nope again'),
                   mona.value('this one!')),
           '')
// => 'this one!'
```

```javascript
mona.parse(mona.or(mona.fail('nope'),
                   mona.value('this one!'),
                   mona.value('but not this one')),
           '')
// => 'this one!'
```

`and()` is another basic combinator. It succeeds only if all its parsers
succeed, and resolves to the value of the last parser. Otherwise, it fails with
the first failed parser's error.

```javascript
mona.parse(mona.and(mona.value('foo'),
                    mona.value('bar')),
           '')
// => 'bar'
```

Finally, there's the `not()` combinator. It's important to note that, regardless
of its argument's result, `not()` will not consume input... it must be combined
with something that does.

```javascript
mona.parse(mona.and(mona.not(mona.token()), mona.value('end of input')), '')
// => 'end of input'
```

#### Matching strings

The `string()` parser might come in handy: It results in a string matching a given
string:

```javascript
mona.parse(mona.string('foo'), 'foo')
// => 'foo'
```

And can of course be combined with some combinator to provide an alternative
value:

```javascript
monap.parse(mona.and(mona.string('foo'), mona.value('got a foo!')), 'foo')
// => 'got a foo!'
```

The `is()` parser can also be used to succeed or fail depending on whether the
next token matches a particular predicate:

```javascript
mona.parse(mona.is(function (x) { return x === 'a' }), 'a')
// => 'a'
```

#### Sequential syntax

Writing parsers by composing functions is perfectly fine and natural, and you
might get quite a feel for it, but sometimes it's nice to have something that
feels a bit more procedural. For situations like that, you can use `sequence`:

```javascript
function parenthesized () {
  return mona.sequence(function (s) {
    // The s() function passed into `sequence()`'s callback
    // must be used to execute any parsers within the sequence.
    var open = s(mona.string('('))
    // open === '(' if the `string()` parser succeeds.
    var data = s(mona.token())
    var close = s(mona.string(')'))
    // The `sequence()` callback must return another parser, just like `bind()`.
    // Also like `bind()`, it can `return fail()` to fail the parser.
    return mona.value(data)
  })
}
mona.parse(parenthesized(), '(a)')
// => 'a'
```

We can generalize this parser into a combinator by accepting an arbitrary parser
as an input:

```javascript
function parenthesized (parser) {
  return mona.sequence(function (s) {
    var open = s(mona.string('('))
    var data = s(parser) // Use the parser here!
    var close = s(mona.string(')'))
    return mona.value(data)
  })
}
mona.parse(parenthesized(mona.string('foo!')), '(foo!)')
// => 'foo!'
```

Note that if the given parser consumes closing parentheses, this will fail:

```javascript
mona.parse(parenthesized(mona.string('something)'), '(something)')
// => error, unexpected EOF
```

#### The Rest of It

Once you've got the basics down, you can explore [`mona`'s API](#api) for more
interesting parsers. A variety of useful parsers are available for use, such as
`collect()`, which collects the results of a parser into an array until the
parser fails, or `float()`, which parses a floating-point number and returns the
actual number. For more examples on how to use `mona` to create parsers for
actual formats, take a look in the `examples/` directory included with the
project, which includes examples for `json` and `csv`.
