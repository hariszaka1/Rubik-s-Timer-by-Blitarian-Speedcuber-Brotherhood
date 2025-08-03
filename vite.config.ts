import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react'; // Tambahan untuk React support

// Ganti sesuai nama repositori GitHub kamu
const repoName = 'Rubik-s-Timer-by-Blitarian-Speedcuber-Brotherhood';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    base: `/${repoName}/`, // Penting agar GitHub Pages bisa membaca path dengan benar
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src') // Disarankan mengarah ke /src, bukan root
      }
    }
  };
});
