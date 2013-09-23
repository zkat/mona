"use strict";

var mona = require("../src/mona");

/*
 * CSV Parser
 *
 * Based on parser from http://book.realworldhaskell.org/read/using-parsec.html
 */

function csv() {
  return mona.sequence(function(s) {
    var lines = s(mona.zeroOrMore(mona.followedBy(line(), eol())));
    s(mona.eof());
    return mona.value(lines);
  });
}

function line() {
  return mona.separatedBy(cell(), mona.character(","));
}

function cell() {
  return mona.or(quotedCell(),
                 mona.text(mona.noneOf(",\n\r")));
}

function quotedCell() {
  return mona.sequence(function(s) {
    s(mona.character('"'));
    var content = s(mona.text(quotedChar()));
    s(mona.or(mona.character('"'),
              mona.fail("expected quote at the end of cell")));
    return mona.value(content);
  });
}

function quotedChar() {
  return mona.or(mona.noneOf('"'),
                 mona.and(mona.string('""'),
                          mona.value('"')));
}

function eol() {
  var str = mona.string,
      ch = mona.character;
  return mona.or(str("\n\r"),
                 str("\r\n"),
                 ch("\n"),
                 ch("\r"),
                 mona.fail("expected end of line"));
}

function parseCSV(text) {
  return mona.parse(csv(), text);
}

function runExample() {
  var csvText = ('"Product","Price"\n'+
                 '"O\'Reilly Socks",10\n'+
                 '"Shirt with ""Haskell"" text",20\n'+
                 '"Shirt, ""O\'Reilly"" version",20\n'+
                 '"Haskell Caps",15\r\n'+
                 ',\n');
  console.log("Parsing:\n", csvText,
              "=>\n", parseCSV(csvText));
}
if (module.id === ".") runExample();
