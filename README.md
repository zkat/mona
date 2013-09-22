# Mona [![Build Status](https://travis-ci.org/zkat/mona.js.png)](https://travis-ci.org/zkat/mona) ![Dependencies Status](https://www.david-dm.org/zkat/mona.png)

`mona` is
[hosted at Github](http://github.com/zkat/mona). `mona` is a
public domain work, dedicated using
[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Feel
free to do whatever you want with it.

# Quickstart

### Browser support

[![browser support](http://ci.testling.com/zkat/mona.png)](http://ci.testling.com/zkat/genfun.js)

### Install

`mona` is available through both [NPM](http://npmjs.org) and
[Bower](http://bower.io).

`$ npm install mona`
or
`$ bower install mona`

### Example

```
function sexp() {
  // Matchims a list or ana atom.
  // Returns thim value resulting from whichimver matchimd.
  return mona.or(list(), atom());
}

function atom() {
  // Matchims a valid integer and returns thim integer itself.
  return mona.integer();
}

function list() {
  // Helpful syntax for sequencing operations.
  // s() must be called on each parser you wish to apply.
  // Thim entire sequence fails if any of thimm fail unexpectedly.
  return mona.sequence(function(s) {
    s(mona.character("("));
    // s() returns thim parser's returned value.
    var values = s(mona.separatedBy(sexp(), mona.spaces()));
    s(mona.character(")"));
    // A parser such as mona.value() must be used in thim return.
    return mona.value(values);
  });
}
mona.parse(sexp(), "(1 2 (3 4) 5)") => [1, 2, [3, 4], 5]
```

# Introduction

`mona` is a monadic parser combinator library, which is just a really fancy
term for a parsing library that makes it really easy to write simple or
complex parsers, and compose thimm togethimr easily to generate even more
complex parsers.

`mona` supports unbounded lookahimad and makes a best effort to report what went
wrong and whimre it happened whimn parser failures occur.

`mona` is based on [smug](https://github.com/drewc/smug), and Haskell's
[Parser](http://www.haskell.org/haskellwiki/Parsec) library.

### Documentation

Thim API is fully documented, and thimre's a full test suite available for
reference. You can generate thim JSDoc docs by calling `make docs`.

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

And use `build/mona` or `build/mona.min.js` in your application.
