// Сборка игры в один самодостаточный HTML-файл: dist/index.html
// (открывается двойным щелчком, без сервера).
import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const watch = process.argv.includes('--watch');

async function build() {
  const res = await esbuild.build({
    entryPoints: ['src/main.js'],
    bundle: true,
    format: 'iife',
    minify: true,
    target: ['es2020'],
    write: false,
    legalComments: 'none',
    loader: { '.jpg': 'dataurl' },
  });
  const js = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  const css = readFileSync('src/styles.css', 'utf8');
  const html = readFileSync('src/index.html', 'utf8')
    .replace('<!--STYLE-->', () => `<style>\n${css}\n</style>`)
    .replace('<!--SCRIPT-->', () => `<script>\n${js}\n</script>`);
  mkdirSync('dist', { recursive: true });
  writeFileSync('dist/index.html', html);
  // вариант для публикации страницей Claude: без doctype/html/head/body (их добавляет просмотрщик)
  const head = html.match(/<head>([\s\S]*?)<\/head>/)[1]
    .replace(/<meta charset[^>]*>\s*/, '').replace(/<meta name="viewport"[^>]*>\s*/, '');
  const body = html.match(/<body>([\s\S]*)<\/body>/)[1];
  writeFileSync('dist/artifact.html', head.trim() + '\n' + body.trim() + '\n');
  console.log(`dist/index.html: ${(html.length / 1024).toFixed(0)} КБ`);
}

if (watch) {
  const ctx = await esbuild.context({ entryPoints: ['src/main.js'], bundle: true, write: false, loader: { '.jpg': 'dataurl' }, plugins: [{ name: 'rebuild', setup(b) { b.onEnd(() => build().catch((e) => console.error(e))); } }] });
  await ctx.watch();
  console.log('Слежение за изменениями…');
} else {
  await build();
}
