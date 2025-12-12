import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carga todas las variables de entorno, incluyendo las que no tienen el prefijo VITE_
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Reemplaza process.env.API_KEY con el valor real (string) durante el build
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      // Define un objeto vacío para process.env por seguridad, para evitar crash si alguna librería accede a él
      'process.env': {}
    }
  }
})