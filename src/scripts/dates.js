import * as constants from './constants';

const firstLeapYear = 1582;

// array of month names to use in labels
export const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

// array of numbers of days for each month, 28 days in february by default
export const daysInMonth = [
  31,
  28,
  31,
  30,
  31,
  30,
  31,
  31,
  30,
  31,
  30,
  31
];

// get coordinate in virtual space for given date
export function getCoordinateFromYMD(year, month, day) {
  const sign = (year === -1) ? 1 : year / Math.abs(year);
  const isLeap = isLeapYear(year);
  const daysInYear = isLeap ? 366 : 365;

  let result = (year > -1) ? year : year + 1;

  // Get the number of day in the year.
  const sumDaysOfMonths = (s, d, i) => {
    return s + +(i < month) * d;
  };

  const days = daysInMonth.reduce(sumDaysOfMonths, +(isLeap && month > 1)) + day;

  result += (days - 1) / daysInYear;
  result = roundDecimal(result, constants.allowedMathImprecisionDecimals);

  return result;
}

// get date from coordinate in virtual space
export function getYMDFromCoordinate(coord, MarkerCorrection) {
  if (typeof MarkerCorrection === 'undefined') MarkerCorrection = false;

  const absCoord = Math.abs(coord);
  const floorCoord = Math.floor(coord);
  const sign = (coord === 0) ? 1 : coord / absCoord;

  let day = 0;
  let month = 0;
  let year = (coord >= 1) ? floorCoord : floorCoord - 1;

  const isLeap = isLeapYear(year);
  const daysInYear = isLeap ? 366 : 365;
  const daysFraction = sign * (absCoord - Math.abs(floorCoord));

  // NOTE: Using Math.round() here causes day to be rounded to 365(366)
  //       in case of the last day in a year. Do not increment day in in this case.
  day = Math.round(daysFraction * daysInYear);
  if (MarkerCorrection) day = Math.floor(daysFraction * daysInYear);
  day += +(day < daysInYear);

  while (day > daysInMonth[month] + (+(isLeap && month === 1))) {
    day -= daysInMonth[month];
    if (isLeap && month === 1) day -= 1;
    month += 1;
  }

  return { year, month, day };
}

// convert decimal year to virtual coordinate, 9999 -> present day
// NOTE: currently in database 1 BCE = -1 in virtual coords, but on client side 1 BCE = 0 in virtual coords
export function getCoordinateFromDecimalYear(decimalYear) {
  const { presentYear, presentMonth, presentDay } = getPresent();
  const presentDate = getCoordinateFromYMD(presentYear, presentMonth, presentDay);

  return decimalYear === 9999
    ? presentDate
    : (decimalYear < 0 ? decimalYear + 1 : decimalYear);
}

// convert virtual coordinate to decimal year
export function getDecimalYearFromCoordinate(coordinate) {
  // in database 1 BCE = -1, on client side 1 BCE = 0
  return coordinate < 1 ? --coordinate : coordinate;
}

export function convertCoordinateToYear(coordinate) {
  const year = { year: coordinate, regime: "CE" };
  const eps_const = 100000;

  if (coordinate <= -999999999) {
    year.year = (year.year - 1) / (-1000000000);
    year.year = Math.round(year.year * eps_const) / eps_const;
    year.regime = 'Ga';
  } else if (coordinate <= -999999) {
    year.year = (year.year - 1) / (-1000000);
    year.year = Math.round(year.year * eps_const) / eps_const;
    year.regime = 'Ma';
  } else if (coordinate <= -9999) {
    year.year = (year.year - 1) / (-1000);
    year.year = Math.round(year.year * eps_const) / eps_const;
    year.regime = 'Ka';
  } else if (coordinate < 1) {
    year.year = (year.year - 1) / (-1);
    // remove fraction part of year
    year.year = Math.ceil(year.year);
    year.regime = 'BCE';
  } else {
    // remove fraction part of year
    year.year = Math.floor(year.year);
  }

  return year;
}

export function convertYearToCoordinate(year, regime) {
  let coordinate = year;

  switch (regime.toLowerCase()) {
    case 'ga':
      coordinate = year * (-1000000000) + 1;
      break;
    case 'ma':
      coordinate = year * (-1000000) + 1;
      break;
    case 'ka':
      coordinate = year * (-1000) + 1;
      break;
    case 'bce':
      coordinate = year * (-1) + 1;
      break;
  }

  return coordinate;
}

export function getPresent() {
  const now = new Date();

  now.presentDay = now.getUTCDate();
  now.presentMonth = now.getUTCMonth();
  now.presentYear = now.getUTCFullYear();

  return now;
}

export function isLeapYear(year) {
  return (year >= firstLeapYear && (year % 400 === 0 || (year % 100 !== 0 && year % 4 === 0)));
}

export function numberofLeap(year) {
  if (year < firstLeapYear) return 0;

  let years1 = Math.floor(year / 4) - Math.floor(firstLeapYear / 4);
  years1 -= Math.floor(year / 100) - Math.floor(firstLeapYear / 100);
  years1 += Math.floor(year / 400) - Math.floor(firstLeapYear / 400);

  if (isLeapYear(year)) years1 -= 1;

  return years1;
}

export function roundDecimal(decimal, precision) {
  return Math.round(decimal * Math.pow(10, precision)) / Math.pow(10, precision);
}
