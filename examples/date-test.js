/* global describe, it */
"use strict";

var assert = require("assert"),
    moment = require("moment"),
    parseDate = require("./date").parseDate;

function fmt(date) {
  return moment(date).format("ll");
}
describe("parseDate()", function() {
  var today = moment().startOf("day");
  describe("date aliases", function() {
    it("'now' => today", function() {
      assert.equal(fmt(parseDate("now")), fmt(today));
    });
    it("'today' => today", function() {
      assert.equal(fmt(parseDate("today")), fmt(today));
    });
    it("'yesterday' => yesterday", function() {
      assert.equal(fmt(parseDate("yesterday")),
                   fmt(today.clone().subtract(1, "day")));
    });
  });
  describe("relative dates", function() {
    it("integer spaces unit spaces 'ago' => date", function() {
      assert.equal(fmt(parseDate("1 day ago")),
                   fmt(today.clone().subtract(1, "day")));
      assert.equal(fmt(parseDate("2 days ago")),
                   fmt(today.clone().subtract(2, "day")));
      assert.equal(fmt(parseDate("240 days ago")),
                   fmt(today.clone().subtract(240, "day")));
      assert.equal(fmt(parseDate("1 week ago")),
                   fmt(today.clone().subtract(1, "week")));
      assert.equal(fmt(parseDate("1 month ago")),
                   fmt(today.clone().subtract(1, "month")));
      assert.equal(fmt(parseDate("1 year ago")),
                   fmt(today.clone().subtract(1, "year")));
    });
    it("integer spaces unit spaces ('from'|'before'|'until') date", function() {
      assert.equal(fmt(parseDate("1 day from today")),
                   fmt(today.clone().subtract(1, "day")));
      assert.equal(fmt(parseDate("1 day before today")),
                   fmt(today.clone().subtract(1, "day")));
      assert.equal(fmt(parseDate("1 day until today")),
                   fmt(today.clone().subtract(1, "day")));
      assert.equal(fmt(parseDate("1 day from yesterday")),
                   fmt(today.clone().subtract(2, "day")));
      assert.equal(fmt(parseDate("1 day from 3 weeks ago")),
                   fmt(today.clone().subtract(3, "week").subtract(1, "day")));
      assert.equal(
        fmt(parseDate("1 day from 3 weeks from 5 months from 3 years ago")),
        fmt(today.clone().subtract(3, "week")
            .subtract(5, "month")
            .subtract(3, "year")
            .subtract(1, "day")));
    });
  });
  describe("locale dates", function() {
    it("<month> <day>, <year>", function() {
      assert.equal(fmt(parseDate("Aug 9, 2010")),
                   fmt(moment([2010, 7, 9])));
      assert.equal(fmt(parseDate("August 10, 2010")),
                   fmt(moment([2010, 7, 10])));
      // The comma is optional.
      assert.equal(fmt(parseDate("August 10 2010")),
                   fmt(moment([2010, 7, 10])));
    });
    it("<month> <day>", function() {
      assert.equal(fmt(parseDate("Aug 10")),
                   fmt(moment([moment().year(), 7, 10])));
    });
    it("<month> <year>", function() {
      assert.equal(fmt(parseDate("Aug 2010")),
                   fmt(moment([2010, 7, 1])));
    });
  });
});
