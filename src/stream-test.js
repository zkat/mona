/* global describe, it */
"use strict";

var assert = require("assert"),
    mona = require("./mona"),
    stream = require("stream"),
    fs = require("fs"),
    parseStream = require("./stream").parseStream;

describe("stream", function() {
  describe("parseStream", function() {
    it("returns a valid nodejs Transform stream", function() {
      assert.ok(parseStream(mona.token()) instanceof stream.Transform);
    });
    it("emits parse events as it parses", function(done) {
      var handle = parseStream(mona.token());
      handle.on("parse", function(x) {
        assert.equal(x, "a");
        done();
      });
      handle.write("a");
    });
    it("pipes data to another stream", function(done) {
      var handle = parseStream(mona.token()),
          source = __dirname + "/mona.js",
          destination = "/tmp/mona-test-stream.js";
      fs.createReadStream(source, {encoding: "utf8"})
        .pipe(handle)
        .pipe(fs.createWriteStream(destination))
        .on("finish", function() {
          assert.deepEqual(fs.readFileSync(destination),
                           fs.readFileSync(source));
          done();
        });
    });
  });
});
