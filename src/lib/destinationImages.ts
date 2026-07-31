// Curated, verified Unsplash photos per destination. Used as a fallback image
// for a trip that has no uploaded photo of its own, matched on the trip's
// location name (city) first, then its country. Every URL below has been
// checked to return 200. Unmatched destinations fall back to the gradient.

const U = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=800&q=75`

// A destination maps to one image, or several — when a location has more than
// one photo, trips at that location cycle through them so they don't all look
// identical.
const DESTINATION_IMAGES: Record<string, string | string[]> = {
  // ── Cities (checked first) ──
  'dubai':        U('1512453979798-5ea266f8880c'),
  'abu dhabi':    'https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/2015_Abu_Dhabi_Grand_Prix_-_Race_start_%2822882439484%29.jpg/960px-2015_Abu_Dhabi_Grand_Prix_-_Race_start_%2822882439484%29.jpg',
  'bali':         U('1537996194471-e657df975ab4'),
  'marrakech':    U('1539020140153-e479b8c22e70'),
  'phuket':       U('1552465011-b4e21bf6e79a'),
  'paris':        U('1502602898657-3e91760cbb34'),
  'london':       U('1513635269975-59663e0ac1ad'),
  'new york':     U('1496442226666-8d4d0e62e6e9'),
  'las vegas':    U('1605833556294-ea5c7a74f57d'),
  'orlando':      U('1597466599360-3b9775841aec'),
  'rome':         U('1552832230-c0197dd311b5'),
  'venice':       U('1514890547357-a9ee288728e0'),
  'barcelona':    U('1583422409516-2895a77efded'),
  'santorini':    U('1570077188670-e3a8d69ac5ff'),
  'tokyo':        U('1540959733332-eab4deabeeaf'),
  'sydney':       U('1506973035872-a4ec16b8e8d9'),
  'istanbul':     U('1541432901042-2d8bd64b4a9b'),
  'cairo':        U('1539768942893-daf53e448371'),
  'lisbon':       U('1585208798174-6cedd86e019a'),
  'amsterdam':    U('1534351590666-13e3e96b5017'),
  'dubrovnik':    U('1589553416260-f586c8f1514f'),
  'cancun':       U('1512813195386-6cf811ad3542'),
  'cape town':    U('1580060839134-75a5edca2e99'),
  'agra':         U('1524492412937-b28074a5d7da'),
  'havana':       U('1500759285222-a95626b934cb'),
  'punta cana':   U('1584467735815-f778f274e296'),
  'boston':       U('1501979376754-2ff867a4f659'),
  'chicago':      'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/The_Skyline_Of_Chicago_%28224996407%29.jpeg/960px-The_Skyline_Of_Chicago_%28224996407%29.jpeg',
  'bruges':       U('1491557345352-5929e343eb89'),
  'doha':         [
    'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Doha_West_Bay_Skyline_Qatar_Jan_2020.jpg/960px-Doha_West_Bay_Skyline_Qatar_Jan_2020.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/View_of_the_Persian_Gulf_and_the_Museum_of_Islamic_Art_in_Qatar_at_dusk.jpg/960px-View_of_the_Persian_Gulf_and_the_Museum_of_Islamic_Art_in_Qatar_at_dusk.jpg',
  ],
  'seoul':        U('1517154421773-0529f29ea451'),
  'seville':      U('1558370781-d6196949e317'),
  'verona':       'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Verona_cityscape_sunny.jpg/960px-Verona_cityscape_sunny.jpg',
  'golden triangle': U('1599661046289-e31897846e41'),
  'hawaii':       'https://images.unsplash.com/photo-1542259009477-d625272157b7?auto=format&fit=crop&w=1600&q=80',
  'honolulu':     'https://images.unsplash.com/photo-1542259009477-d625272157b7?auto=format&fit=crop&w=1600&q=80',
  'maui':         'https://images.unsplash.com/photo-1542259009477-d625272157b7?auto=format&fit=crop&w=1600&q=80',

  // ── Countries (fallback) ──
  'united arab emirates': U('1512453979798-5ea266f8880c'),
  'uae':                  U('1512453979798-5ea266f8880c'),
  'indonesia':           U('1537996194471-e657df975ab4'),
  'maldives':            U('1573843981267-be1999ff37cd'),
  'morocco':             U('1539020140153-e479b8c22e70'),
  'thailand':            U('1552465011-b4e21bf6e79a'),
  'france':              U('1502602898657-3e91760cbb34'),
  'united kingdom':      U('1513635269975-59663e0ac1ad'),
  'uk':                  U('1513635269975-59663e0ac1ad'),
  'usa':                 U('1496442226666-8d4d0e62e6e9'),
  'united states':       U('1496442226666-8d4d0e62e6e9'),
  'italy':               U('1552832230-c0197dd311b5'),
  'spain':               U('1583422409516-2895a77efded'),
  'greece':              U('1570077188670-e3a8d69ac5ff'),
  'japan':               U('1540959733332-eab4deabeeaf'),
  'australia':           U('1506973035872-a4ec16b8e8d9'),
  'singapore':           U('1525625293386-3f8f99389edd'),
  'turkey':              U('1541432901042-2d8bd64b4a9b'),
  'egypt':               U('1539768942893-daf53e448371'),
  'iceland':             U('1504829857797-ddff29c27927'),
  'switzerland':         U('1531366936337-7c912a4589a7'),
  'portugal':            U('1585208798174-6cedd86e019a'),
  'netherlands':         U('1534351590666-13e3e96b5017'),
  'croatia':             U('1589553416260-f586c8f1514f'),
  'mexico':              U('1512813195386-6cf811ad3542'),
  'mauritius':           'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Le_Morne_Beach_with_Le_Morne_Brabant_Mountain_in_the_background%2C_Mauritius_%2853698223315%29.jpg/960px-Le_Morne_Beach_with_Le_Morne_Brabant_Mountain_in_the_background%2C_Mauritius_%2853698223315%29.jpg',
  'seychelles':          U('1589979481223-deb893043163'),
  'south africa':        U('1580060839134-75a5edca2e99'),
  'vietnam':             U('1528127269322-539801943592'),
  'india':               U('1524492412937-b28074a5d7da'),
  'sri lanka':           U('1566296314736-6eaac1ca0cb9'),
  'jamaica':             U('1580237072617-771c3ecc4a24'),
  'barbados':            U('1591017403286-fd8493524e1e'),
  'cyprus':              U('1596436889106-be35e843f974'),
  'malta':               U('1558271736-cd043ef2e855'),
  'ireland':             U('1549918864-48ac978761a4'),
  'germany':             U('1560969184-10fe8719e047'),
  'canada':              U('1517935706615-2717063c2225'),
  'cuba':                U('1500759285222-a95626b934cb'),
  'dominican republic':  U('1584467735815-f778f274e296'),
  'costa rica':          U('1518259102261-b40117eabbc9'),
  'new zealand':         U('1507699622108-4be3abd695ad'),
  'antigua':             U('1590523741831-ab7e8b8f9c7f'),
  'qatar':               [
    'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Doha_West_Bay_Skyline_Qatar_Jan_2020.jpg/960px-Doha_West_Bay_Skyline_Qatar_Jan_2020.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/View_of_the_Persian_Gulf_and_the_Museum_of_Islamic_Art_in_Qatar_at_dusk.jpg/960px-View_of_the_Persian_Gulf_and_the_Museum_of_Islamic_Art_in_Qatar_at_dusk.jpg',
  ],
  'belgium':             U('1491557345352-5929e343eb89'),
  'south korea':         U('1517154421773-0529f29ea451'),
  'kenya':               U('1516426122078-c23e76319801'),
}

export function destinationImage(name?: string | null, country?: string | null, variant = 0): string | null {
  const n = name?.trim().toLowerCase()
  const c = country?.trim().toLowerCase()
  const val = (n && DESTINATION_IMAGES[n]) || (c && DESTINATION_IMAGES[c]) || null
  if (!val) return null
  return Array.isArray(val) ? val[variant % val.length] : val
}

type TripLike = { image?: string | null; locationId?: string | null }
type LocationLike = { id: string; name: string; country: string; imageUrl?: string | null }

// Dead legacy uploads live in the (now billing-disabled) Firebase bucket and
// will never load again — treat them as absent.
export function isUsableImage(url?: string | null): boolean {
  return !!url && !url.includes('firebasestorage')
}

// The image to actually show for a trip: its destination's photo when it has a
// location, otherwise its own usable upload; null means no image available.
export function tripImage(trip: TripLike, locations: LocationLike[], variant = 0): string | null {
  const loc = trip.locationId ? locations.find(l => l.id === trip.locationId) : null
  const locPhoto = loc ? (loc.imageUrl || destinationImage(loc.name, loc.country, variant)) : null
  return locPhoto || (isUsableImage(trip.image) ? (trip.image as string) : null)
}
