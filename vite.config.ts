/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { splitVendorChunkPlugin } from 'vite';

export default defineConfig({
  plugins: [react(), splitVendorChunkPlugin()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.ts',
  },
  optimizeDeps: {
    include: ['gsap', '@gsap/react'],
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React chunk
          'react-vendor': ['react', 'react-dom'],
          // Animation library chunk
          gsap: ['gsap', '@gsap/react'],
          // Utils chunk
          utils: [
            './src/utils/lottery.ts',
            './src/utils/starfield.ts',
            './src/utils/animation.ts',
            './src/utils/seededRandom.ts',
          ],
          // Context chunk
          context: ['./src/context/AppContext.tsx', './src/context/LifetimeCalculatorContext.tsx'],
        },
      },
    },
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  assetsInclude: ['**/*.vert', '**/*.frag'],
});
