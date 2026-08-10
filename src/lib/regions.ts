import type { Post, Location } from './types'

// Continents / regions, defined by the countries they contain. Shared by the
// feed (region tabs) and the admin Manage tab (continent folders).
export const REGIONS: { label: string; countries: string[] }[] = [
  {
    label: 'Middle East',
    countries: [
      'UAE', 'United Arab Emirates', 'Saudi Arabia', 'Bahrain', 'Kuwait', 'Qatar', 'Oman',
      'Jordan', 'Lebanon', 'Israel', 'Palestine', 'Iraq', 'Iran', 'Yemen', 'Egypt',
    ],
  },
  {
    label: 'Caribbean',
    countries: [
      'Jamaica', 'Barbados', 'Trinidad and Tobago', 'Trinidad & Tobago', 'Bahamas', 'Cuba',
      'Dominican Republic', 'Haiti', 'Antigua and Barbuda', 'Saint Lucia', 'Grenada',
      'Saint Vincent and the Grenadines', 'Aruba', 'Cayman Islands', 'Turks and Caicos',
      'Bermuda', 'Saint Kitts and Nevis', 'Martinique', 'Guadeloupe', 'Puerto Rico',
      'US Virgin Islands', 'British Virgin Islands', 'Anguilla', 'Montserrat', 'Dominica',
      'Sint Maarten', 'Curaçao', 'Bonaire', 'St Lucia', 'St Kitts', 'St Vincent',
    ],
  },
  {
    label: 'Asia',
    countries: [
      'Japan', 'China', 'Thailand', 'Singapore', 'Vietnam', 'Indonesia', 'Malaysia',
      'Philippines', 'South Korea', 'Hong Kong', 'Taiwan', 'Cambodia', 'Myanmar',
      'Laos', 'Brunei', 'Timor-Leste', 'Maldives', 'Sri Lanka', 'Bangladesh',
      'Nepal', 'Bhutan', 'Mongolia', 'India', 'Pakistan',
    ],
  },
  {
    label: 'Europe',
    countries: [
      'France', 'Spain', 'Italy', 'Germany', 'UK', 'United Kingdom', 'England', 'Scotland',
      'Wales', 'Portugal', 'Netherlands', 'Belgium', 'Switzerland', 'Austria', 'Greece',
      'Turkey', 'Sweden', 'Norway', 'Denmark', 'Finland', 'Iceland', 'Ireland', 'Poland',
      'Czech Republic', 'Hungary', 'Romania', 'Croatia', 'Slovenia', 'Malta', 'Cyprus',
      'Luxembourg', 'Monaco', 'Andorra', 'San Marino', 'Slovakia', 'Serbia', 'Montenegro',
      'Albania', 'North Macedonia', 'Bulgaria', 'Lithuania', 'Latvia', 'Estonia',
    ],
  },
  {
    label: 'Africa',
    countries: [
      'South Africa', 'Kenya', 'Morocco', 'Tanzania', 'Uganda', 'Rwanda', 'Ethiopia',
      'Ghana', 'Nigeria', 'Senegal', 'Ivory Coast', "Côte d'Ivoire", 'Mauritius',
      'Seychelles', 'Mozambique', 'Zambia', 'Zimbabwe', 'Botswana', 'Namibia',
      'Malawi', 'Madagascar', 'Reunion', 'Tunisia', 'Algeria', 'Libya',
    ],
  },
  {
    label: 'Americas',
    countries: [
      'USA', 'United States', 'United States of America', 'Canada', 'Mexico', 'Brazil',
      'Argentina', 'Chile', 'Peru', 'Colombia', 'Ecuador', 'Bolivia', 'Paraguay',
      'Uruguay', 'Venezuela', 'Panama', 'Costa Rica', 'Guatemala', 'Honduras',
      'El Salvador', 'Nicaragua', 'Belize',
    ],
  },
  {
    label: 'Pacific',
    countries: [
      'Australia', 'New Zealand', 'Fiji', 'Papua New Guinea', 'Vanuatu', 'Samoa',
      'Tonga', 'French Polynesia', 'Tahiti', 'New Caledonia', 'Palau',
      'Micronesia', 'Marshall Islands', 'Cook Islands',
    ],
  },
]

export function getRegion(country: string | undefined): string | null {
  if (!country) return null
  const c = country.trim().toLowerCase()
  for (const region of REGIONS) {
    if (region.countries.some((rc) => rc.toLowerCase() === c)) return region.label
  }
  return null
}

// All continents a post touches, via its location(s).
export function getPostRegions(post: Post, locations: Location[]): string[] {
  const ids = post.locationIds?.length ? post.locationIds : (post.locationId ? [post.locationId] : [])
  const set = new Set<string>()
  for (const id of ids) {
    const region = getRegion(locations.find((l) => l.id === id)?.country)
    if (region) set.add(region)
  }
  return [...set]
}
