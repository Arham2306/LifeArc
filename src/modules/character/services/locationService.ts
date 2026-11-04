export interface CountryItem {
  name: string;
  code: string;
  flag: string;
}

// In-memory cache to prevent repeated API calls
const cityCache = new Map<string, string[]>();
let countriesCache: CountryItem[] | null = null;

// Offline fallback in case network is disconnected
const FALLBACK_COUNTRIES: CountryItem[] = [
  { name: 'United States', code: 'US', flag: '🇺🇸' },
  { name: 'United Kingdom', code: 'GB', flag: '🇬🇧' },
  { name: 'Pakistan', code: 'PK', flag: '🇵🇰' },
  { name: 'Canada', code: 'CA', flag: '🇨🇦' },
  { name: 'Australia', code: 'AU', flag: '🇦🇺' },
  { name: 'Japan', code: 'JP', flag: '🇯🇵' },
  { name: 'Germany', code: 'DE', flag: '🇩🇪' },
  { name: 'France', code: 'FR', flag: '🇫🇷' },
  { name: 'Brazil', code: 'BR', flag: '🇧🇷' },
  { name: 'India', code: 'IN', flag: '🇮🇳' },
  { name: 'South Korea', code: 'KR', flag: '🇰🇷' },
  { name: 'Italy', code: 'IT', flag: '🇮🇹' },
  { name: 'Spain', code: 'ES', flag: '🇪🇸' },
];

/**
 * Major cities per country placed at the top of the list so default selection
 * and random rolls pick well-known cities first while keeping the full API list searchable.
 */
export const MAJOR_CITIES: Record<string, string[]> = {
  'United States': ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Miami', 'San Francisco', 'Seattle', 'Boston', 'Austin'],
  'United Kingdom': ['London', 'Manchester', 'Birmingham', 'Edinburgh', 'Glasgow', 'Liverpool', 'Bristol'],
  'Pakistan': ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta'],
  'Canada': ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa', 'Edmonton'],
  'Australia': ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide'],
  'Japan': ['Tokyo', 'Osaka', 'Kyoto', 'Yokohama', 'Sapporo', 'Fukuoka', 'Nagoya'],
  'Germany': ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne', 'Stuttgart'],
  'France': ['Paris', 'Lyon', 'Marseille', 'Nice', 'Bordeaux', 'Toulouse'],
  'Brazil': ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador', 'Belo Horizonte'],
  'India': ['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune'],
  'South Korea': ['Seoul', 'Busan', 'Incheon', 'Daegu', 'Daejeon'],
  'Italy': ['Rome', 'Milan', 'Florence', 'Naples', 'Venice', 'Turin'],
  'Spain': ['Madrid', 'Barcelona', 'Valencia', 'Seville', 'Bilbao'],
  'China': ['Shanghai', 'Beijing', 'Shenzhen', 'Guangzhou', 'Chengdu'],
  'Turkey': ['Istanbul', 'Ankara', 'Izmir', 'Antalya', 'Bursa'],
  'Saudi Arabia': ['Riyadh', 'Jeddah', 'Mecca', 'Medina', 'Dammam'],
  'United Arab Emirates': ['Dubai', 'Abu Dhabi', 'Sharjah'],
  'Mexico': ['Mexico City', 'Guadalajara', 'Monterrey', 'Cancún', 'Puebla'],
  'Russia': ['Moscow', 'Saint Petersburg', 'Novosibirsk', 'Kazan'],
  'Indonesia': ['Jakarta', 'Surabaya', 'Bandung', 'Medan', 'Denpasar'],
  'Egypt': ['Cairo', 'Alexandria', 'Giza', 'Luxor'],
  'Nigeria': ['Lagos', 'Abuja', 'Kano', 'Ibadan'],
  'South Africa': ['Johannesburg', 'Cape Town', 'Durban', 'Pretoria'],
  'Argentina': ['Buenos Aires', 'Córdoba', 'Rosario', 'Mendoza'],
};

/**
 * Helper to convert 2-letter ISO code to Flag Emoji if API lacks unicodeFlag
 */
export function getFlagEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '🌐';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

/**
 * Fetch all ~250 countries with unicode flags from CountriesNow API
 */
export async function fetchAllCountries(): Promise<CountryItem[]> {
  if (countriesCache && countriesCache.length > 0) {
    return countriesCache;
  }

  try {
    const res = await fetch('https://countriesnow.space/api/v0.1/countries/flag/unicode', {
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    if (json.data && Array.isArray(json.data) && json.data.length > 0) {
      const parsed: CountryItem[] = json.data
        .map((item: { name: string; iso2: string; unicodeFlag?: string }) => ({
          name: item.name,
          code: item.iso2,
          flag: item.unicodeFlag || getFlagEmoji(item.iso2),
        }))
        .sort((a: CountryItem, b: CountryItem) => a.name.localeCompare(b.name));

      countriesCache = parsed;
      return parsed;
    }
  } catch (err) {
    console.warn('Failed to load countries from API, using fallback data:', err);
  }

  countriesCache = FALLBACK_COUNTRIES;
  return FALLBACK_COUNTRIES;
}

/**
 * Prioritizes major cities at the top of the list, followed by all other cities sorted A-Z.
 */
function prioritizeMajorCities(countryName: string, apiCities: string[]): string[] {
  const major = MAJOR_CITIES[countryName] ?? [];
  const majorSet = new Set(major.map((c) => c.toLowerCase()));
  const rest = apiCities
    .filter((c) => !majorSet.has(c.toLowerCase()))
    .sort((a, b) => a.localeCompare(b));
  return [...major, ...rest];
}

/**
 * Fetch all cities for a specific country from CountriesNow API
 */
export async function fetchCitiesForCountry(countryName: string): Promise<string[]> {
  if (!countryName) return [];

  if (cityCache.has(countryName)) {
    return cityCache.get(countryName)!;
  }

  try {
    const res = await fetch('https://countriesnow.space/api/v0.1/countries/cities', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ country: countryName }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    if (json.data && Array.isArray(json.data) && json.data.length > 0) {
      const cleaned: string[] = (json.data as unknown[])
        .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
        .map((c) => c.trim());

      const uniqueCities = Array.from(new Set<string>(cleaned));
      const ordered = prioritizeMajorCities(countryName, uniqueCities);

      cityCache.set(countryName, ordered);
      return ordered;
    }
  } catch (err) {
    console.warn(`Failed to fetch cities for ${countryName} from API:`, err);
  }

  const fallback = MAJOR_CITIES[countryName] || [countryName];
  cityCache.set(countryName, fallback);
  return fallback;
}

/**
 * Picks a good random city for "Surprise Me": favors major cities if known,
 * otherwise picks from the country's city list.
 */
export function pickRandomCity(countryName: string, cities: string[]): string {
  const major = MAJOR_CITIES[countryName];
  if (major && major.length > 0) {
    return major[Math.floor(Math.random() * major.length)];
  }
  if (cities.length > 0) {
    return cities[Math.floor(Math.random() * cities.length)];
  }
  return countryName;
}
