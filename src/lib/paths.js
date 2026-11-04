/** Public path, including a project-site prefix such as /Gab-s-Hair-Room/. */
export function sitePath(path = '/') {
  const base = import.meta.env?.BASE_URL || '/';
  if (path == null || path === '' || path === '/') return base;
  const raw = String(path);
  const qIndex = raw.indexOf('?');
  const pathname = qIndex === -1 ? raw : raw.slice(0, qIndex);
  const query = qIndex === -1 ? '' : raw.slice(qIndex);
  let clean = pathname.replace(/^\//, '');
  const isFile = /\.[a-z0-9]+$/i.test(clean);
  const isApi = clean.startsWith('api/');
  if (!isFile && !isApi && !clean.endsWith('/')) clean += '/';
  return `${base}${clean}${query}`;
}

/** Absolute URL for canonicals, schema, and the sitemap. */
export function absoluteUrl(path, site) {
  const origin = site?.origin || (typeof site === 'string' ? new URL(site).origin : 'https://gabshairroom.co.uk');
  return new URL(sitePath(path), origin).href;
}
