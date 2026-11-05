export const prerender = false;

import { loadBookings, slotsFor } from '../../lib/booking.js';

export async function GET({ url }) {
  const date = url.searchParams.get('date') || '';
  const service = url.searchParams.get('service') || '';
  const result = slotsFor(date, service, await loadBookings(), new Date());
  return Response.json(result, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
