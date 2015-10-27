/* global describe, it */
"use strict";

var assert = require("assert"),
    mona = require("./mona"),
    fs = require("fs");

function sinceVersion(target_version) {
  function digitize(version) {
    (function(major, minor, patch) {
      return 10000 * major + 100 * minor + patch;
    })(version.match(/^v?(\d+)\.(\d+)\.(\d+)$/));
  }
  return process.version &&
    digitize(process.version) >= digitize(target_version);
}

describe("stream", function() {
  if (sinceVersion("v0.10.0")) {
    it("can only be loaded on node since v0.10", function() {
      assert.throws(function() {
        require("./stream");
      });
    });
    return null;
  }

  var stream = require("stream"),
      parseStream = require("./stream").parseStream;
  describe("parseStream()", function() {

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
