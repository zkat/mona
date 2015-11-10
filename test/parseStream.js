/*
var assert = require('assert')
var mona = require('..')
var fs = require('fs')
var stream = require('stream')

describe('parseStream()', function () {
  var parseStream = require('../src/stream').parseStream
  it('returns a valid nodejs Transform stream', function () {
    assert.ok(parseStream(mona.token()) instanceof stream.Transform)
  })
  it('emits parse events as it parses', function (done) {
    var handle = parseStream(mona.token())
    handle.on('parse', function (x) {
      assert.equal(x, 'a')
      done()
    })
    handle.write('a')
  })
  it('pipes data to another stream', function (done) {
    var handle = parseStream(mona.token())
    var source = __dirname + '/mona.js'
    var destination = '/tmp/mona-test-stream.js'
    fs.createReadStream(source, {
      encoding: 'utf8'
    })
    .pipe(handle)
    .pipe(fs.createWriteStream(destination))
    .on('finish', function () {
      assert.deepEqual(fs.readFileSync(destination),
      fs.readFileSync(source))
      done()
    })
  })
})
*/
