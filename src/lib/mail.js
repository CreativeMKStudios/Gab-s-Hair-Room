import fs from 'node:fs';
import path from 'node:path';

function outboxDir() {
  return process.env.OUTBOX_DIR || path.join(process.cwd(), 'data', 'outbox');
}

function writeOutbox(messages, note) {
  try {
    const dir = outboxDir();
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`);
    fs.writeFileSync(file, JSON.stringify({ note, messages, savedAt: new Date().toISOString() }, null, 2));
    return file;
  } catch {
    return null;
  }
}

async function sendResend(message) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [message.to],
      reply_to: message.replyTo,
      subject: message.subject,
      text: message.text,
    }),
  });
  return response.ok;
}

async function sendSmtp(messages) {
  const nodemailer = await import('nodemailer');
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_PORT === '465',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  const results = [];
  for (const message of messages) {
    try {
      await transport.sendMail({
        from: process.env.EMAIL_FROM,
        to: message.to,
        replyTo: message.replyTo,
        subject: message.subject,
        text: message.text,
      });
      results.push({ to: message.to, ok: true });
    } catch {
      results.push({ to: message.to, ok: false });
    }
  }
  return results;
}

export async function deliver(messages) {
  if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) {
    const results = [];
    for (const message of messages) {
      try {
        const ok = await sendResend(message);
        results.push({ to: message.to, ok });
      } catch {
        results.push({ to: message.to, ok: false });
      }
    }
    if (results.some((item) => !item.ok)) writeOutbox(messages, 'resend-partial-failure');
    return { mode: 'resend', results };
  }

  if (process.env.SMTP_HOST && process.env.EMAIL_FROM) {
    const results = await sendSmtp(messages);
    if (results.some((item) => !item.ok)) writeOutbox(messages, 'smtp-partial-failure');
    return { mode: 'smtp', results };
  }

  writeOutbox(messages, 'no-provider');
  return {
    mode: 'outbox',
    results: messages.map((message) => ({ to: message.to, ok: false })),
  };
}
