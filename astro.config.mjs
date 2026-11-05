import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';

const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
const site =
  process.env.SITE ||
  (vercelHost ? `https://${String(vercelHost).replace(/^https?:\/\//, '')}` : 'https://gabshairroom.co.uk');
const base = process.env.BASE || '/';

export default defineConfig({
  site,
  base,
  output: 'static',
  adapter: process.env.VERCEL ? vercel() : node({ mode: 'standalone' }),
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/booking/thanks'),
    }),
  ],
  compressHTML: true,
  build: {
    inlineStylesheets: 'auto',
  },
});
