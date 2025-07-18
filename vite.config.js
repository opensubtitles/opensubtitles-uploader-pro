import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  
  // Add worker configuration for FFmpeg WebAssembly
  worker: {
    format: 'es',
    plugins: () => [react()]
  },
  
  // Optimize dependencies for FFmpeg and archive-wasm
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util', 'archive-wasm']
  },
  build: {
    sourcemap: false,
    target: 'esnext', // Support top-level await
    format: 'es',
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom'],
          'router': ['react-router-dom'],
          'crypto': ['crypto-js', 'pako'],
          
          // App chunks
          'services': [
            'src/services/api/openSubtitlesApi.js',
            'src/services/api/xmlrpc.js',
            'src/services/cache.js',
            'src/services/movieHash.js',
            'src/services/subtitleHash.js',
            'src/services/fileProcessing.js',
            'src/services/guessItService.js',
            'src/services/subtitleUploadService.js',
            'src/services/videoMetadataService.js'
          ],
          'hooks': [
            'src/hooks/useDebugMode.js',
            'src/hooks/useFileHandling.js',
            'src/hooks/useLanguageData.js',
            'src/hooks/useLanguageDetection.js',
            'src/hooks/useMovieGuess.js',
            'src/hooks/useGuessIt.js',
            'src/hooks/useUserSession.js',
            'src/hooks/useCheckSubHash.js',
            'src/hooks/useVideoMetadata.js'
          ],
          'components': [
            'src/components/FileList/FileList.jsx',
            'src/components/FileList/MovieGroup.jsx',
            'src/components/FileList/SubtitleFile.jsx',
            'src/components/FileList/VideoFile.jsx',
            'src/components/MatchedPairs.jsx',
            'src/components/OrphanedSubtitles.jsx',
            'src/components/DebugPanel.jsx',
            'src/components/SubtitlePreview.jsx',
            'src/components/UploadButton.jsx',
            'src/components/VideoMetadataDisplay.jsx'
          ],
          'utils': [
            'src/utils/fileUtils.js',
            'src/utils/constants.js',
            'src/utils/networkUtils.js',
            'src/utils/retryUtils.js',
            'src/utils/themeUtils.js'
          ]
        }
      }
    },
    chunkSizeWarningLimit: 600
  },
  server: {
    sourcemapIgnoreList: () => true,
    host: true, // Allow external connections
    allowedHosts: ['uploader.opensubtitles.org'],
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin'
    }
  },
  // Tauri expects a fixed port, and vite server will fail if the port is not available
  clearScreen: false,
  preview: {
    host: true, // Allow external connections
    allowedHosts: ['uploader.opensubtitles.org']
  },
  esbuild: {
    sourcemap: false,
    target: 'esnext' // Support top-level await
  }
})

