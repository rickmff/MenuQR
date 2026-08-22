import { register } from 'node:module';
register('./module-resolver.mjs', import.meta.url);
