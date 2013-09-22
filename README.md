# Mona [![Build Status](https://travis-ci.org/zkat/mona.png)](https://travis-ci.org/zkat/mona)

`mona` is
[hosted at Github](http://github.com/zkat/mona). `mona` is a
public domain work, dedicated using
[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Feel
free to do whatever you want with it.

# Quickstart

### Browser support

[![browser support](http://ci.testling.com/zkat/mona.png)](http://ci.testling.com/zkat/mona)

### Install

`mona` is available through both [NPM](http://npmjs.org) and
[Bower](http://bower.io).

`$ npm install mona-parser`
or
`$ bower install mona`

### Example

```javascript
function sexp() {
  // Matches a list or ana atom.
  // Returns the value resulting from whichever matched.
  return mona.or(list(), atom());
}

function atom() {
  // Matches a valid integer and returns the integer itself.
  return mona.integer();
}

function list() {
  // Helpful syntax for sequencing operations.
  // s() must be called on each parser you wish to apply.
  // The entire sequence fails if any of them fail unexpectedly.
  return mona.sequence(function(s) {
    s(mona.character("("));
    // s() returns the parser's returned value.
    var values = s(mona.separatedBy(sexp(), mona.spaces()));
    s(mona.character(")"));
    // A parser such as mona.value() must be used in the return.
    return mona.value(values);
  });
}
mona.parse(sexp(), "(1 2 (3 4) 5)") => [1, 2, [3, 4], 5]
```

# Introduction

`mona` is a monadic parser combinator library, which is just a really fancy
term for a parsing library that makes it really easy to write simple or
complex parsers, and compose them together easily to generate even more
complex parsers.

`mona` supports unbounded lookahead and makes a best effort to report what went
wrong and where it happened when parser failures occur.

`mona` is based on [smug](https://github.com/drewc/smug), and Haskell's
[Parsec](http://www.haskell.org/haskellwiki/Parsec) library.

### Documentation

The API is fully documented, and there's a full test suite available for
reference. After building, the documentation will be available by visiting
`docs/index.html`

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
