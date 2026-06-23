const { defineConfig } = require('vite');
const react = require('@vitejs/plugin-react');
const path = require('path');

module.exports = defineConfig({
  root: path.join(__dirname, 'client'),
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:3000',
      '/health': 'http://127.0.0.1:3000',
      '/api-info': 'http://127.0.0.1:3000'
    }
  },
  build: {
    outDir: path.join(__dirname, 'public'),
    emptyOutDir: true
  }
});
