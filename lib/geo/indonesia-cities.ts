export type IndonesiaCity = {
  slug: string;
  name: string;
  province: string;
  lat: number;
  lng: number;
  aliases: string[];
};

/** Provincial capitals and major cities. Coordinates are city-center, not a street address. */
export const INDONESIA_CITIES: IndonesiaCity[] = [
  { slug: "banda-aceh", name: "Banda Aceh", province: "Aceh", lat: 5.5483, lng: 95.3238, aliases: ["banda aceh"] },
  { slug: "medan", name: "Medan", province: "Sumatera Utara", lat: 3.5952, lng: 98.6722, aliases: [] },
  { slug: "padang", name: "Padang", province: "Sumatera Barat", lat: -0.9471, lng: 100.4172, aliases: [] },
  { slug: "pekanbaru", name: "Pekanbaru", province: "Riau", lat: 0.5071, lng: 101.4478, aliases: [] },
  { slug: "dumai", name: "Dumai", province: "Riau", lat: 1.6666, lng: 101.4, aliases: [] },
  { slug: "jambi", name: "Jambi", province: "Jambi", lat: -1.6101, lng: 103.6131, aliases: [] },
  { slug: "palembang", name: "Palembang", province: "Sumatera Selatan", lat: -2.9761, lng: 104.7754, aliases: [] },
  { slug: "bengkulu", name: "Bengkulu", province: "Bengkulu", lat: -3.8004, lng: 102.2655, aliases: [] },
  { slug: "bandar-lampung", name: "Bandar Lampung", province: "Lampung", lat: -5.3971, lng: 105.2668, aliases: ["lampung"] },
  { slug: "pangkalpinang", name: "Pangkalpinang", province: "Bangka Belitung", lat: -2.1316, lng: 106.1169, aliases: ["pangkal pinang"] },
  { slug: "tanjungpinang", name: "Tanjungpinang", province: "Kepulauan Riau", lat: 0.9188, lng: 104.4554, aliases: ["tanjung pinang"] },
  { slug: "batam", name: "Batam", province: "Kepulauan Riau", lat: 1.0456, lng: 104.0305, aliases: [] },
  {
    slug: "jakarta",
    name: "Jakarta",
    province: "DKI Jakarta",
    lat: -6.2088,
    lng: 106.8456,
    aliases: ["dki", "dki jakarta", "jakarta pusat", "jakarta selatan", "jakarta utara", "jakarta barat", "jakarta timur", "cibubur", "kuningan", "narus", "neo", "kelapa gading", "gambir", "senayan"],
  },
  { slug: "bogor", name: "Bogor", province: "Jawa Barat", lat: -6.595, lng: 106.8166, aliases: [] },
  { slug: "depok", name: "Depok", province: "Jawa Barat", lat: -6.4025, lng: 106.7942, aliases: [] },
  { slug: "tangerang", name: "Tangerang", province: "Banten", lat: -6.1783, lng: 106.6319, aliases: [] },
  {
    slug: "tangerang-selatan",
    name: "Tangerang Selatan",
    province: "Banten",
    lat: -6.2889,
    lng: 106.7181,
    aliases: ["tangsel", "bsd", "bsd city", "serpong", "bintaro"],
  },
  { slug: "bekasi", name: "Bekasi", province: "Jawa Barat", lat: -6.2383, lng: 106.9756, aliases: [] },
  { slug: "serang", name: "Serang", province: "Banten", lat: -6.1209, lng: 106.1503, aliases: [] },
  { slug: "cilegon", name: "Cilegon", province: "Banten", lat: -6.0186, lng: 106.0539, aliases: [] },
  { slug: "bandung", name: "Bandung", province: "Jawa Barat", lat: -6.9175, lng: 107.6191, aliases: [] },
  { slug: "cirebon", name: "Cirebon", province: "Jawa Barat", lat: -6.7063, lng: 108.557, aliases: [] },
  { slug: "tasikmalaya", name: "Tasikmalaya", province: "Jawa Barat", lat: -7.3506, lng: 108.2172, aliases: [] },
  { slug: "semarang", name: "Semarang", province: "Jawa Tengah", lat: -6.9667, lng: 110.4167, aliases: [] },
  { slug: "surakarta", name: "Surakarta", province: "Jawa Tengah", lat: -7.5755, lng: 110.8243, aliases: ["solo"] },
  { slug: "pekalongan", name: "Pekalongan", province: "Jawa Tengah", lat: -6.8886, lng: 109.6753, aliases: [] },
  { slug: "tegal", name: "Tegal", province: "Jawa Tengah", lat: -6.8694, lng: 109.1402, aliases: [] },
  { slug: "yogyakarta", name: "Yogyakarta", province: "DI Yogyakarta", lat: -7.7956, lng: 110.3695, aliases: ["jogja", "yogya"] },
  { slug: "surabaya", name: "Surabaya", province: "Jawa Timur", lat: -7.2575, lng: 112.7521, aliases: [] },
  { slug: "malang", name: "Malang", province: "Jawa Timur", lat: -7.9666, lng: 112.6326, aliases: [] },
  { slug: "kediri", name: "Kediri", province: "Jawa Timur", lat: -7.8166, lng: 112.011, aliases: [] },
  { slug: "denpasar", name: "Denpasar", province: "Bali", lat: -8.6705, lng: 115.2126, aliases: ["bali"] },
  { slug: "mataram", name: "Mataram", province: "Nusa Tenggara Barat", lat: -8.5833, lng: 116.1167, aliases: ["lombok"] },
  { slug: "kupang", name: "Kupang", province: "Nusa Tenggara Timur", lat: -10.1772, lng: 123.607, aliases: [] },
  { slug: "pontianak", name: "Pontianak", province: "Kalimantan Barat", lat: -0.0263, lng: 109.3425, aliases: [] },
  { slug: "palangkaraya", name: "Palangka Raya", province: "Kalimantan Tengah", lat: -2.2109, lng: 113.9204, aliases: ["palangka raya"] },
  { slug: "banjarmasin", name: "Banjarmasin", province: "Kalimantan Selatan", lat: -3.3186, lng: 114.5944, aliases: [] },
  { slug: "samarinda", name: "Samarinda", province: "Kalimantan Timur", lat: -0.5014, lng: 117.1536, aliases: [] },
  { slug: "balikpapan", name: "Balikpapan", province: "Kalimantan Timur", lat: -1.2379, lng: 116.8529, aliases: [] },
  { slug: "tarakan", name: "Tarakan", province: "Kalimantan Utara", lat: 3.3274, lng: 117.5785, aliases: [] },
  { slug: "manado", name: "Manado", province: "Sulawesi Utara", lat: 1.4748, lng: 124.8421, aliases: [] },
  { slug: "gorontalo", name: "Gorontalo", province: "Gorontalo", lat: 0.5435, lng: 123.0568, aliases: [] },
  { slug: "palu", name: "Palu", province: "Sulawesi Tengah", lat: -0.8917, lng: 119.8707, aliases: [] },
  { slug: "mamuju", name: "Mamuju", province: "Sulawesi Barat", lat: -2.6748, lng: 118.8886, aliases: [] },
  { slug: "makassar", name: "Makassar", province: "Sulawesi Selatan", lat: -5.1477, lng: 119.4327, aliases: ["ujung pandang"] },
  { slug: "kendari", name: "Kendari", province: "Sulawesi Tenggara", lat: -3.9674, lng: 122.5149, aliases: [] },
  { slug: "ambon", name: "Ambon", province: "Maluku", lat: -3.6954, lng: 128.1814, aliases: [] },
  { slug: "ternate", name: "Ternate", province: "Maluku Utara", lat: 0.788, lng: 127.377, aliases: [] },
  { slug: "sofifi", name: "Sofifi", province: "Maluku Utara", lat: 0.721, lng: 127.556, aliases: [] },
  { slug: "jayapura", name: "Jayapura", province: "Papua", lat: -2.5916, lng: 140.669, aliases: [] },
  { slug: "sorong", name: "Sorong", province: "Papua Barat", lat: -0.876, lng: 131.2558, aliases: [] },
  { slug: "manokwari", name: "Manokwari", province: "Papua Barat", lat: -0.8615, lng: 134.062, aliases: [] },
  { slug: "timika", name: "Timika", province: "Papua Tengah", lat: -4.545, lng: 136.888, aliases: [] },
  { slug: "merauke", name: "Merauke", province: "Papua Selatan", lat: -8.496, lng: 140.395, aliases: [] },
];

export const INDONESIA_CENTER: [number, number] = [-2.5, 118];
export const INDONESIA_BOUNDS: [[number, number], [number, number]] = [
  [-11.6, 94.7],
  [6.3, 141.2],
];

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[_/,.|-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function findCity(text: string): IndonesiaCity | null {
  const n = normalize(text);
  if (!n) return null;

  const exact = INDONESIA_CITIES.find((city) => city.slug === n || normalize(city.name) === n);
  if (exact) return exact;

  const needles = INDONESIA_CITIES.flatMap((city) =>
    [city.name, city.slug.replace(/-/g, " "), ...city.aliases].map((alias) => ({
      city,
      alias: normalize(alias),
    })),
  ).sort((a, b) => b.alias.length - a.alias.length);

  for (const { city, alias } of needles) {
    if (!alias || alias.length < 3) continue;
    if (n === alias) return city;
    const re = new RegExp(`(^|[^a-z0-9])${escapeRegExp(alias)}([^a-z0-9]|$)`);
    if (re.test(n)) return city;
  }
  return null;
}

export function cityBySlug(slug?: string | null) {
  if (!slug) return null;
  return INDONESIA_CITIES.find((city) => city.slug === slug) ?? findCity(slug);
}

export type DeviceSiteInput = {
  city?: string | null;
  location?: string | null;
};

export function resolveDeviceCity(device: DeviceSiteInput) {
  if (device.city) {
    const hit = cityBySlug(device.city) ?? findCity(device.city);
    if (hit) return hit;
  }
  if (device.location) return findCity(device.location);
  return null;
}

export function normalizeCityInput(value?: string | null) {
  if (!value?.trim()) return null;
  return findCity(value)?.slug ?? cityBySlug(value.trim())?.slug ?? null;
}

export type MappedDevice<T extends DeviceSiteInput> = T & { site: IndonesiaCity };

export function groupDevicesByCity<T extends DeviceSiteInput>(devices: T[]) {
  const buckets = new Map<string, { city: IndonesiaCity; devices: T[] }>();
  const unmapped: T[] = [];

  for (const device of devices) {
    const city = resolveDeviceCity(device);
    if (!city) {
      unmapped.push(device);
      continue;
    }
    const bucket = buckets.get(city.slug) ?? { city, devices: [] };
    bucket.devices.push(device);
    buckets.set(city.slug, bucket);
  }

  const sites = Array.from(buckets.values()).sort(
    (a, b) => b.devices.length - a.devices.length || a.city.name.localeCompare(b.city.name),
  );
  return { sites, unmapped };
}
