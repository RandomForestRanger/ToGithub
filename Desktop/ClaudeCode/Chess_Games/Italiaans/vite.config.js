import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // NOTE: If Vite + React doesn't work out, revisit and consider plain HTML + JS
  // with the same chess.js/chessboardjs CDN stack used in the other games.
});
