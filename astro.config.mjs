import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import sitemap from '@astrojs/sitemap';

const site = process.env.SITE || 'https://gabshairroom.co.uk';
const base = process.env.BASE || '/';

export default defineConfig({
  site,
  base,
  output: 'static',
  adapter: node({ mode: 'standalone' }),
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
