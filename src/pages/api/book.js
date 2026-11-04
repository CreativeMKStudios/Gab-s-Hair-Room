export const prerender = false;

import { createBooking, updateBooking } from '../../lib/booking.js';
import { createStripeSession } from '../../lib/stripe.js';

const hits = new Map();

function limited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((time) => now - time < 60 * 60 * 1000);
  if (recent.length >= 8) return true;
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

async function readInput(request) {
  const type = request.headers.get('content-type') || '';
  if (type.includes('application/json')) return request.json();
  const form = await request.formData();
  return Object.fromEntries(form.entries());
}

function html(title, message) {
  return new Response(
    `<!doctype html><html lang="en-GB"><meta charset="utf-8"><title>${title}</title><body style="font-family:sans-serif;background:#111;color:#fff;padding:2rem"><h1>${title}</h1><p>${message}</p><p><a style="color:#4dff6e" href="/book">Back to booking</a></p></body></html>`,
    { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

export async function POST({ request, clientAddress, url }) {
  const length = Number(request.headers.get('content-length') || 0);
  if (length > 20_000) return Response.json({ ok: false, error: 'That form is too large.' }, { status: 413 });
  if (limited(clientAddress || 'local')) {
    return Response.json({ ok: false, error: 'Too many bookings from this connection. Call 07512 827223.' }, { status: 429 });
  }

  let input;
  try {
    input = await readInput(request);
  } catch {
    return Response.json({ ok: false, error: 'The form could not be read.' }, { status: 400 });
  }

  const wantsJson = (request.headers.get('accept') || '').includes('application/json');
  const result = await createBooking(input);
  if (!result.ok) {
    if (wantsJson) return Response.json({ ok: false, error: result.error }, { status: result.status });
    return html('Booking not saved', result.error);
  }

  if (result.booking.payment === 'online') {
    const stripe = await createStripeSession(result.booking, url.origin);
    if (stripe.error) {
      await updateBooking(result.booking.id, { status: 'cancelled' });
      if (wantsJson) return Response.json({ ok: false, error: stripe.error }, { status: 400 });
      return html('Card payment is not ready', stripe.error);
    }
    if (wantsJson) return Response.json({ ok: true, url: stripe.url });
    return Response.redirect(stripe.url, 303);
  }

  const next = `/booking/thanks?ref=${encodeURIComponent(result.booking.id)}`;
  if (wantsJson) return Response.json({ ok: true, url: next, emailMode: result.booking.emailMode });
  return Response.redirect(next, 303);
}
