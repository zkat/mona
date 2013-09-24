"use strict";

var mona = require("../src/mona"),
    // TODO - get rid of this dependency eventually.
    moment = require("moment");

/**
 * Utility for parsing formats that moment recognizes.
 */
function momentParser(unit, formats) {
  return mona.sequence(function(s) {
    var str = s(mona.text(mona.noneOf(" "))),
        formatted;
    for (var i = 0; i < formats.length; i++) {
      formatted = moment(str, formats[i]);
      if (formatted && formatted.isValid()) {
        return mona.value(formatted[unit]());
      }
    }
    return mona.expected(unit);
  });
}

/**
 * Parses a text month in either short (Aug) or long (August) formats.
 */
function month() {
  return momentParser("month", ["MMM", "M"]);
}

/**
 * Parses an integer between 1 and 31.
 */
function day() {
  // TODO - We always get the month first -- so why not pass the month into here
  //        and validate that that particular month can have this as a day? It
  //        could make error reporting nicer, too. And show off a nice feature
  //        of mona.
  return mona.sequence(function(s) {
    var dayNum = s(mona.integer());
    if (1 <= dayNum && dayNum <= 31) {
      return mona.value(dayNum);
    } else {
      return mona.expected("day");
    }
  });
}

/**
 * Parses a year in long (2013) format.
 */
function year() {
  return momentParser("year", ["YYYY"]);
}

/**
 * Parses the strings 'today' and 'now' to the current date.
 */
function now() {
  return mona.and(
    mona.or(mona.string("today"),
            mona.string("now")),
    mona.value(moment().startOf("day").toDate()));
}

/**
 * Parses the string 'yesterday' to the day before the current date.
 */
function yesterday() {
  return mona.and(
    mona.string("yesterday"),
    mona.value(moment().subtract("day", 1).startOf("day").toDate()));
}

/**
 * Parses an interval to be used by the relative date parser. Intervals must be
 * integer-cardinal numbers. 'the' works as an alias for the number 1, so we can
 * say "the day before yesterday".
 */
function interval() {
  return mona.or(mona.integer(),
                 mona.and(mona.string("the"),
                          mona.value(1)));
}

/**
 * The unit the interval will use to shift the date. Can be either the singular
 * or plural version of 'day', 'weeek', 'month', or 'year'.
 */
function intervalUnit() {
  return mona.sequence(function(s) {
    var unit = s(mona.or(mona.string("day"),
                         mona.string("week"),
                         mona.string("month"),
                         mona.string("year")));
    s(mona.maybe(mona.character("s")));
    return mona.value(unit);
  });
}

/**
 * The reference date that will be shifted by the interval. 'ago' acts as an
 * alias for the current date in this case, so '1 day ago' is the same as '1 day
 * from today'. 'from', 'before', or 'until' are used to make the reference
 * date, and have no semantic distinction. The reference date itself can be any
 * date parsed by the englishDateParser (which includes relative dates, so this
 * can be recursive).
 */
function referenceDate() {
  function ago() {
    return mona.and(mona.string("ago"),
                    mona.value(moment().startOf("day").toDate()));
  }
  return mona.or(ago(),
                 mona.and(mona.or(mona.string("from"),
                                  mona.string("before"),
                                  mona.string("until")),
                          mona.spaces(),
                          englishDateParser()));
}

/**
 * Puts together the relative date pieces and returns a date that's been shifted
 * into the past by the given interval.
 */
function relativeDate() {
  return mona.sequence(function(s) {
    var _interval = s(mona.or(interval(), mona.value(1)));
    s(mona.maybe(mona.spaces()));
    var _intervalUnit = s(intervalUnit());
    s(mona.spaces());
    var reference = s(referenceDate());
    return mona.value(
      moment(reference).subtract(_intervalUnit, _interval).toDate());
  });
}

/**
 * Parses a date in Month + Year syntax, such as 'January 2010'. The day is set
 * to the first of the month in the resulting date.
 */
function monthAndYear() {
  return mona.sequence(function(s) {
    var _month = s(month());
    s(mona.spaces());
    var _year = s(year());
    var mo = moment([_year, _month, 1]);
    return mo.isValid() ?
      mona.value(mo.toDate()) :
      mona.fail("invalid date", "invalid");
  });
}

/**
 * Parses a date in Month + Day syntax, such as 'Jan 1'. The year is set to be
 * the current year in the resulting date.
 */
function monthAndDay() {
  return mona.sequence(function(s) {
    var _month = s(month());
    s(mona.spaces());
    var _day = s(day());
    var mo = moment([moment().year(), _month, _day]);
    return mo.isValid() ?
      mona.value(mo.toDate()) :
      mona.fail("invalid date", "invalid");
  });
}

/**
 * Parses a full date that includes Month, Day, and Year, with an optional comma
 * between the day and year.
 */
function fullDate() {
  return mona.sequence(function(s) {
    var _month = s(month());
    s(mona.spaces());
    var _day = s(day());
    s(mona.maybe(mona.character(",")));
    s(mona.maybe(mona.spaces()));
    var _year = s(year());
    var mo = moment([_year, _month, _day]);
    return mo.isValid() ?
      mona.value(mo.toDate()) :
      mona.fail("invalid date", "invalid");
  });
}

/**
 * Puts the various locale date parsers together to try and get a reasonable
 * fallback.
 */
function localeDate() {
  // TODO - Maybe there's a better way to do this, but this was the
  //        simplest/most readable version I could come up with without having
  //        amb().
  return mona.or(fullDate(),
                 monthAndDay(),
                 monthAndYear());
}

/**
 * Puts all the various date-related parsers together.
 */
function englishDateParser() {
  return mona.followedBy(
    mona.and(mona.maybe(mona.spaces()),
             mona.or(localeDate(),
                     relativeDate(),
                     now(),
                     yesterday())),
    mona.maybe(mona.spaces()),
    mona.eof());
}

/**
 * Parses a variety of date inputs, including relative dates. Also includes
 * shortcuts such as 'today', 'now', and 'yesterday'. All dates are parsed into
 * the past, with the current day as a reference. All dates returned are are
 * truncated to midnight on that day.
 *
 * @param {String} string - String to parse the date from.
 * @param {Object} opts - Options object. Passed to mona.parse directly.
 * @returns {Date} - The date represented by `string`.
 *
 * @example
 * now
 * today
 * yesterday
 * 3 days ago
 * 3 days before yesterday
 * 5 weeks from now // into the past!
 * Aug 20, 2010
 * Aug 19 // Uses the current year
 * August 2011 // First day of August 2011
 */
function parseDate(string, opts) {
  return mona.parse(englishDateParser(), string, opts);
}
module.exports.parseDate = parseDate;

function runExample() {
  function logExample(string) {
    try {
      console.log(string, " => ", moment(parseDate(string)).format("ll"));
    } catch(e) {
      console.log("Error: ", e);
    }
  }
  logExample("today");
  logExample("1 day ago");
  logExample("2 weeks ago");
  logExample("1 month from 2 days from today");
  logExample("Aug 27, 2013");
  logExample("August 27");
  logExample("Aug 2011");
  logExample("1 month from 2 days before Aug 30");
}
if (module.id === ".") runExample();
