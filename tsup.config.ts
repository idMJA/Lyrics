import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: false,
  target: 'node16',
  outDir: 'dist',
  external: ['node-fetch', 'fetch-cookie'],
  outExtension({ format }) {
    return {
      js: format === 'cjs' ? '.js' : '.mjs',
    };
  },
  esbuildOptions(options) {
    options.platform = 'node';
  },
  onSuccess: async () => {
    console.log('✅ Build completed successfully!');
  },
});
