# Fah · ฟ้า — Thailand weather, live

Near real-time weather tracking and prediction for Thailand, on an OpenStreetMap map.

**Live:** https://saalimon.github.io/weather/

| Horizon | What you get | Source |
|---|---|---|
| **Current** | Temperature, feels-like, humidity, wind, gusts, pressure, cloud, UV, PM2.5 / AQI | [Open-Meteo](https://open-meteo.com/) forecast + air-quality APIs |
| **Near real-time** | Rain radar loop (past ~2 h, 10-min frames) | [RainViewer](https://www.rainviewer.com/api.html) |
| | Himawari-9 infrared clouds (10-min) | [NASA GIBS](https://earthdata.nasa.gov/gibs) |
| | ~4,800 rain gauges (1 h / 24 h) and ~800 river-level stations with flood status | [ThaiWater](https://www.thaiwater.net/) (HII) |
| | VIIRS fire hotspots and flood extent | [GISTDA](https://www.gistda.or.th/) API gateway |
| **Short-range** | Next 6 h in 15-min steps (nowcast) and 48 h hourly | Open-Meteo |
| **Medium-range** | 16-day daily outlook | Open-Meteo |
| **Long-range** | 6-month weekly outlook from a 51-member seasonal ensemble (10/50/90 % spread) | Open-Meteo seasonal API |

Click anywhere on the map, search for a place, or use your location. The selection is kept in the URL hash
(`#lat,lon,name`) so links can be shared.

## Stack

- [Svelte 5](https://svelte.dev/) + Vite + TypeScript, deployed as a static site to GitHub Pages
- [Leaflet](https://leafletjs.com/) with OpenStreetMap tiles (darkened with a CSS filter; light mode toggle)
- [uPlot](https://github.com/leeoniya/uPlot) for charts
- Visual language from the Framer design system notes ([DESIGN.md](https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/framer/DESIGN.md)):
  near-black canvas, white display type with tight negative tracking, pill controls, charcoal cards, one
  gradient "spotlight" card, `#0099ff` reserved for links and focus.
- Motion follows the principles collected in
  [motion-ui-design](https://github.com/chaconnewu/awesome-augmented/blob/master/awesomes/motion-ui-design.md):
  Material "authentic motion" easing ([easings.net](https://easings.net/) curves), staggered entrances,
  direction-aware tab transitions, spring-driven tab indicator, tweened numbers and a radar timeline. All of
  it is disabled under `prefers-reduced-motion`. See `src/lib/motion.ts`.

## Develop

```sh
npm install
npm run dev        # http://localhost:5173/weather/
npm test           # unit tests (parsing, aggregation, nowcast summary)
npm run check      # svelte-check / TypeScript
npm run build
```

## GISTDA data

GISTDA's API needs a key, and anything shipped to the browser on a public site is public. So the key never
reaches the browser:

1. Register for a free key at <https://api-gateway.gistda.or.th/>.
2. In the repo: **Settings → Secrets and variables → Actions → New repository secret**, name it
   `GISTDA_API_KEY`.
3. The deploy workflow runs `scripts/fetch-gistda.mjs` on every push and every 30 minutes. The script writes
   `public/data/gistda.json`, which is published next to the site.

Until the secret exists the app shows the GISTDA layers as "not configured", and the 30-minute scheduled
runs are skipped. Endpoint paths can be overridden with `GISTDA_HOTSPOT_PATH` / `GISTDA_FLOOD_PATH` if
GISTDA changes them.

## Deploy

The workflow at `.github/workflows/deploy.yml` builds and publishes to Pages. One-time setup: **Settings →
Pages → Build and deployment → Source: GitHub Actions**.

## Notes

- Data refresh: radar every 5 min, ThaiWater every 10 min, forecasts every 15 min, GISTDA every 30 min.
  Everything refreshes when you come back to a tab that has been hidden for more than 5 min.
- Each source fails independently. If one is down, only its card or layer shows that it is unavailable.
- Forecasts are model output. For official warnings see the
  [Thai Meteorological Department](https://www.tmd.go.th/en).
