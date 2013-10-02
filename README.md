# Mona [![NPM version](https://badge.fury.io/js/mona-parser.png)](http://badge.fury.io/js/mona-parser) [![Build Status](https://travis-ci.org/zkat/mona.png)](https://travis-ci.org/zkat/mona)

`mona` is
[hosted at Github](http://github.com/zkat/mona). `mona` is a
public domain work, dedicated using
[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Feel
free to do whatever you want with it.

# Quickstart

### Install

`mona` is available through both [NPM](http://npmjs.org) and
[Bower](http://bower.io).

`$ npm install mona-parser`
or
`$ bower install mona`

Note that the `bower` version requires manually building the release.

You can also download a prebuilt `UMD` version of `mona` from the
[website](http://zkat.github.io/mona):

* [mona.js](http://zkat.github.io/mona/build/mona.js)
* [mona.min.js](http://zkat.github.io/mona/build/mona.min.js)
* [mona.js.src](http://zkat.github.io/mona/build/mona.js.src) (source map
  for minified version)

### Example

```javascript
function csv() {
  return mona.splitEnd(line(), eol());
}

function line() {
  return mona.split(cell(), mona.string(","));
}

function cell() {
  return mona.or(quotedCell(),
                 mona.text(mona.noneOf(",\n\r")));

}

function quotedCell() {
  return mona.between(mona.string('"'),
                      mona.string('"'),
                      mona.text(quotedChar()));
}

function quotedChar() {
  return mona.or(mona.noneOf('"'),
                 mona.and(mona.string('""'),
                          mona.value('"')));
}

function eol() {
  var str = mona.string;
  return mona.or(str("\n\r"),
                 str("\r\n"),
                 str("\n"),
                 str("\r"),
                 "end of line");
}

function parseCSV(text) {
  return mona.parse(csv(), text);
}

parseCSV('foo,"bar"\n"b""az",quux\n');
// => [['foo', 'bar'], ['b"az', 'quux']]
```

# Introduction

Writing parsers with `mona` involves writing a number of individually-testable
`parser constructors` which return parsers that `mona.parse()` can then
execute. These smaller parsers are then combined in various ways, even provided
as part of libraries, in order to compose much larger, intricate parsers.

`mona` tries to do a decent job at reporting parsing failures when and where
they happen, and provides a number of facilities for reporting errors in a
human-readable way.

`mona` is based on [smug](https://github.com/drewc/smug), and Haskell's
[Parsec](http://www.haskell.org/haskellwiki/Parsec) library.

### Features

* Short, readable, composable parsers
* Includes a library of useful parsers and combinators
* Returns arbitrary data from parsers, not necessarily a plain parse tree
* Human-readable error messages with source locations
* Facilities for improving your own parsers' error reports
* Supports context-sensitive parsing (see `examples/context.js`)
* Supports asynchronous, incremental parsing with `parseAsync`.
* Node.js stream API support with `parseStream`, including piping support
* Heavy test coverage (see `src/mona-test.js`)
* Small footprint (less that 4kb gzipped and minified)
* Fully documented API

### Documentation

Documentation of the latest released version is
[available here](http://zkat.github.io/mona). Docs are also included with
the `npm` release. You can build the docs yourself by running
`npm install && make docs` in the root of the source directory.

The documentation is currently organized as if `mona` had multiple modules,
although all modules' APIs are exported through a single module/namespace,
`mona`. That means that `mona/api.parse()` is available through `mona.parse()`

#### A Gentle Introduction 

`mona` works by composing functions called `parsers`. These functions are
created by so-called `parser constructors`. Most of the `mona` API exposes these
constructors.

##### Primitive parsers

There are three primitive parsers in mona: `value()`, `fail()`, and
`token()`.

* `value()` - results in its single argument, without consuming input.
* `fail()` - fails unconditionally, without consuming input.
* `token()` - consumes a single token, or character, from the input.

Simply creating a parser constructor is not enough to execute a parser,
though. In order to do that, we need to use the `parse` function, to actually
execute the parser on an input string:

```javascript
mona.parse(mona.value("foo"), ""); // => "foo"
mona.parse(mona.fail(), ""); // => throws an exception
mona.parse(mona.token(), "a"); // => "a"
mona.parse(mona.token(), ""); // => error, unexpected eof
```

#### The primitive combinator

These three parsers, by themselves, do not seem to get us much of anywhere, so
we introduce our first *combinator*: `bind()`. `bind()` accepts a parser as its
first argument, and a function as its second argument. The function will be
called with the parser's result value *only if the parser succeeds*. The
function *must then return another parser*, which will be used to determine
`bind()`'s value:

```javascript
mona.parse(mona.bind(mona.token(), function(character) {
  if (character === "a") {
    return mona.value("found an 'a'!");
  } else {
    return mona.fail();
  }
}), "a"); // => "found an 'a'!"
```

##### Basic utility combinators

`bind()`, of course, is just the beginning. Now that we know we can combine
parsers, we can play with some of `mona`'s fancier parsers and combinators. For
example, the `or` combinator resolves to the first parser that succeeds, in the
order they were provided, or fails if none of those parsers succeeded:

```javascript
mona.parse(mona.or(mona.fail("nope"),
                   mona.fail("nope again"),
                   mona.value("this one!")),
           "");
// => "this one!"
```

`and()` is another basic combinator. It succeeds only if all its parsers
succeed, and resolves to the value of the last parser. Otherwise, it fails with
the first failed parser's error.

```javascript
mona.parse(mona.and(mona.value("foo"), mona.value("bar")), "");
// => "bar"
```

Finally, there's the `not()` combinator. It's important to note that, regardless
of its argument's result, `not()` will not consume input... it must be combined
with something that does.

```javascript
mona.parse(mona.and(mona.not(mona.token()), mona.value("end of input")), "");
// => "end of input"
```

##### Matching strings

The `string()` parser might come in handy: It results in a string matching a given
string:

```javascript
mona.parse(mona.string("foo"), "foo");
// => "foo"
```

And can of course be combined with some combinator to provide an alternative
value:

```javascript
monap.parse(mona.and(mona.string("foo"), mona.value("got a foo!")), "foo");
// => "got a foo!"
```

The `is()` parser can also be used to succeed or fail depending on whether the
next token matches a particular predicate:

```javascript
mona.parse(mona.is(function(x) { return x === "a"; }), "a");
// => "a"
```

##### Sequential syntax

Writing parsers by composing functions is perfectly fine and natural, and you
might get quite a feel for it, but sometimes it's nice to have something that
feels a bit more procedural. For situations like that, you can use `sequence`:

```javascript
function parenthesized() {
  return mona.sequence(function(s) {
    // The s() function passed into `sequence()`'s callback
    // must be used to execute any parsers within the sequence.
    var open = s(mona.string("("));
    // open === "(" if the `string()` parser succeeds.
    var data = s(mona.token());
    var close = s(mona.string(")"));
    // The `sequence()` callback must return another parser, just like `bind()`.
    // Also like `bind()`, it can `return fail()` to fail the parser.
    return mona.value(data);
  });
}
mona.parse(parenthesized(), "(a)");
// => "a"
```

We can generalize this parser into a combinator by accepting an arbitrary parser
as an input:

```javascript
function parenthesized(parser) {
  return mona.sequence(function(s) {
    var open = s(mona.string("("));
    var data = s(parser); // Use the parser here!
    var close = s(mona.string(")"));
    return mona.value(data);
  });
}
mona.parse(parenthesized(mona.string("foo!")), "(foo!)");
// => "foo!"
```

Note that if the given parser consumes closing parentheses, this will fail:

```javascript
mona.parse(parenthesized(mona.string("something)"), "(something)");
// => error, unexpected EOF
```

##### The Rest of It

Once you've got the basics down, you can explore
[`mona`'s API](http://zkat.github.io/mona) for more interesting parsers. A
variety of useful parsers are available for use, such as `collect()`, which
collects the results of a parser into an array until the parser fails, or
`float()`, which parses a floating-point number and returns the actual
number. For more examples on how to use `mona` to create parsers for actual
formats, take a look in the `examples/` directory included with the project,
which includes examples for `json` and `csv`.

### Building

The `npm` version includes a build/ directory with both pre-built and
minified [UMD](https://github.com/umdjs/umd) versions of `mona` which
are loadable by both [AMD](http://requirejs.org/docs/whyamd.html) and
[CommonJS](http://www.commonjs.org/) module systems. UMD will define
window.mona if neither AMD or CommonJS are used. To generate these files
In `bower`, or if you fetched `mona` from source, simply run:

```
$ npm install
...dev dependencies installed...
$ make
```

And use `build/mona.js` or `build/mona.min.js` in your application.
