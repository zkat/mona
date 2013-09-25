"use strict";

var Transform = require("stream").Transform,
    util = require("util"),
    mona = require("./mona");
util.inherits(StreamParser, Transform);

/**
 * Implements node.js' transformer stream API. The object returned by this
 * function is a proper node duplex stream. That is, it implements both the
 * Readable and Writable interfaces described
 * [here](http://nodejs.org/api/stream.html)
 *
 * @param {Function} parser - The parser to execute.
 * @param {Object} [opts] - Options object.
 * @param {String} [opts.fileName] - filename to use for error messages.
 * @returns {stream.Transform}
 * @memberof api
 */
function parseStream(parser, opts) {
  return new StreamParser(parser, {
    decodeStrings: false,
    encoding: "utf8",
    parseOpts: opts
  });
}

function StreamParser(parser, options) {
  if (!(this instanceof StreamParser)) {
    return new StreamParser(options);
  }
  Transform.call(this, options);
  this._handle = mona.parseAsync(parser,
                                 this._onParse.bind(this),
                                 options.parseOpts);
}

StreamParser.prototype._transform = function(chunk, encoding, done) {
  if (typeof chunk !== "string") {
    done(new Error("parseStream only supports strings for now"));
  }
  try {
    this._handle.data(chunk);
    done();
  } catch (e) {
    done(e);
  }
};

StreamParser.prototype._flush = function(done) {
  try {
    this._handle.done();
    done();
  } catch (e) {
    done(e);
  }
};

StreamParser.prototype._onParse = function(err, parsed) {
  if (err) { throw err; }
  this.emit("parse", parsed);
  this.push(parsed);
};

module.exports.parseStream = parseStream;
