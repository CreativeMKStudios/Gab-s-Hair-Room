const ZONE = 'Europe/London';

const WEEKDAY = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Convert a London wall-clock date and time to a UTC Date. */
export function londonToUtc(isoDate, hm) {
  const [year, month, day] = isoDate.split('-').map(Number);
  const [hour, minute] = hm.split(':').map(Number);
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: ZONE,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(utcGuess)
      .map((part) => [part.type, part.value])
  );
  const hourPart = parts.hour === '24' ? 0 : Number(parts.hour);
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    hourPart,
    Number(parts.minute),
    Number(parts.second)
  );
  return new Date(utcGuess.getTime() - (asUtc - utcGuess.getTime()));
}

export function londonParts(date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: ZONE,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'short',
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value])
  );
  const hour = parts.hour === '24' ? '00' : parts.hour;
  return {
    isoDate: `${parts.year}-${parts.month}-${parts.day}`,
    hm: `${hour}:${parts.minute}`,
    weekday: WEEKDAY[parts.weekday],
    weekdayName: parts.weekday,
  };
}

export function weekdayOf(isoDate) {
  return londonParts(londonToUtc(isoDate, '12:00')).weekday;
}

export function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export function formatWhen(date) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: ZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

export function isoDateInLondon(date) {
  return londonParts(date).isoDate;
}
