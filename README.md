# Mona [![Build Status](https://travis-ci.org/zkat/mona.png)](https://travis-ci.org/zkat/mona)

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
function sexp() {
  return mona.or(list(), atom());
}

function atom() {
  return mona.or(mona.integer(), symbol());
}

function symbol() {
  return mona.text(symbolToken(), {min: 1});
}

function symbolToken() {
  return mona.unless(mona.space(),
                     mona.noneOf("()"));
}

function list() {
  return mona.between(mona.string("("),
                      mona.string(")"),
                      mona.separatedBy(mona.delay(sexp),
                                       mona.spaces()));
}

mona.parse(sexp(), "(1 23 (foo 6) () bar! -10 baz)");
// => [1, 23, ['foo',6], [], 'bar!', -10, 'baz']
```

# Introduction

Writing parsers with `mona` involves writing a number of individually-testable
`parser constructors` which return parsers that mona can then execute. These
smaller parsers are then combined in various ways, even provided as part of
libraries, in order to compose much larger, intricate parsers.

`mona` tries to do a good job at reporting parsing failures when and where they
happen, and provides a number of facilities for reporting errors in a
human-readable way.

`mona` is based on [smug](https://github.com/drewc/smug), and Haskell's
[Parsec](http://www.haskell.org/haskellwiki/Parsec) library.

### Features

* Short, readable, composable parsers
* Includes a library of useful parsers and combinators
* Returns arbitrary data from parsers, not necessarily a plain parse tree
* Human-readable error messages with source locations
* Facilities for improving your own parsers' error reports
* Supports context-sensitive parsing
* Supports asynchronous, incremental parsing with `parseAsync`. Useful for very
  large files or parsing from streams
* Node.js stream API support with `parseStream`, including piping support
* Heavy test coverage (see `src/mona-test.js`)
* Fully documented API

### Documentation

Documentation of the latest released version is
[available here](http://zkat.github.io/mona). Docs are also included with
the `npm` release. You can build the docs yourself by running
`npm install && make docs` in the root of the source directory.

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
