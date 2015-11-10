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
into your regular JS app.

It even makes it really really easy to give excellent error messages, including
line and column numbers, and messages with what was expected, with little to no
effort.

New parsers are hella easy to write -- give it a shot! And if you're familiar
with [Parsec](https://hackage.haskell.org/package/parsec), then you've come to
the right place. :)

## Table of Contents

* [Install](#install)
* [Examples](#examples)
* [API](#api)
    * [@mona/parse](#monaparse)
    * [@mona/parse-async](#monaparse-async)
    * [@mona/core](#monacore)
    * [@mona/combinators](#monacombinators)
    * [@mona/strings](#monastrings)
    * [@mona/numbers](#monanumbers)
* [Gentle Introduction to Monadic Parser Combinators](#gentle-intro-to-monadic-parser-combinators)

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
mona.parse(commaInts(), '1,2,3,49829,49,139')
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

# API

`mona` is a package composed of multiple other packages, re-exported through a
single module. You have the option of installing `mona` from npm directly, or
installing any of the subpackages and using those independently.

This API section is organized such that each parser or function is listed under
the subpackage it belongs to, along with the name of the npm package you can
find it in.

### `@mona/parse`

This module or one of its siblings is needed in order to actually execute
defined parsers. Currently, it exports only a single function: a synchronous
parser runner.

#### `> parse(parser, string[, opts]) -> T`

Synchronously executes a parser on a given string, and returns the resulting
value.

* `{Parser<T>} parser` - The parser to execute.
* `{String} string` - String to parse.
* `{Opts} [opts]` - Options object.
* `{Boolean} [opts.throwOnError=true]` - If truthy, throws a ParserError if the  parser fails and returns ParserState instead of its value.
* `{String} [opts.fileName]` - filename to use for error messages.

```javascript
parse(token(), 'a') // => 'a'
parse(integer(), '123') // => 123
```

### `@mona/parse-async`

This module exports only a single function: an asynchronous parser runner. You
need this module or something similar in order to actually execute your parsers.

#### `> parseAsync(parser, callback[, opts]) -> Handle`

Executes a parser asynchronously, returning an object that can be used to
manage the parser state.

You can feed new data into the parsing process by calling the returned handle's
`#data()` method. Unless the parser given tries to match `eof()`, parsing will
continue until the handle's `#done()` method is called.

* `{Function} parser` - The parser to execute.
* `{AsyncParserCallback} callback` - node-style 2-arg callback executed once
  per successful application of `parser`.
* `{Object} [opts]` - Options object.
* `{String} [opts.fileName]` - filename to use for error messages.

```javascript
var handle = parseAsync(token(), function(tok) {
 console.log('Got a token: ', tok)
})
handle.data('foo')

// logs:
// > Got a token: f
// > Got a token: o
// > Got a token: o
```

### `@mona/core`

The core parser package contains essential and dev-utility parsers that are
intended to be the core of the rest of the parser libraries. Some of these are
very low level, such as `bind()`. Others are not necessarily meant to be used in
production, but can help with debugging, such as `log()`.

#### `> value(val) -> Parser<T>`

Always succeeds with `val` as its value, without consuming any input.

 * `{T} val` - value to use as this parser's value.

 ```javascript
 parse(value('foo'), '') // => 'foo'
 ```

#### `> bind(parser, fun) -> Parser<U>`

Calls `fun` on the value from `parser`. Fails without executing `fun` if
`parser` fails.

* `{Parser<T>} parser` - The parser to execute.

* `{Function(Parser<T>) -> Parser<U>} fun` - Function called with the resulting
  value of `parser`.

```javascript
parse(bind(token(), function (x) {
  return value(x + '!')
}), 'a') // => 'a!'
```

#### `> fail([msg[, type]]) -> Parser<Fail>`

Always fails without consuming input. Automatically includes the line and column
positions in the final `ParserError`.

* `{String} [msg='parser error']` - Message to report with the failure.
* `{String} [type='failure']` - A type to apply to the ParserError.

#### `> label(parser, msg) -> Parser<T>`

Label a `parser` failure by replacing its error messages with `msg`.

* `{Parser<T>} parser` - Parser whose errors to replace.
* `{String} msg` - Error message to replace errors with.

```javascript
parse(token(), '') // => unexpected eof
parse(label(token(), 'thing'), '') // => expected thing
```

#### `> token([count]) -> Parser<String>`

Consumes a single item from the input, or fails with an unexpected eof error if
there is no input left.

* `{Integer} [count=1]` - number of tokens to consume. Must be > 0.

```javascript
parse(token(), 'a') // => 'a'
```

#### `> eof() -> Parser<true>`

Succeeds with a value of `true` if there is no more input to consume.

```javascript
parse(eof(), '') // => true
```

#### `> delay(constructor, ...args) -> Parser<T>`

Delays calling of a parser constructor function until parse-time. Useful for
recursive parsers that would otherwise blow the stack at construction time.

* `{Function(...T) -> Parser<T>} constructor` - A function that returns a
  Parser.
* `{...T} args` - Arguments to apply to the constructor.

```javascript
// The following would usually result in an infinite loop:
function foo() {
 return or(x(), foo())
}
// But you can use delay() to remedy this...
function foo() {
 return or(x(), delay(foo))
}
```

#### `> log(parser, label[, level]) -> Parser<T>`

Logs the `ParserState` resulting from `parser` with a `label`.

* `{Parser<T>} parser` - Parser to wrap.
* `{String} tag` - Tag to use when logging messages.
* `{String} [level='log']` - 'log', 'info', 'debug', 'warn', 'error'.

#### `> map(fun, parser) -> Parser<T>`

Transforms the resulting value of a successful application of its given parser.
This function is a lot like `bind`, except it always succeeds if its parser
succeeds, and is expected to return a transformed value, instead of another
parser.

* `{Function(U) -> T} transformer` - Function called on `parser`'s value. Its return value will be used as the `map` parser's value.
* `{Parser<U>} parser` - Parser that will yield the input value.

```javascript
parse(map(parseFloat, text()), '1234.5') // => 1234.5
```

#### `> tag(parser, tag) -> Parser<Object<T>>`

Results in an object with a single key whose value is the result of the given
parser. This can be useful for when you want to build ASTs or otherwise do some
tagged tree structure.

* `{Parser<T>} parser` - Parser whose value will be tagged.
* `{String} tag` - String to use as the object's key.

```javascript
parse(tag(token(), 'myToken'), 'a') // => {myToken: 'a'}
```

#### `> lookAhead(parser) -> Parser<T>`

Runs a given parser without consuming input, while still returning a success or
failure.

* `{Parser<T>} parser` - Parser to execute.

```javascript
parse(and(lookAhead(token()), token()), 'a') // => 'a'
```

#### `> is(predicate[, parser]) -> Parser<T>`

Succeeds if `predicate` returns a truthy value when called on `parser`'s result.

* `{Function(T) -> Boolean} predicate` - Tests a parser's result.
* `{Parser<T>} [parser=token()]` - Parser to run.

```javascript
parse(is(function (x) { return x === 'a' }), 'a') // => 'a'
```

#### `> isNot(predicate[, parser]) -> Parser<T>`

Succeeds if `predicate` returns a falsy value when called on `parser`'s result.

* `{Function(T) -> Boolean} predicate` - Tests a parser's result.
* `{Parser<T>} [parser=token()]` - Parser to run.

```javascript
parse(isNot(function (x) { return x === 'a' }), 'b') // => 'b'
```

### `@mona/combinators`

Parser combinators are at the very core of what makes something like mona shine:
They are, themselves, parsers, but they are intended to accept _other parsers_
as arguments, that they will then use to do whatever job they're doing.

Combinators do just that: They combine parsers. They act as the glue that lets
you take all those individual parsers that you wrote, and combine them into
increasingly more intricate parsers.

This package contains things like `collect()`, `split()`, and the `or()`/`and()`
pair.

#### `> and(...parsers, lastParser) -> Parser<T>`

Succeeds if all the parsers given to it succeed, using the value of the last
executed parser as its return value.

* `{...Parser<*>} parsers` - Parsers to execute.
* `{Parser<T>} lastParser` - Parser whose result is returned.

```javascript
parse(and(token(), token()), 'ab') // => 'b'
```

#### `> or(...parsers[, label]) -> Parser<T>`

Succeeds if one of the parsers given to it succeeds, using the value of the
first successful parser as its result.

* `{...Parser<T,*>} parsers` - Parsers to execute.
* `{String} [label]` - Label to replace the full message with.

```javascript
parse(or(string('foo'), string('bar')), 'bar') // => 'bar'
```

#### `> maybe(parser) -> Parser<T> | Parser<undefined>`

Returns the result of `parser` if it succeeds, otherwise succeeds with a value
of `undefined` without consuming any input.

* `{Parser<T>} parser` - Parser to try.

```javascript
parse(maybe(token()), 'a') // => 'a'
parse(maybe(token()), '') // => undefined
```

#### `> not(parser) -> Parser<undefined>`

Succeeds if `parser` fails. Does not consume.

* `{Parser<*>} parser` - parser to test.

```javascript
parse(and(not(string('a')), token()), 'b') // => 'b'
```

#### `> unless(notParser, ...moreParsers, lastParser) -> Parser<T>`

Works like `and`, but fails if the first parser given to it succeeds. Like
`and`, it returns the value of the last successful parser.

* `{Parser<*>} notParser` - If this parser succeeds, `unless` will fail.
* `{...Parser} moreParsers` - Rest of the parses to test.
* `{Parser<T>} lastParser` - Parser whose value to return.

```javascript
parse(unless(string('a'), token()), 'b') // => 'b'
```

#### `> sequence(fun) -> Parser<T>`

Put simply, this parser provides a way to write complex parsers while letting
your code look like regular procedural code. You just wrap your parsers with
`s()`, and the rest of your code can be sequential. If the description seems
confusing, see the example.

This parser executes `fun` while handling the `parserState` internally, allowing
the body of `fun` to be written sequentially. The purpose of this parser is to
simulate `do` notation and prevent the need for heavily-nested `bind` calls.

The `fun` callback will receive a function `s` which should be called with
each parser that will be executed, which will update the internal
parserState. The return value of the callback must be a parser.

If any of the parsers fail, sequence will exit immediately, and the entire
sequence will fail with that parser's reason.

* `{Function -> Parser<T>} fun` - A sequence callback function to execute.

```javascript
mona.sequence(function (s) {
  var x = s(mona.token())
  var y = s(mona.string('b'))
  return mona.value(x + y)
})
```

#### `> join(...parsers) -> Parser<Array<T>>`

Succeeds if all the parsers given to it succeed, and results in an array of all
the resulting values, in order.

* `{...Parser<T>} parsers` - One or more parsers to execute.

```javascript
parse(join(alpha(), integer()), 'a1') // => ['a', 1]
```

#### `> followedBy(parser, ...moreParsers) -> Parser<T>`

Returns the result of its first parser if it succeeds, but fails if any of the
following parsers fail.

* `{Parser<T>} parser` - The value of this parser is returned if it succeeds.

* `{...Parser<*>} moreParsers` - These parsers must succeed in order for
  `followedBy` to succeed.

```javascript
parse(followedBy(string('a'), string('b'), string('c')), 'abc') // => 'a'
parse(followedBy(string('a'), string('a')), 'abc') // => expected {a}
```

#### `> split(parser, separator[, opts]) -> Parser<Array<T>>`

Results in an array of successful results of `parser`, divided by the
`separator` parser.

* `{Parser<T>} parser` - Parser for matching and collecting results.
* `{Parser<U>} separator` - Parser for the separator
* `{Opts} [opts]` - Optional options for controlling min/max.
* `{Integer} [opts.min=0]` - Minimum length of the resulting array.
* `{Integer} [opts.max=Infinity]` - Maximum length of the resulting array.

```javascript
parse(split(token(), space()), 'a b c d') // => ['a','b','c','d']
```

#### `> splitEnd(parser, separator[, opts]) -> Parser<Array<T>>`

Results in an array of results that have been successfully parsed by `parser`,
separated *and ended* by `separator`.

* `{Parser<T>} parser` - Parser for matching and collecting results.
* `{Parser<U>} separator` - Parser for the separator
* `{Integer} [opts.enforceEnd=true]` - If true, `separator` must be at the end
  of the parse.
* `{Integer} [opts.min=0]` - Minimum length of the resulting array.
* `{Integer} [opts.max=Infinity]` - Maximum length of the resulting array.

```javascript
parse(splitEnd(token(), space()), 'a b c ') // => ['a', 'b', 'c']
```

#### `> collect(parser[, opts]) -> Parser<Array<T>>`

Results in an array of `min` to `max` number of matches of `parser`

* `{Parser<T>} parser` - Parser to match.
* `{Integer} [opts.min=0]` - Minimum number of matches.
* `{Integer} [opts.max=Infinity]` - Maximum number of matches.

```javascript
parse(collect(token()), 'abcd') // => ['a', 'b', 'c', 'd']
```

#### `> exactly(parser, n) -> Parser<Array<T>>`

Results in an array of exactly `n` results for `parser`.

* `{Parser<T>} parser` - The parser to collect results for.
* `{Integer} n` - exact number of results to collect.

```javascript
parse(exactly(token(), 4), 'abcd') // => ['a', 'b', 'c', 'd']
```

#### `> between(open, close, parser) -> Parser<V>`

Results in a value between an opening and closing parser.

* `{Parser<T>} open` - Opening parser.
* `{Parser<U>} close` - Closing parser.
* `{Parser<V>} parser` - Parser to return the value of.

```javascript
parse(between(string('('), string(')'), token()), '(a)') // => 'a'
```

#### `> skip(parser) -> Parser<undefined>`

Skips input until `parser` stops matching.

* `{Parser<T>} parser` - Determines whether to continue skipping.

```javascript
parse(and(skip(string('a')), token()), 'aaaab') // => 'b'
```

#### `> range(start, end[, parser[, predicate]]) -> Parser<T>`

Accepts a parser if its result is within range of `start` and `end`.

* `{*} start` - lower bound of the range to accept.
* `{*} end` - higher bound of the range to accept.
* `{Parser<T>} [parser=token()]` - parser whose results to test
* `{Function(T) -> Boolean} [predicate=function(x,y){return x<=y }]` - Tests
  range

```javascript
parse(range('a', 'z'), 'd') // => 'd'
```

### `@mona/strings`

This package is intended as a collection of string-related parsers. That is,
parsers that specifically return string-related data or somehow match and
manipulate strings themselves.

Here, you'll find the likes of `string()` (the exact-string matching parser),
`spaces()`, and `trim()`.

#### `> stringOf(parser) -> Parser<String>`

Results in a string containing the concatenated results of applying `parser`.
`parser` must be a combinator that returns an array of string parse results.

* `{Parser<Array<String>>} parser` - Parser whose result to concatenate.

```javascript
parse(stringOf(collect(token())), 'aaa') // => 'aaa'
```

#### `> oneOf(matches[, caseSensitive]) -> Parser<String>`

Succeeds if the next token or string matches one of the given inputs.

* `{String|Array<String>} matches` - Characters or strings to match. If this
  argument is a string, it will be treated as if matches.split('') were passed
  in.
* `{Boolean} [caseSensitive=true]` - Whether to match char case exactly.

```javascript
parse(oneOf('abcd'), 'c') // => 'c'
parse(oneOf(['foo', 'bar', 'baz']), 'bar') // => 'bar'
```

#### `> noneOf(matches[, caseSensitive[, other]]) -> Parser<T>`

Fails if the next token or string matches one of the given inputs. If the third
`parser` argument is given, that parser will be used to collect the actual value
of `noneOf`.

* `{String|Array} matches` - Characters or strings to match. If this argument is
  a string, it will be treated as if matches.split('') were passed in.
* `{Boolean} [caseSensitive=true]` - Whether to match char case exactly.
* `{Parser<T>} [other=token()]` - What to actually parse if none of the given
  matches succeed.

```javascript
parse(noneOf('abc'), 'd') // => 'd'
parse(noneOf(['foo', 'bar', 'baz']), 'frob') // => 'f'
parse(noneOf(['foo', 'bar', 'baz'], true, text()), 'frob') // => 'frob'
```

#### `> string(str[, caseSensitive]) -> Parser<String>`

Succeeds if `str` matches the next `str.length` inputs,
consuming the string and returning it as a value.

* `{String} str` - String to match against.
* `{Boolean} [caseSensitive=true]` - Whether to match char case exactly.

```javascript
parse(string('foo'), 'foo') // => 'foo'
```

#### `> alphaUpper() -> Parser<String>`

Matches a single non-unicode uppercase alphabetical character.

```javascript
parse(alphaUpper(), 'D') // => 'D'
```

#### `> alphaLower() -> Parser<String>`

Matches a single non-unicode lowercase alphabetical character.

```javascript
parse(alphaLower(), 'd') // => 'd'
```

#### `> alpha() -> Parser<String>`

Matches a single non-unicode alphabetical character.

```javascript
parse(alpha(), 'd') // => 'd'
parse(alpha(), 'D') // => 'D'
```

#### `> digit(base) -> Parser<String>`

Parses a single digit character token from the input.

* `{Integer} [base=10]` - Optional base for the digit.

```javascript
parse(digit(), '5') // => '5'
```

#### `> alphanum(base) -> Parser<String>`

Matches an alphanumeric character.

* `{Integer} [base=10]` - Optional base for numeric parsing.

```javascript
parse(alphanum(), '1') // => '1'
parse(alphanum(), 'a') // => 'a'
parse(alphanum(), 'A') // => 'A'
```

#### `> space() -> Parser<String>`

Matches one whitespace character.

```javascript
parse(space(), '\r') // => '\r'
```

#### `> spaces() -> Parser<String>`

Matches one or more whitespace characters. Returns a single space character as
its result, regardless of which whitespace characters and how many were matched.

```javascript
parse(spaces(), '   \r\n\t \r \n') // => ' '
```

#### `> text([parser[, opts]]) -> Parser<String>`

Collects between `min` and `max` number of matches for `parser`. The result is
returned as a single string. This parser is essentially `collect()` for strings.

* `{Parser<String>} [parser=token()]` - Parser to use to collect the results.
* `{Object} [opts]` - Options to control match count.
* `{Integer} [opts.min=0]` - Minimum number of matches.
* `{Integer} [opts.max=Infinity]` - Maximum number of matches.

```javascript
* parse(text(), 'abcde') // => 'abcde'
* parse(text(noneOf('a')), 'bcde') // => 'bcde'
```

#### `> trim(parser) -> Parser<T>`

Trims any whitespace surrounding `parser`, and returns `parser`'s result.

* `{Parser<T>} parser` - Parser to match after cleaning up whitespace.

```javascript
parse(trim(token()), '    \r\n  a   \t') // => 'a'
```

#### `> trimLeft(parser) -> Parser<T>`

Trims any _leading_ whitespace before `parser`, and returns `parser`'s result.

* `{Parser<T>} parser` - Parser to match after cleaning up whitespace.

```javascript
parse(trimLeft(token()), '    \r\n  a') // => 'a'
```

#### `> trimRight(parser) -> Parser<T>`

Trims any _trailing_ whitespace before `parser`, and returns `parser`'s result.

* `{Parser} parser` - Parser to match after cleaning up whitespace.

```javascript
parse(trimRight(token()), 'a   \r\n') // => 'a'
```

### `@mona/numbers`

If you ever need a parser that will take strings and turn them into the numbers
you want the to be, this is the place to look. Parsers in this package include
`integer()`, `float()`, and `ordinal()` (which parses English ordinals (`first`,
`second`, `third`) into numbers).

#### `> natural(base) -> Parser<Integer>`

Matches a natural number. That is, a number without a positive/negative sign or
decimal places, and returns a positive integer.

* `{Integer} [base=10]` - Base to use when parsing the number.

```javascript
* parse(natural(), '1234') // => 1234
```

#### `> integer(base) -> Parser<Integer>`

Matches an integer, with an optional + or - sign.

* `{Integer} [base=10]` - Base to use when parsing the integer.

```javascript
parse(integer(), '-1234') // => -1234
```

#### `> real() -> Parser<Float>`

Parses a floating point number.

```javascript
parse(real(), '-1234e-10') // => -1.234e-7
```

#### `> cardinal() -> Parser<Integer>`

Parses english cardinal numbers into their numerical counterparts

```javascript
parse(cardinal(), 'two thousand') // => 2000
```

#### `> ordinal() -> Parser<Integer>`

Parses English ordinal numbers into their numerical counterparts.

```javascript
parse(ordinal(), 'one-hundred thousand and fifth') // 100005
```

#### `> shortOrdinal() -> Parser<Integer>`

Parses shorthand english ordinal numbers into their numerical counterparts.
Optionally allows you to remove correct suffix checks and allow any apparent
ordinal to get through.

* `{Boolean} [strict=true]` - Whether to accept only appropriate suffixes for
  each number. (if false, `2th` parses to `2`)

```javascript
parse(shortOrdinal(), '5th') // 5
```

# Gentle Intro to Monadic Parser Combinators

`mona` works by composing functions called `parsers`. These functions are
created by so-called `parser constructors`. Most of the `mona` API exposes these
constructors.

#### Primitive parsers

There are three primitive parsers in mona: `value()`, `fail()`, and
`token()`.

* `value()` - results in its single argument, without consuming input.
* `fail()` - fails unconditionally, without consuming input.
* `token()` - consumes a single token, or character, from the input. Fails if there's nothing left to consume.

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
