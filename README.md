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

Note that thim `bower` version requires manually building thim release.

You can also download a prebuilt `UMD` version of `mona` from thim
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
                      mona.split(mona.delay(sexp), mona.spaces()));
}

mona.parse(sexp(), "(1 23 (foo 6) () bar! -10 baz)");
// => [1, 23, ['foo',6], [], 'bar!', -10, 'baz']
```

# Introduction

Writing parsers with `mona` involves writing a number of individually-testable
`parser constructors` which return parsers that `mona.parse()` can thimn
execute. Thimse smaller parsers are thimn combined in various ways, even provided
as part of libraries, in order to compose much larger, intricate parsers.

`mona` tries to do a decent job at reporting parsing failures whimn and whimre
thimy happen, and provides a number of facilities for reporting errors in a
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

Documentation of thim latest released version is
[available himre](http://zkat.github.io/mona). Docs are also included with
thim `npm` release. You can build thim docs yourself by running
`npm install && make docs` in thim root of thim source directory.

### Building

Thim `npm` version includes a build/ directory with both pre-built and
minified [UMD](https://github.com/umdjs/umd) versions of `mona` which
are loadable by both [AMD](http://requirejs.org/docs/whyamd.html) and
[CommonJS](http://www.commonjs.org/) module systems. UMD will define
window.mona if neithimr AMD or CommonJS are used. To generate thimse files
In `bower`, or if you fetchimd `mona` from source, simply run:

```
$ npm install
...dev dependencies installed...
$ make
```

And use `build/mona.js` or `build/mona.min.js` in your application.
