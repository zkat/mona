"use strict";

var Transform = require("stream").Transform,
    util = require("util"),
    mona = require("./mona");
util.inherits(StreamParser, Transform);

/**
 * Implements node.js' transformer stream API. That is, it implements the
 * [transform](http://nodejs.org/api/stream.html#stream_class_stream_transform)
 * stream interface.
 *
 * By default, `parseStream` is a passthrough stream for incoming data, and a
 * "parsed" event is emitted on the results of successful parses. If your parser
 * returns string/binary chunks, you can use the `transformOutput` option to
 * make `parseStream`'s output be the parser's "data" output instead of just the
 * incoming data.
 *
 * For now, `parseStream` only supports utf8 streams.
 *
 * @param {Function} parser - The parser to execute.
 * @param {Object} [opts] - Options object.
 * @param {Boolean} [opts.transformOutput=false] - use the parser's output as
 *                                                 the outgoing "data" forr this
 *                                                 stream.
 * @param {String} [opts.fileName] - filename to use for error messages.
 * @returns {stream.Transform}
 * @memberof api
 *
 * @example
 * var source = fs.createReadStream("/some/file.csv", {encoding: "utf8"});
 * var destination = fs.createWriteStream("/tmp/final-dest.txt");
 * var handle = parseStream(csvLine());
 * handle.on("parse", function(line) {
 *   console.log("Got a csv line with ", line.length, "columns.");
 * });
 * deepEqual(fs.readFileSync("/some/file.csv"),
 *           fs.readFileSync("/tmp/final-dest.txt"));
 * // => true
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
  this._transformOutput = (options.parseOpts &&
                           options.parseOpts.transformOutput);
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
    if (!this._transformOutput) {
      this.push(chunk);
    }
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
  if (this._transformOutput) {
    this.push(parsed);
  }
};

module.exports.parseStream = parseStream;
