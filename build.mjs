import { build } from 'vite';
const watch = process.argv.includes('--watch') ? {} : null;

await build({ configFile: 'vite.config.ts', build: { watch } });

const scripts = [
  ['content', 'src/content/youtube.ts'],
  ['background', 'src/background/service-worker.ts']
];
for (const [name, entry] of scripts) {
  await build({
    configFile: false,
    publicDir: false,
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      watch,
      lib: { entry, name: `WhyFeed_${name}`, formats: ['iife'], fileName: () => `${name}.js` }
    }
  });
}
console.log('\n✔ WhyFeed built → dist/  (Chrome → Extensions → Developer mode → Load unpacked → select dist)');
