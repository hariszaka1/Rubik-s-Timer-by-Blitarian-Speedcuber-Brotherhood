import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Ganti sesuai dengan nama repo GitHub kamu
const repoName = 'Rubik-s-Timer-by-Blitarian-Speedcuber-Brotherhood';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    base: `/${repoName}/`, // <--- penting untuk GitHub Pages
    plugins: [react()],     // <--- penting untuk React support

    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'), // disarankan alias ke /src
      }
    }
  };
});
