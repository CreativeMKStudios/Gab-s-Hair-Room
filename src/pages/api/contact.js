export const prerender = false;

import fs from 'node:fs';
import path from 'node:path';
import { deliver } from '../../lib/mail.js';
import { salon } from '../../data/salon.js';

const hits = new Map();

function limited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((time) => now - time < 60 * 60 * 1000);
  if (recent.length >= 8) return true;
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

function clean(value, max) {
  return String(value ?? '')
    .replace(/[\u0000-\u001F]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

export async function POST({ request, clientAddress }) {
  if (limited(clientAddress || 'local')) {
    return Response.json({ ok: false, error: 'Too many messages. Call the salon.' }, { status: 429 });
  }
  let input;
  try {
    const type = request.headers.get('content-type') || '';
    input = type.includes('application/json') ? await request.json() : Object.fromEntries((await request.formData()).entries());
  } catch {
    return Response.json({ ok: false, error: 'The message could not be read.' }, { status: 400 });
  }
  if (input.company) return Response.json({ ok: false, error: 'That message could not be sent.' }, { status: 400 });

  const name = clean(input.name, 80);
  const email = clean(input.email, 120);
  const phone = clean(input.phone, 30);
  const message = clean(input.message, 800);
  if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || phone.replace(/\D/g, '').length < 10 || message.length < 5) {
    return Response.json({ ok: false, error: 'Add your name, a real email, a phone number, and a short message.' }, { status: 400 });
  }

  const file = path.join(process.cwd(), 'data', 'messages.json');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const existing = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
  existing.push({ name, email, phone, message, at: new Date().toISOString() });
  fs.writeFileSync(file, JSON.stringify(existing, null, 2));

  const salonEmail = process.env.SALON_EMAIL || salon.email;
  const emailResult = await deliver([
    {
      to: email,
      replyTo: salonEmail,
      subject: `We got your message, ${name}`,
      text: `Hello ${name},\n\nGabi has your message from the Gab's hair room website.\n\n"${message}"\n\nIf you need a chair time and have not booked one, use the booking page or text ${salon.phoneDisplay}.\n\nGab's hair room\n${salon.street}, ${salon.locality}`,
    },
    {
      to: salonEmail,
      replyTo: email,
      subject: `Website message from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\n\n${message}`,
    },
  ]);

  const sent = emailResult.results.every((item) => item.ok);
  const note = sent
    ? 'Your message is on its way to you and to Gabi.'
    : `Your message is saved, but email is not leaving this server yet. Please also text ${salon.phoneDisplay}.`;
  const wantsJson = (request.headers.get('accept') || '').includes('application/json');
  if (wantsJson) return Response.json({ ok: true, message: note, emailMode: emailResult.mode });
  return new Response(
    `<!doctype html><html lang="en-GB"><meta charset="utf-8"><title>Message sent</title><body style="font-family:sans-serif;background:#111;color:#fff;padding:2rem"><h1>Message received</h1><p>${note}</p><p><a style="color:#4dff6e" href="/contact">Back</a></p></body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}
