"use strict";

var mona = require("../src/mona");

/*
 * CSV Parser
 *
 * Based on parser from http://book.realworldhaskell.org/read/using-parsec.html
 */

function csv(minimumColumns) {
  return mona.splitEnd(line(minimumColumns), eol());
}

function line(minimumColumns) {
  return mona.split(cell(), mona.string(","), {min: minimumColumns});
}

function cell() {
  return mona.or(quotedCell(),
                 mona.text(mona.noneOf(",\n\r")));

}

function quotedCell() {
  return mona.between(mona.string('"'),
                      mona.label(mona.string('"'),
                                 "closing quote"),
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

function parseCSV(text, minimumColumns) {
  return mona.parse(csv(minimumColumns), text);
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

module.exports = {
  parseCSV: parseCSV,
  runExample: runExample
};
