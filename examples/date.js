"use strict";

/*
 * WARNING: this module is bitrotted. It'll be updated soon!
 */

var mona = require("../src/mona"),
    moment = require("moment");

function momentParser(unit, formats) {
  return mona.sequence(function(s) {
    var str = s(mona.word()),
        formatted;
    for (var i = 0; i < formats.length; i++) {
      formatted = moment(str, formats[i]);
      if (formatted.isValid()) {
        return mona.result(formatted[unit]());
      }
    }
    return mona.fail();
  });
}

function monthParser() {
  return momentParser("month", ["MMM", "M"]);
}
function dayParser() {
  return mona.sequence(function(s) {
    var dayNum = s(mona.integer());
    if (1 <= dayNum && dayNum <= 31) {
      return mona.result(dayNum);
    } else {
      return mona.fail();
    }
  });
}
function yearParser() {
  return momentParser("year", ["YYYY", "YY"]);
}

function now() {
  return mona.and(
    mona.or(mona.string("today"),
            mona.string("now")),
    mona.result(moment().startOf("day")));
}

function yesterday() {
  return mona.and(
    mona.string("yesterday"),
    mona.result(moment().subtract("day",1).startOf("day")));
}

function distanceParser() {
  return mona.or(mona.integer(),
                 mona.and(mona.string("the"),
                          mona.result(1)));
}

function distanceUnitParser() {
  return mona.sequence(function(s) {
    var unit = s(mona.or(mona.string("day"),
                         mona.string("month"),
                         mona.string("year")));
    s(mona.maybe(mona.character("s")));
    return mona.result(unit);
  });
}

function referenceDateParser() {
  function ago() {
    return mona.and(mona.string("ago"),
                    mona.result(moment().startOf("day")));
  }
  return mona.or(ago(),
                 mona.and(mona.or(mona.string("from"),
                                  mona.string("before"),
                                  mona.string("until")),
                          mona.ws(),
                          englishDateParser()));
}

function relativeDate() {
  return mona.sequence(function(s) {
    var distance = s(mona.or(distanceParser(), mona.result(1)));
    s(mona.ws());
    var distanceUnits = s(distanceUnitParser());
    s(mona.ws());
    var reference = s(referenceDateParser());
    return mona.result(
      reference.clone().subtract(distanceUnits, distance));
  });
}

function localeParser() {
  /*jshint indent:false*/
  return mona.bind(mona.or(monthParser(), mona.result(0)), function(month) {
  return mona.bind(mona.and(mona.ws(),
                            mona.amb(
                              mona.followedBy(
                                dayParser(),
                                mona.ws()),
                              mona.result(1))), function(day) {
  return mona.bind(
    mona.amb(mona.and(mona.or(mona.and(mona.maybe(mona.character(",")),
                                       mona.ws()),
                              mona.whitespace()),
                      yearParser()),
             mona.result(moment().year())), function(year) {
  var mo = moment([year, month, day]);
  return mo.isValid() ? mona.result(mo) : mona.fail();});});});
}

function englishDateParser() {
  return mona.followedBy(
    mona.and(mona.ws(),
             mona.or(now(),
                     yesterday(),
                     relativeDate(),
                     localeParser())),
    mona.ws(),
    mona.endOfInput());
}

function parse(text) {
  return mona.run(englishDateParser(), text);
}

module.exports.parse = parse;
