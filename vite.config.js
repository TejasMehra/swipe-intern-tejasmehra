import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // pdf.js needs this to find its worker file
  optimizeDeps: {
    exclude: ['pdfjs-dist']
  },
  build: {
    rollupOptions: {
      output: {
        // keep chunks sane for Vercel's 4MB limit
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-redux', '@reduxjs/toolkit'],
          pdfjs: ['pdfjs-dist'],
          xlsx: ['xlsx'],
        }
      }
    }
  }
})
