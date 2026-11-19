// scripts/sync-from-mobile.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const mobileDir = path.resolve(rootDir, '..', 'zendapp');

if (!fs.existsSync(mobileDir)) {
  console.error(`[ERROR] No se encontró el directorio móvil en: ${mobileDir}`);
  process.exit(1);
}

console.log('🔄 Sincronizando lógica compartida desde zendapp (móvil) a zendapp-web...');

// 1. Sincronizar locales de traducción (JSON)
const mobileLocalesDir = path.join(mobileDir, 'src', 'i18n', 'locales');
const webLocalesDir = path.join(rootDir, 'src', 'i18n', 'locales');

if (fs.existsSync(mobileLocalesDir)) {
  if (!fs.existsSync(webLocalesDir)) {
    fs.mkdirSync(webLocalesDir, { recursive: true });
  }
  const files = fs.readdirSync(mobileLocalesDir);
  files.forEach((file) => {
    if (file.endsWith('.json')) {
      const src = path.join(mobileLocalesDir, file);
      const dst = path.join(webLocalesDir, file);
      fs.copyFileSync(src, dst);
      console.log(`  ✓ Idioma sincronizado: ${file}`);
    }
  });
}

// 2. Sincronizar utilidades clave (currency.js, moraHelper.js)
const utilsToSync = ['currency.js', 'moraHelper.js'];
utilsToSync.forEach((file) => {
  const src = path.join(mobileDir, 'src', 'utils', file);
  const dst = path.join(rootDir, 'src', 'utils', file);
  if (fs.existsSync(src)) {
    let content = fs.readFileSync(src, 'utf8');
    // Asegurar compatibilidad de alias de exportación si no existe
    if (file === 'currency.js' && !content.includes('export const parseMoneyToNumeric =')) {
      content = content.replace(
        'export const formatMoneyInput = formatMoneyInputByCurrency;',
        'export const formatMoneyInput = formatMoneyInputByCurrency;\nexport const parseMoneyToNumeric = parseMoneyToNumericByCurrency;'
      );
    }
    fs.writeFileSync(dst, content, 'utf8');
    console.log(`  ✓ Utilidad sincronizada: ${file}`);
  }
});

console.log('✅ Sincronización finalizada exitosamente.');
