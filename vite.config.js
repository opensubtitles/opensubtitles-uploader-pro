import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  build: {
    sourcemap: false
  },
  server: {
    sourcemapIgnoreList: () => true,
    host: true, // Allow external connections
    allowedHosts: ['uploader.opensubtitles.org']
  },
  preview: {
    host: true, // Allow external connections
    allowedHosts: ['uploader.opensubtitles.org']
  },
  esbuild: {
    sourcemap: false
  }
})

