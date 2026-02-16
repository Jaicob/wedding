import { defineConfig, loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { createHash } from 'node:crypto';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const password = env.PASSWORD || 'changeme';
  const hash = createHash('sha256')
    .update(password.trim().toLowerCase())
    .digest('hex');

  const discountCode = env.DISCOUNT_CODE || '';

  return {
    base: '/',
    plugins: [tailwindcss()],
    define: {
      __PASSWORD_HASH__: JSON.stringify(hash),
      __DISCOUNT_CODE__: JSON.stringify(discountCode),
    },
    build: {
      outDir: 'dist',
    },
  };
});
