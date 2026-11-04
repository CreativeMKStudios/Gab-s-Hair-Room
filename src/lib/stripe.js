export async function createStripeSession(booking, origin) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return {
      error: 'Card payment is not switched on yet. Choose pay in the salon, or call 07512 827223.',
    };
  }

  const body = new URLSearchParams();
  body.set('mode', 'payment');
  body.set('success_url', `${origin}/booking/thanks?ref=${encodeURIComponent(booking.id)}&session_id={CHECKOUT_SESSION_ID}`);
  body.set('cancel_url', `${origin}/book?payment=cancelled`);
  body.set('customer_email', booking.email);
  body.set('client_reference_id', booking.id);
  body.set('metadata[bookingId]', booking.id);
  body.set('line_items[0][quantity]', '1');
  body.set('line_items[0][price_data][currency]', 'gbp');
  body.set('line_items[0][price_data][unit_amount]', String(booking.amountPence));
  body.set('line_items[0][price_data][product_data][name]', `${booking.serviceName} at Gab's hair room`);

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.url) {
    return { error: 'The card page did not open. Pay in the salon, or try again in a minute.' };
  }
  return { url: data.url };
}

export async function fetchStripeSession(sessionId) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !sessionId || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return null;
  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!response.ok) return null;
  return response.json();
}
