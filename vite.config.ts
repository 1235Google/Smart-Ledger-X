import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      sourcemap: false,
      minify: 'esbuild',
      cssCodeSplit: true,
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('three')) {
                return 'vendor-three';
              }
              if (id.includes('recharts') || id.includes('d3-') || id.includes('victory-vendor')) {
                return 'vendor-charts';
              }
              if (
                id.includes('jspdf') || 
                id.includes('html2canvas') || 
                id.includes('jszip') || 
                id.includes('papaparse') || 
                id.includes('file-saver')
              ) {
                return 'vendor-export-pdf';
              }
              if (id.includes('firebase')) {
                return 'vendor-firebase';
              }
              if (id.includes('@supabase')) {
                return 'vendor-supabase';
              }
              if (id.includes('motion') || id.includes('framer-motion')) {
                return 'vendor-motion';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              if (id.includes('date-fns')) {
                return 'vendor-date-fns';
              }
              if (id.includes('crypto-js')) {
                return 'vendor-crypto';
              }
            }
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
