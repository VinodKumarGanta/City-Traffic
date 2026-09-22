export const CITY_COORDINATES: Record<string, { center: [number, number]; zoom: number }> = {
  'Vijayawada Smart Transit Hub': { center: [16.5062, 80.6480], zoom: 13 },
  'Eluru Traffic Center': { center: [16.7107, 81.0952], zoom: 14 },
  'Rajahmundry Godavari Sector': { center: [17.0005, 81.7750], zoom: 13 },
  'Visakhapatnam Metro Command': { center: [17.6868, 83.2185], zoom: 13 },
  'Guntur Urban Transit': { center: [16.3067, 80.4365], zoom: 13 },
  'Tirupati Temple Corridor': { center: [13.6288, 79.4192], zoom: 13 },
  'Hyderabad Command Center': { center: [17.4300, 78.4100], zoom: 13 },
  'Cyberabad IT Zone': { center: [17.4435, 78.3772], zoom: 14 },
  'Secunderabad North Sector': { center: [17.4412, 78.4870], zoom: 14 },
};

export const CITY_OPTIONS = [
  { group: 'Andhra Pradesh', values: [
    'Vijayawada Smart Transit Hub',
    'Eluru Traffic Center',
    'Rajahmundry Godavari Sector',
    'Visakhapatnam Metro Command',
    'Guntur Urban Transit',
    'Tirupati Temple Corridor',
  ]},
  { group: 'Telangana', values: [
    'Hyderabad Command Center',
    'Cyberabad IT Zone',
    'Secunderabad North Sector',
  ]},
];

export function getCityConfig(city?: string) {
  return (city && CITY_COORDINATES[city]) || CITY_COORDINATES['Hyderabad Command Center'];
}
