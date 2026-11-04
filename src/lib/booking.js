import fs from 'node:fs';
import path from 'node:path';
import {
  horizonDays,
  hours,
  leadMinutes,
  onlineMaxPence,
  onlineMinPence,
  pendingHoldMinutes,
  salon,
  serviceById,
  slotStepMinutes,
} from '../data/salon.js';
import { deliver } from './mail.js';
import { addMinutes, formatWhen, isoDateInLondon, londonParts, londonToUtc, weekdayOf } from './time.js';

let chain = Promise.resolve();

function withLock(fn) {
  const run = chain.then(fn, fn);
  chain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

function bookingsFile() {
  return process.env.BOOKINGS_FILE || path.join(process.cwd(), 'data', 'bookings.json');
}

export function readBookings() {
  const file = bookingsFile();
  if (!fs.existsSync(file)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeBookings(bookings) {
  const file = bookingsFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(bookings, null, 2));
  fs.renameSync(temp, file);
}

function hmToMinutes(hm) {
  const [hour, minute] = hm.split(':').map(Number);
  return hour * 60 + minute;
}

function minutesToHm(total) {
  const hour = Math.floor(total / 60);
  const minute = total % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function blocksSlot(booking, now) {
  if (booking.status === 'confirmed' || booking.status === 'paid') return true;
  if (booking.status === 'pending_payment') {
    const age = now.getTime() - new Date(booking.createdAt).getTime();
    return age < pendingHoldMinutes * 60 * 1000;
  }
  return false;
}

export function slotsFor(isoDate, serviceId, bookings, now = new Date()) {
  const service = serviceById(serviceId);
  if (!service) return { closed: false, slots: [], error: 'Pick a service from the list.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return { closed: false, slots: [], error: 'Pick a real date.' };

  const weekday = weekdayOf(isoDate);
  const span = hours[weekday];
  if (!span) return { closed: true, slots: [], error: 'Gabi is closed that day. She works Tuesday to Saturday.' };

  const today = isoDateInLondon(now);
  if (isoDate < today) return { closed: false, slots: [], error: 'That day has already gone.' };

  const horizon = new Date(now.getTime() + horizonDays * 24 * 60 * 60 * 1000);
  if (isoDate > isoDateInLondon(horizon)) {
    return { closed: false, slots: [], error: `You can book up to ${horizonDays} days ahead.` };
  }

  const open = hmToMinutes(span[0]);
  const close = hmToMinutes(span[1]);
  const earliest = now.getTime() + leadMinutes * 60 * 1000;
  const slots = [];

  for (let minute = open; minute + service.minutes <= close; minute += slotStepMinutes) {
    const hm = minutesToHm(minute);
    const start = londonToUtc(isoDate, hm);
    const end = addMinutes(start, service.minutes);
    if (start.getTime() < earliest) continue;
    const clash = bookings.some((booking) => {
      if (!blocksSlot(booking, now)) return false;
      const otherStart = new Date(booking.start).getTime();
      const otherEnd = new Date(booking.end).getTime();
      return start.getTime() < otherEnd && end.getTime() > otherStart;
    });
    if (!clash) slots.push(hm);
  }

  return { closed: false, slots, error: slots.length ? '' : 'No free time that day. Try another date.' };
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value, max) {
  return String(value ?? '')
    .replace(/[\u0000-\u001F]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

export function validateBooking(input, bookings, now = new Date()) {
  if (input.company) return { ok: false, error: 'That booking could not be saved.' };

  const service = serviceById(clean(input.service, 40));
  if (!service) return { ok: false, error: 'Pick a service from the list.' };

  const name = clean(input.name, 80);
  if (name.length < 2) return { ok: false, error: 'Add your name.' };

  const email = clean(input.email, 120).toLowerCase();
  if (!emailPattern.test(email)) return { ok: false, error: 'Add a real email address so we can send the confirmation.' };

  const phone = clean(input.phone, 30);
  const phoneDigits = phone.replace(/\D/g, '');
  if (phoneDigits.length < 10 || phoneDigits.length > 15) {
    return { ok: false, error: 'Add a phone number so Gabi can reach you.' };
  }

  const notes = clean(input.notes, 500);
  const date = clean(input.date, 10);
  const time = clean(input.time, 5);
  const payment = clean(input.payment, 20);

  if (payment !== 'salon' && payment !== 'online') {
    return { ok: false, error: 'Choose pay in the salon, or pay online.' };
  }

  const available = slotsFor(date, service.id, bookings, now);
  if (!available.slots.includes(time)) {
    return { ok: false, error: available.error || 'That time has gone. Pick another one.' };
  }

  let amountPence = null;
  if (payment === 'online') {
    const pounds = Number(String(input.amount ?? '').replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(pounds)) return { ok: false, error: 'Add the price Gabi gave you, in pounds.' };
    amountPence = Math.round(pounds * 100);
    if (amountPence < onlineMinPence || amountPence > onlineMaxPence) {
      return {
        ok: false,
        error: `Online pay is for prices from £${onlineMinPence / 100} to £${onlineMaxPence / 100}. Otherwise pay in the salon.`,
      };
    }
  }

  const start = londonToUtc(date, time);
  const end = addMinutes(start, service.minutes);

  return {
    ok: true,
    booking: {
      id: `ghr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: now.toISOString(),
      name,
      email,
      phone,
      notes,
      serviceId: service.id,
      serviceName: service.name,
      minutes: service.minutes,
      date,
      time,
      start: start.toISOString(),
      end: end.toISOString(),
      whenLabel: formatWhen(start),
      payment,
      amountPence,
      status: payment === 'salon' ? 'confirmed' : 'pending_payment',
      emailsSent: false,
      emailMode: null,
    },
  };
}

export function createBooking(input, now = new Date()) {
  return withLock(async () => {
    const bookings = readBookings();
    const result = validateBooking(input, bookings, now);
    if (!result.ok) return { ok: false, status: 400, error: result.error };

    const booking = result.booking;
    bookings.push(booking);

    if (booking.payment === 'salon') {
      const email = await deliver(bookingMessages(booking));
      booking.emailsSent = email.results.every((item) => item.ok);
      booking.emailMode = email.mode;
      writeBookings(bookings);
      return { ok: true, status: 200, booking, email };
    }

    writeBookings(bookings);
    return { ok: true, status: 200, booking, email: null };
  });
}

export function updateBooking(id, patch) {
  return withLock(async () => {
    const bookings = readBookings();
    const booking = bookings.find((item) => item.id === id);
    if (!booking) return null;
    Object.assign(booking, patch);
    writeBookings(bookings);
    return booking;
  });
}

export function getBooking(id) {
  return readBookings().find((item) => item.id === id) ?? null;
}

export function confirmOnlinePayment(id, session) {
  return withLock(async () => {
    const bookings = readBookings();
    const booking = bookings.find((item) => item.id === id);
    if (!booking || !session) return booking ?? null;
    const sameBooking = session.metadata?.bookingId === booking.id || session.client_reference_id === booking.id;
    const paid =
      session.payment_status === 'paid' &&
      sameBooking &&
      Number(session.amount_total) === Number(booking.amountPence);
    if (!paid) return booking;
    booking.status = 'paid';
    if (!booking.emailsSent) {
      const email = await deliver(bookingMessages(booking));
      booking.emailsSent = email.results.every((item) => item.ok);
      booking.emailMode = email.mode;
    }
    writeBookings(bookings);
    return booking;
  });
}

export function money(pence) {
  return `£${(pence / 100).toFixed(2)}`;
}

export function bookingMessages(booking) {
  const payLine =
    booking.payment === 'salon'
      ? 'Pay: In the salon, on the day.'
      : `Pay: Online, ${money(booking.amountPence)}${booking.status === 'paid' ? ', paid.' : '.'}`;

  const customer = [
    `Hello ${booking.name},`,
    '',
    "You are booked in at Gab's hair room.",
    '',
    `Service: ${booking.serviceName}`,
    `When: ${booking.whenLabel} (UK time)`,
    `Time held: ${booking.minutes} minutes`,
    payLine,
    `Where: ${salon.street}, ${salon.locality}, ${salon.postalCode}`,
    `Phone: ${salon.phoneDisplay}`,
    '',
    'Customer parking is signed on the wooden fence.',
    '',
    'If you need to move or cancel, call or text that number.',
    '',
    "Gab's hair room",
  ].join('\n');

  const manager = [
    'New booking.',
    '',
    `Name: ${booking.name}`,
    `Email: ${booking.email}`,
    `Phone: ${booking.phone}`,
    `Service: ${booking.serviceName}`,
    `When: ${booking.whenLabel} (UK time)`,
    `Time held: ${booking.minutes} minutes`,
    payLine,
    booking.notes ? `Notes: ${booking.notes}` : 'Notes: none',
    `Reference: ${booking.id}`,
    '',
    'Reply to the customer if the time needs to change.',
  ].join('\n');

  const salonEmail = process.env.SALON_EMAIL || salon.email;
  return [
    {
      to: booking.email,
      replyTo: salonEmail,
      subject: `Your booking at Gab's hair room, ${booking.whenLabel}`,
      text: customer,
    },
    {
      to: salonEmail,
      replyTo: booking.email,
      subject: `New booking: ${booking.name}, ${booking.whenLabel}`,
      text: manager,
    },
  ];
}

export function londonNowLabel(date = new Date()) {
  const parts = londonParts(date);
  return `${parts.isoDate} ${parts.hm}`;
}
