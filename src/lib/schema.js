import { salon, services } from '../data/salon.js';

function joinRoot(origin, path) {
  const root = String(origin).replace(/\/$/, '');
  if (!path || path === '/') return `${root}/`;
  let clean = path.startsWith('/') ? path : `/${path}`;
  if (!clean.includes('.') && !clean.endsWith('/') && !clean.includes('?')) clean += '/';
  return `${root}${clean}`;
}

export function hairSalonSchema(origin) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HairSalon',
    '@id': `${String(origin).replace(/\/$/, '')}/#salon`,
    name: salon.name,
    description:
      "Hair salon in Kettering. Gabriella cuts, colours, highlights, and smooths hair, one client at a time. Customer parking is on site.",
    image: [joinRoot(origin, '/og.webp')],
    url: joinRoot(origin, '/'),
    telephone: salon.phoneTel,
    email: salon.email,
    currenciesAccepted: 'GBP',
    address: {
      '@type': 'PostalAddress',
      streetAddress: salon.street,
      addressLocality: salon.locality,
      addressRegion: salon.region,
      postalCode: salon.postalCode,
      addressCountry: 'GB',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: salon.lat,
      longitude: salon.lng,
    },
    hasMap: salon.mapsUrl,
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '09:00',
        closes: '18:00',
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: 'Saturday',
        opens: '09:00',
        closes: '17:00',
      },
    ],
    sameAs: [salon.facebook, salon.tiktok, salon.fresha, salon.mapsUrl],
    areaServed: {
      '@type': 'City',
      name: 'Kettering',
      containedInPlace: { '@type': 'AdministrativeArea', name: 'North Northamptonshire' },
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Hair services',
      itemListElement: services.map((service) => ({
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: service.name,
          description: service.summary,
          areaServed: 'Kettering',
          provider: { '@id': `${String(origin).replace(/\/$/, '')}/#salon` },
        },
      })),
    },
  };
}

export function breadcrumbSchema(origin, items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: joinRoot(origin, item.path),
    })),
  };
}

export function faqSchema(faqs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: { '@type': 'Answer', text: faq.a },
    })),
  };
}
