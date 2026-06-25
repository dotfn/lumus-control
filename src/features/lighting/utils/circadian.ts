export interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
  sunriseHour: number;
  sunsetHour: number;
  lastSynced: string; // ISO string
}

export interface CircadianPoint {
  time: string;
  startHour: number;
  endHour: number;
  temp: number;
  dimming: number;
  name: string;
  desc: string;
}

// Formats fractional hour (e.g. 7.25 -> "07:15")
export function formatHour(h: number): string {
  const hh = Math.floor(h);
  const mm = Math.floor((h - hh) * 60);
  return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
}

// Parses ISO time string into fractional local hour
export function parseLocalHourFromIso(isoString: string): number {
  const date = new Date(isoString);
  return date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
}

/**
 * Offline solar equation calculations based on NOAA Solar Position algorithms.
 * Calculates sunrise/sunset local times with reasonable accuracy (~10 minutes).
 */
export function calculateSunriseSunsetOffline(latitude: number, longitude: number, date: Date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const day = Math.floor(diff / oneDay);

  // Solar declination (approximate)
  const declination = 23.45 * Math.sin((2 * Math.PI * (284 + day)) / 365) * (Math.PI / 180);
  const latRad = latitude * (Math.PI / 180);
  const cosH = -Math.tan(latRad) * Math.tan(declination);

  let H = 0;
  if (cosH >= 1) {
    H = 0; // Polar night
  } else if (cosH <= -1) {
    H = 180; // Polar day
  } else {
    H = Math.acos(cosH) * (180 / Math.PI);
  }

  const timezoneOffsetHours = -date.getTimezoneOffset() / 60;
  const b = (2 * Math.PI * (day - 81)) / 365;
  const equationOfTime = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
  
  const solarNoon = 12 - (longitude / 15) - (equationOfTime / 60) + timezoneOffsetHours;
  const sunriseHour = solarNoon - (H / 15);
  const sunsetHour = solarNoon + (H / 15);

  return {
    sunriseHour: Math.max(0, Math.min(24, sunriseHour)),
    sunsetHour: Math.max(0, Math.min(24, sunsetHour))
  };
}

/**
 * Fetch geolocation data based on public IP.
 * Uses ipapi.co with freeipapi.com as secondary fallback.
 */
export async function fetchIpLocation() {
  try {
    const res = await fetch('https://ipapi.co/json/');
    if (!res.ok) throw new Error();
    const data = await res.json();
    if (typeof data.latitude !== 'number' || typeof data.longitude !== 'number') {
      throw new Error('Invalid IP data');
    }
    return {
      latitude: data.latitude,
      longitude: data.longitude,
      city: data.city || undefined,
      country: data.country_name || undefined
    };
  } catch (e) {
    const res = await fetch('https://freeipapi.com/api/json');
    if (!res.ok) throw new Error();
    const data = await res.json();
    if (typeof data.latitude !== 'number' || typeof data.longitude !== 'number') {
      throw new Error('Invalid IP data');
    }
    return {
      latitude: data.latitude,
      longitude: data.longitude,
      city: data.cityName || undefined,
      country: data.countryName || undefined
    };
  }
}

/**
 * Fetches sunrise and sunset times. Falls back to offline astronomical math on network failure.
 */
export async function fetchSunriseSunset(latitude: number, longitude: number): Promise<{ sunriseHour: number; sunsetHour: number }> {
  try {
    const url = `https://api.sunrise-sunset.org/json?lat=${latitude}&lng=${longitude}&formatted=0`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('API request failed');
    const data = await res.json();
    if (data.status !== 'OK') throw new Error('API returned error');
    
    const sunriseHour = parseLocalHourFromIso(data.results.sunrise);
    const sunsetHour = parseLocalHourFromIso(data.results.sunset);
    return { sunriseHour, sunsetHour };
  } catch (error) {
    console.warn('Failed to fetch sunrise/sunset from API, falling back offline:', error);
    return calculateSunriseSunsetOffline(latitude, longitude);
  }
}

/**
 * Calculates dynamic daily timeline points based on Sunrise and Sunset local hours.
 */
export function getCircadianPoints(sunriseHour: number, sunsetHour: number): CircadianPoint[] {
  const t0 = 0.0;
  const t1 = Math.max(4.0, Math.min(9.0, sunriseHour - 1.0));
  const t2 = Math.max(t1 + 1.0, Math.min(12.0, sunriseHour + 2.0));
  const t3 = Math.max(t2 + 2.0, Math.min(21.0, sunsetHour - 2.0));
  const t4 = Math.max(t3 + 1.0, Math.min(23.0, sunsetHour + 1.0));
  const t5 = 24.0;

  return [
    {
      time: `${formatHour(t0)} - ${formatHour(t1)}`,
      startHour: t0,
      endHour: t1,
      temp: 2200,
      dimming: 15,
      name: 'Madrugada',
      desc: 'Luz cálida y suave para descansar',
    },
    {
      time: `${formatHour(t1)} - ${formatHour(t2)}`,
      startHour: t1,
      endHour: t2,
      temp: 3000,
      dimming: 60,
      name: 'Amanecer',
      desc: 'Luz moderada para despertar',
    },
    {
      time: `${formatHour(t2)} - ${formatHour(t3)}`,
      startHour: t2,
      endHour: t3,
      temp: 5000,
      dimming: 100,
      name: 'Día',
      desc: 'Blanco frío para concentración',
    },
    {
      time: `${formatHour(t3)} - ${formatHour(t4)}`,
      startHour: t3,
      endHour: t4,
      temp: 3500,
      dimming: 70,
      name: 'Tarde',
      desc: 'Temperatura y brillo medios',
    },
    {
      time: `${formatHour(t4)} - ${formatHour(t5)}`,
      startHour: t4,
      endHour: t5,
      temp: 2700,
      dimming: 40,
      name: 'Noche',
      desc: 'Relajante antes de dormir',
    },
  ];
}

/**
 * Gets the temp and dimming settings for a specific fractional hour.
 */
export function getCircadianSettingForHour(sunriseHour: number, sunsetHour: number, currentHour: number) {
  const points = getCircadianPoints(sunriseHour, sunsetHour);
  const point = points.find(p => currentHour >= p.startHour && currentHour < p.endHour);
  if (point) {
    return { temp: point.temp, dimming: point.dimming };
  }
  return { temp: 4000, dimming: 80 };
}
