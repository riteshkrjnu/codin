import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  if (env.VITE_API_BASE_URL) {
    const api = new URL(env.VITE_API_BASE_URL);
    if (!['http:', 'https:'].includes(api.protocol) || api.origin !== env.VITE_API_BASE_URL.replace(/\/$/, '') || api.username || api.password) throw new Error('VITE_API_BASE_URL must be an HTTP(S) API origin without paths or credentials');
  }
  return {
    plugins: [react(), tailwindcss()],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        'react': path.resolve(__dirname, 'node_modules/react'),
        'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      },
    },
    server: {
      port: 5173,
      proxy: { '/api': env.DEV_API_TARGET || 'http://127.0.0.1:3000', '/health': env.DEV_API_TARGET || 'http://127.0.0.1:3000' },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
