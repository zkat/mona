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

And use `build/mona` or `build/mona.min.js` in your application.

### Example

```
Look at examples/date.js :)
```

# Introduction

`mona` is a monadic parser combinator library, which is just a really fancy
term for a parsing library that makes it really easy to write simple or
complex parsers, and compose them together easily to generate even more
complex parsers.

`mona` is based on [smug](https://github.com/drewc/smug), which in turn is
somewhat based on Haskell's
[Parser](http://www.haskell.org/haskellwiki/Parsec) library.
