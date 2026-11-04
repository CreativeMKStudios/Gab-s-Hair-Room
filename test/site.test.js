import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { faqs, prose } from '../src/data/copy.js';
import { services } from '../src/data/salon.js';
import { bookingMessages, createBooking, slotsFor, validateBooking } from '../src/lib/booking.js';
import { londonParts, londonToUtc } from '../src/lib/time.js';

test('London winter and summer offsets', () => {
  const winter = londonToUtc('2026-11-04', '12:00');
  assert.equal(winter.toISOString(), '2026-11-04T12:00:00.000Z');
  const summer = londonToUtc('2026-07-01', '12:00');
  assert.equal(summer.toISOString(), '2026-07-01T11:00:00.000Z');
  assert.equal(londonParts(winter).weekday, 3);
});

test('closed days and slot length', () => {
  const now = new Date('2026-11-02T08:00:00.000Z');
  const monday = slotsFor('2026-11-02', 'kids-cut', [], now);
  assert.equal(monday.closed, true);
  const tuesday = slotsFor('2026-11-03', 'kids-cut', [], now);
  assert.equal(tuesday.slots[0], '09:00');
  assert.equal(tuesday.slots.at(-1), '17:00');
  const colour = slotsFor('2026-11-03', 'colour', [], now);
  assert.equal(colour.slots.at(-1), '15:30');
  const saturday = slotsFor('2026-11-07', 'kids-cut', [], now);
  assert.equal(saturday.slots.at(-1), '16:00');
});

test('a held booking blocks overlapping times', () => {
  const now = new Date('2026-11-03T07:00:00.000Z');
  const bookings = [
    {
      status: 'confirmed',
      start: '2026-11-03T10:00:00.000Z',
      end: '2026-11-03T10:45:00.000Z',
    },
  ];
  const slots = slotsFor('2026-11-03', 'kids-cut', bookings, now).slots;
  assert.equal(slots.includes('09:30'), false);
  assert.equal(slots.includes('10:00'), false);
  assert.equal(slots.includes('10:30'), false);
  assert.equal(slots.includes('11:00'), true);
});

test('validation rejects a bad email and accepts pay in salon', () => {
  const now = new Date('2026-11-03T07:00:00.000Z');
  const bad = validateBooking(
    { name: 'Ann', email: 'nope', phone: '07512000000', service: 'kids-cut', date: '2026-11-03', time: '10:00', payment: 'salon' },
    [],
    now
  );
  assert.equal(bad.ok, false);
  const good = validateBooking(
    { name: 'Ann Smith', email: 'ann@example.com', phone: '07512 000000', service: 'kids-cut', date: '2026-11-03', time: '10:00', payment: 'salon', notes: 'Fringe, please.' },
    [],
    now
  );
  assert.equal(good.ok, true);
  assert.equal(good.booking.amountPence, null);
});

test('a salon booking writes two confirmation emails', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ghr-'));
  process.env.BOOKINGS_FILE = path.join(dir, 'bookings.json');
  process.env.OUTBOX_DIR = path.join(dir, 'outbox');
  delete process.env.RESEND_API_KEY;
  delete process.env.SMTP_HOST;
  const now = new Date('2026-11-03T07:00:00.000Z');
  const result = await createBooking(
    {
      name: 'Ann Smith',
      email: 'ann@example.com',
      phone: '07512000000',
      service: 'highlights',
      date: '2026-11-03',
      time: '11:00',
      payment: 'salon',
    },
    now
  );
  assert.equal(result.ok, true);
  assert.equal(result.email.mode, 'outbox');
  assert.equal(result.email.results.length, 2);
  const messages = bookingMessages(result.booking);
  assert.match(messages[0].text, /You are booked in/);
  assert.match(messages[0].text, /Highlights/);
  assert.match(messages[0].text, /Pay: In the salon/);
  assert.match(messages[1].subject, /New booking: Ann Smith/);
  assert.equal(messages[0].to, 'ann@example.com');
  assert.equal(messages[1].to, 'keszeggabriella@hotmail.co.uk');
  const clash = slotsFor('2026-11-03', 'highlights', JSON.parse(fs.readFileSync(process.env.BOOKINGS_FILE, 'utf8')), now);
  assert.equal(clash.slots.includes('11:00'), false);
});

function syllables(word) {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!clean) return 0;
  if (clean.length <= 3) return 1;
  const trimmed = clean.replace(/e$/, '');
  const groups = trimmed.match(/[aeiouy]+/g);
  return Math.max(1, groups ? groups.length : 1);
}

function grade(text) {
  const sentences = text.split(/[.!?]+/).map((part) => part.trim()).filter(Boolean);
  const words = text.match(/[A-Za-z']+/g) ?? [];
  const syllableCount = words.reduce((sum, word) => sum + syllables(word), 0);
  return 0.39 * (words.length / sentences.length) + 11.8 * (syllableCount / words.length) - 15.59;
}

test('site copy stays around a grade 8 reading level and skips sales filler', () => {
  const text = [
    ...Object.values(prose),
    ...faqs.flatMap((faq) => [faq.q, faq.a]),
    ...services.map((service) => `${service.name}. ${service.summary}`),
  ].join(' ');
  const level = grade(text);
  assert.ok(level < 9, `reading grade was ${level.toFixed(2)}`);
  const banned = ['bespoke', 'elevate', 'unlock', 'nestled', 'curated', 'journey', 'tapestry', 'award-winning', 'passionate', 'delve', 'world-class', 'look no further', 'since 1896'];
  const lower = text.toLowerCase();
  for (const word of banned) assert.equal(lower.includes(word), false, word);
  for (const service of services) assert.equal('price' in service, false);
});
