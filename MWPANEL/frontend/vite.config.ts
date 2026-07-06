import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Generate dynamic timestamp for cache busting
const timestamp = process.env.TIMESTAMP || `DAYJS-FIX-${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '')}`

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: './dist',
    rollupOptions: {
      output: {
        entryFileNames: `[name]-${timestamp}.js`,
        chunkFileNames: `[name]-${timestamp}.js`,
        assetFileNames: `[name]-${timestamp}.[ext]`,
        manualChunks: {
          vendor: ['react', 'react-dom'],
          antd: ['antd', '@ant-design/icons'],
          router: ['react-router-dom'],
          utils: ['axios', 'dayjs', 'zod']
        }
      }
    },
    sourcemap: false,
    minify: false, // Disabled for debugging
    target: 'es2015',
    chunkSizeWarningLimit: 1000
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@services': path.resolve(__dirname, './src/services'),
      '@store': path.resolve(__dirname, './src/store'),
      '@utils': path.resolve(__dirname, './src/utils'),
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      'plataforma.mundoworld.school',
      'typequest.mundoworld.school',
      '.mundoworld.school'
    ],
    proxy: {
      '/api': {
        target: 'http://mw-panel-backend:3000',
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Proxy request to:', proxyReq.path);
          });
        }
      },
    },
  },
})