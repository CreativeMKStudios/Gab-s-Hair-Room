export const salon = {
  name: "Gab's hair room",
  owner: 'Gabriella',
  shortName: 'Gabi',
  category: 'Hair salon',
  street: '30 Leicester Close',
  locality: 'Kettering',
  region: 'Northamptonshire',
  postalCode: 'NN16 8EZ',
  country: 'United Kingdom',
  countryCode: 'GB',
  phoneDisplay: '07512 827223',
  phoneTel: '+447512827223',
  email: 'keszeggabriella@hotmail.co.uk',
  lat: 52.4045836,
  lng: -0.7333821,
  mapsUrl: 'https://maps.app.goo.gl/uzv7HeBPVprcajSP6',
  facebook: 'https://www.facebook.com/107492025282603',
  tiktok: 'https://www.tiktok.com/@gabs_hair_room',
  fresha: 'https://www.fresha.com/lvp/gabs-hair-room-leicester-close-Rvyj0A',
  rating: '5.0',
  reviewCount: 25,
  ratingChecked: '4 November 2026',
  quote:
    'In the heart of Kettering, in a pleasant and familiar environment,relaxed atmosphere, with professional products, fully qualified, I look forward to welcoming my old and new clients.',
};

/** Weekday index from London. Sunday is 0. Null means closed. */
export const hours = {
  0: null,
  1: null,
  2: ['09:00', '18:00'],
  3: ['09:00', '18:00'],
  4: ['09:00', '18:00'],
  5: ['09:00', '18:00'],
  6: ['09:00', '17:00'],
};

export const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const services = [
  {
    id: 'kids-cut',
    name: "Kids' cut",
    minutes: 45,
    summary: 'A haircut for a child.',
  },
  {
    id: 'hairstyling',
    name: 'Hairstyling',
    minutes: 60,
    summary: 'A cut, a blow-dry, or a restyle.',
  },
  {
    id: 'braids',
    name: 'Braids',
    minutes: 60,
    summary: 'Braids worked into the hair.',
  },
  {
    id: 'updo',
    name: 'Updo',
    minutes: 60,
    summary: 'Hair pinned up for a do, a party, or a night out.',
  },
  {
    id: 'tinsel',
    name: 'Hair tinsel',
    minutes: 45,
    summary: 'Tinsel strands added into the hair.',
  },
  {
    id: 'colour',
    name: 'Hair colouring',
    minutes: 150,
    summary: 'All-over colour, or colour through the roots.',
  },
  {
    id: 'highlights',
    name: 'Highlights',
    minutes: 150,
    summary: 'Lighter pieces through the hair. This is the highlighting service on her Google listing.',
  },
  {
    id: 'balayage',
    name: 'Balayage',
    minutes: 180,
    summary: 'Colour painted through the lengths so the grow-out stays soft.',
  },
  {
    id: 'keratin',
    name: 'Keratin treatment',
    minutes: 150,
    summary: 'A smoothing treatment. Her salon photos show Alfaparf Keratin Therapy.',
  },
  {
    id: 'perm',
    name: 'Perm',
    minutes: 150,
    summary: 'A perm for curl, wave, or body.',
  },
];

export const leadMinutes = 90;
export const horizonDays = 60;
export const slotStepMinutes = 30;
export const pendingHoldMinutes = 30;
export const onlineMinPence = 500;
export const onlineMaxPence = 40000;

export function serviceById(id) {
  return services.find((service) => service.id === id) ?? null;
}

export function formatMinutes(minutes) {
  const hoursPart = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hoursPart && mins) return `${hoursPart} hour${hoursPart > 1 ? 's' : ''} ${mins} minutes`;
  if (hoursPart) return `${hoursPart} hour${hoursPart > 1 ? 's' : ''}`;
  return `${mins} minutes`;
}

export function hoursRows() {
  return dayNames.map((name, index) => {
    const span = hours[index];
    return {
      name,
      text: span ? `${trimHm(span[0])} to ${trimHm(span[1])}` : 'Closed',
      closed: !span,
    };
  });
}

function trimHm(hm) {
  const [h, m] = hm.split(':');
  const hour = Number(h);
  const suffix = hour >= 12 ? 'pm' : 'am';
  const hour12 = hour % 12 || 12;
  return m === '00' ? `${hour12}${suffix}` : `${hour12}:${m}${suffix}`;
}
