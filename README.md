# Gab's hair room

Website for Gabriella's salon at 30 Leicester Close, Kettering, NN16 8EZ.

The words, hours, services, reviews, and photos come from her public Google listing as checked on 4 November 2026. Google names the services. It does not publish a pound price for each one, so the site does not invent one. Clients pay in the salon, or pay online only when she has already told them a price.

## Run

```bash
npm install
npm test
npm run dev
```

`npm run build` then `npm run preview` serves the production build. Booking and contact emails need the Node server. A static host alone cannot send them.

GitHub Actions on `main` builds the static pages for https://creativemkstudios.github.io/Gab-s-Hair-Room/ . A repo admin has to turn on GitHub Pages (Settings, Pages, GitHub Actions) before that address goes live. That host has no Node server, so the diary and the contact form there tell people to call or text 07512 827223. Card payments and confirmation emails start working when this same build is run on a Node host with the variables below. Set `SITE` to the public origin and `BASE` to `/` on that host.

## Email and card payments

Copy `.env.example` to `.env`.

- `SALON_EMAIL` is who receives booking and contact copies. Default is the published salon address.
- Set `RESEND_API_KEY` and `EMAIL_FROM`, or `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `EMAIL_FROM`.
- Set `STRIPE_SECRET_KEY` to take card payments. Without it, the site still books people who pay in the salon, and it says so.

Until email is configured, bookings are still saved and the confirmation page tells the client to text the salon.

## What was not copied from the design reference

The layout uses the black page, huge type, and green sticker from the reference. The reference text about an award-winning New York barber since 1896 is not this business, so it is not on the site.
