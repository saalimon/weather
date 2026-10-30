/** WMO weather interpretation codes, as returned by Open-Meteo. */
export type Mood = 'clear' | 'cloud' | 'fog' | 'rain' | 'storm' | 'snow';

interface CodeInfo {
  label: string;
  mood: Mood;
  icon: string;
}

const CODES: Record<number, CodeInfo> = {
  0: { label: 'Clear sky', mood: 'clear', icon: '☀' },
  1: { label: 'Mainly clear', mood: 'clear', icon: '🌤' },
  2: { label: 'Partly cloudy', mood: 'cloud', icon: '⛅' },
  3: { label: 'Overcast', mood: 'cloud', icon: '☁' },
  45: { label: 'Fog', mood: 'fog', icon: '🌫' },
  48: { label: 'Rime fog', mood: 'fog', icon: '🌫' },
  51: { label: 'Light drizzle', mood: 'rain', icon: '🌦' },
  53: { label: 'Drizzle', mood: 'rain', icon: '🌦' },
  55: { label: 'Dense drizzle', mood: 'rain', icon: '🌧' },
  56: { label: 'Freezing drizzle', mood: 'rain', icon: '🌧' },
  57: { label: 'Freezing drizzle', mood: 'rain', icon: '🌧' },
  61: { label: 'Light rain', mood: 'rain', icon: '🌦' },
  63: { label: 'Rain', mood: 'rain', icon: '🌧' },
  65: { label: 'Heavy rain', mood: 'rain', icon: '🌧' },
  66: { label: 'Freezing rain', mood: 'rain', icon: '🌧' },
  67: { label: 'Freezing rain', mood: 'rain', icon: '🌧' },
  71: { label: 'Light snow', mood: 'snow', icon: '🌨' },
  73: { label: 'Snow', mood: 'snow', icon: '🌨' },
  75: { label: 'Heavy snow', mood: 'snow', icon: '❄' },
  77: { label: 'Snow grains', mood: 'snow', icon: '🌨' },
  80: { label: 'Light showers', mood: 'rain', icon: '🌦' },
  81: { label: 'Showers', mood: 'rain', icon: '🌧' },
  82: { label: 'Violent showers', mood: 'storm', icon: '⛈' },
  85: { label: 'Snow showers', mood: 'snow', icon: '🌨' },
  86: { label: 'Snow showers', mood: 'snow', icon: '🌨' },
  95: { label: 'Thunderstorm', mood: 'storm', icon: '⛈' },
  96: { label: 'Thunderstorm, hail', mood: 'storm', icon: '⛈' },
  99: { label: 'Severe thunderstorm', mood: 'storm', icon: '⛈' },
};

export function describeCode(code: number | null | undefined, isDay = true): CodeInfo {
  const info = (code != null && CODES[code]) || { label: 'Unknown', mood: 'cloud' as Mood, icon: '·' };
  if (!isDay && info.mood === 'clear') return { ...info, icon: '☾' };
  return info;
}
