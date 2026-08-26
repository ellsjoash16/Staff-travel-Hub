// Country name → ISO 3166-1 alpha-2 code (lowercase), for flag lookups.
// Covers the destinations DAFAGRAM uses (see regions.ts) plus common variants.
const NAME_TO_ISO: Record<string, string> = {
  // Middle East
  'uae': 'ae', 'united arab emirates': 'ae', 'saudi arabia': 'sa', 'bahrain': 'bh', 'kuwait': 'kw',
  'qatar': 'qa', 'oman': 'om', 'jordan': 'jo', 'lebanon': 'lb', 'israel': 'il', 'palestine': 'ps',
  'iraq': 'iq', 'iran': 'ir', 'yemen': 'ye', 'egypt': 'eg',
  // Caribbean
  'jamaica': 'jm', 'barbados': 'bb', 'trinidad and tobago': 'tt', 'trinidad & tobago': 'tt',
  'bahamas': 'bs', 'cuba': 'cu', 'dominican republic': 'do', 'haiti': 'ht', 'antigua and barbuda': 'ag',
  'saint lucia': 'lc', 'st lucia': 'lc', 'grenada': 'gd', 'aruba': 'aw', 'cayman islands': 'ky',
  'turks and caicos': 'tc', 'bermuda': 'bm', 'saint kitts and nevis': 'kn', 'st kitts': 'kn',
  'saint vincent and the grenadines': 'vc', 'st vincent': 'vc', 'martinique': 'mq', 'guadeloupe': 'gp',
  'puerto rico': 'pr', 'us virgin islands': 'vi', 'british virgin islands': 'vg', 'anguilla': 'ai',
  'montserrat': 'ms', 'dominica': 'dm', 'sint maarten': 'sx', 'curaçao': 'cw', 'curacao': 'cw', 'bonaire': 'bq',
  // Asia
  'japan': 'jp', 'china': 'cn', 'thailand': 'th', 'singapore': 'sg', 'vietnam': 'vn', 'indonesia': 'id',
  'malaysia': 'my', 'philippines': 'ph', 'south korea': 'kr', 'hong kong': 'hk', 'taiwan': 'tw',
  'cambodia': 'kh', 'myanmar': 'mm', 'laos': 'la', 'brunei': 'bn', 'timor-leste': 'tl', 'maldives': 'mv',
  'sri lanka': 'lk', 'bangladesh': 'bd', 'nepal': 'np', 'bhutan': 'bt', 'mongolia': 'mn', 'india': 'in', 'pakistan': 'pk',
  // Europe
  'france': 'fr', 'spain': 'es', 'italy': 'it', 'germany': 'de', 'uk': 'gb', 'united kingdom': 'gb',
  'england': 'gb', 'scotland': 'gb', 'wales': 'gb', 'portugal': 'pt', 'netherlands': 'nl', 'belgium': 'be',
  'switzerland': 'ch', 'austria': 'at', 'greece': 'gr', 'turkey': 'tr', 'sweden': 'se', 'norway': 'no',
  'denmark': 'dk', 'finland': 'fi', 'iceland': 'is', 'ireland': 'ie', 'poland': 'pl', 'czech republic': 'cz',
  'hungary': 'hu', 'romania': 'ro', 'croatia': 'hr', 'slovenia': 'si', 'malta': 'mt', 'cyprus': 'cy',
  'luxembourg': 'lu', 'monaco': 'mc', 'andorra': 'ad', 'san marino': 'sm', 'slovakia': 'sk', 'serbia': 'rs',
  'montenegro': 'me', 'russia': 'ru', 'ukraine': 'ua', 'bulgaria': 'bg', 'estonia': 'ee', 'latvia': 'lv', 'lithuania': 'lt',
  // Africa
  'south africa': 'za', 'morocco': 'ma', 'kenya': 'ke', 'tanzania': 'tz', 'mauritius': 'mu', 'seychelles': 'sc',
  'namibia': 'na', 'botswana': 'bw', 'zimbabwe': 'zw', 'zambia': 'zm', 'nigeria': 'ng', 'ghana': 'gh',
  'ethiopia': 'et', 'uganda': 'ug', 'rwanda': 'rw', 'tunisia': 'tn', 'algeria': 'dz', 'madagascar': 'mg',
  'mozambique': 'mz', 'senegal': 'sn', 'ivory coast': 'ci', "cote d'ivoire": 'ci',
  // Americas
  'usa': 'us', 'us': 'us', 'united states': 'us', 'united states of america': 'us', 'america': 'us',
  'canada': 'ca', 'mexico': 'mx', 'brazil': 'br', 'argentina': 'ar', 'chile': 'cl', 'peru': 'pe',
  'colombia': 'co', 'costa rica': 'cr', 'ecuador': 'ec', 'bolivia': 'bo', 'uruguay': 'uy', 'panama': 'pa',
  'guatemala': 'gt', 'belize': 'bz', 'nicaragua': 'ni', 'venezuela': 've',
  // Oceania / Pacific
  'australia': 'au', 'new zealand': 'nz', 'fiji': 'fj', 'french polynesia': 'pf', 'tahiti': 'pf',
  'bora bora': 'pf', 'samoa': 'ws', 'tonga': 'to', 'vanuatu': 'vu', 'cook islands': 'ck', 'new caledonia': 'nc',
  'papua new guinea': 'pg', 'solomon islands': 'sb', 'palau': 'pw',
}

/** ISO 3166-1 alpha-2 code (lowercase) for a country name, or null if unknown. */
export function countryIso(country?: string | null): string | null {
  if (!country) return null
  return NAME_TO_ISO[country.trim().toLowerCase()] ?? null
}

/** Crisp SVG flag URL (flagpedia / flagcdn) for a country name — scales sharply at any size. */
export function countryFlagUrl(country?: string | null): string | null {
  const iso = countryIso(country)
  return iso ? `https://flagcdn.com/${iso}.svg` : null
}
