"use strict";

var mona = require("../src/mona");

/*
 * Context-sensitive grammars
 *
 * mona is able to handle so-called context-sensitive grammars. This file
 * implements a generalized version of {a^n b^n c^n | n >= 1}
 *
 * https://en.wikipedia.org/wiki/Context-sensitive_grammar
 */

// The simple version is fairly straightforward. a, b, and c are expected to be
// characters, since we don't want a language that can simply match the simple
// characters 'a', 'b' and 'c', do we?
function symmetricSimple(a, b, c) {
  return mona.sequence(function(s) {
    // Since n >= 1, we provide that to collect, which will also tell us what
    // our target length will be...
    var as = s(mona.text(mona.string(a), {min: 1})),
        count = as.length, // And now we know how many to look for.
        // So we collect two more strings.
        bs = s(mona.text(mona.string(b), {min: count, max: count})),
        cs = s(mona.text(mona.string(c), {min: count, max: count}));
    // Now that we have three strings, we can simply concatenate them!
    return mona.value(as + bs + cs);
  });
}

// The above parser only handles exactly three inputs to match. Let's generalize
// it...
function symmetricN() {

  function symmetricHelper(n) {
    var letters = [].slice.call(arguments, 1);

    // This is the parser itself. sequence() lets us write parsers that look and
    // feel sequential, kinda like do-notation.
    return mona.sequence(function(s) {

      // We provide a min and max here for the recursive call, but we'll call
      // symmetricHelper() with it as 'undefined' initially, which makes 'max'
      // default to Infinity.
      var xs = s(mona.text(mona.string(letters[0]),
                           {min: n || 1, max: n}));

      // This is going to be whatever 'as' was, the first time around, and
      // simply be the same value from there on out.
      var count = xs.length;

      // If we're out of letters to parse...
      var moreXs = letters.length === 1 ?
            
            "" : // We'll concatenate this empty string.
            
            // Otherwise do a recursive call with the calculated count, and the
            // rest of the letters.
            s(symmetricHelper.apply(null, [count].concat(letters.slice(1))));

      // And we do a final concatenation of our results.
      return mona.value(xs + moreXs);
    });
  }
  return symmetricHelper.apply(null, [].concat.apply([undefined], arguments));
}

// We can take this idea now into a more generalize parser that accepts one or
// more arbitrary mona parsers, and returns an array with all their symmetric
// results concatenated.
function symmetric() {
  function symmetricHelper(n) {
    var parsers = [].slice.call(arguments, 1);
    return mona.sequence(function(s) {
      // We replace text() with collect(), and pass the parser in directly,
      // instead of using string().
      var xs = s(mona.collect(parsers[0], {min: n || 1, max: n})),
          count = xs.length,
          more = parsers.length === 1 ?
            // We change our default to [] instead of ""
            [] :
            s(symmetricHelper.apply(null, [count].concat(parsers.slice(1))));
      return mona.value(xs.concat(more));
    });
  }
  return symmetricHelper.apply(null, [].concat.apply([undefined], arguments));
}

function runParser(parser, input) {
  try {
    console.log("parsing '" + input + "':", mona.parse(parser, input));
  } catch (e) {
    console.log("Parser failure: ", e.message);
  }
}

function runExample() {
  runParser(symmetricSimple("a", "b", "c"), "aaabbbccc");
  runParser(symmetricN("a", "b", "c", "d"), "aaabbbcccddd");
  runParser(symmetric(mona.string("foo"),
                      mona.string("bar"),
                      mona.digit()),
            "foofoobarbar11");

  // These will fail
  runParser(symmetricN("a", "b", "c", "d"), "aaabbbcccdd"); // missing a 'd'
  runParser(symmetric(mona.token(), // slurps up all input, so eof
                      mona.token(),
                      mona.token()),
            "aaabbbccc"); 
}
if (module.id === ".") runExample();
