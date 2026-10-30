import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// GitHub Pages serves the project at /weather/
export default defineConfig({
  base: process.env.BASE_PATH ?? '/weather/',
  plugins: [svelte()],
  test: {
    include: ['src/**/*.test.ts'],
  },
});
