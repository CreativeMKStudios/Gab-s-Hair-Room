import type { APIRoute } from 'astro';
import { absoluteUrl } from '../lib/paths.js';

export const GET: APIRoute = ({ site }) => {
  const sitemap = absoluteUrl('/sitemap-index.xml', site ?? 'https://gabshairroom.co.uk');
  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${sitemap}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
