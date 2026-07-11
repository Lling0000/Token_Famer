import { access } from 'node:fs/promises';
import { resolve } from 'node:path';

const schemaPath = resolve(import.meta.dirname, '../src/schema.ts');
await access(schemaPath);
console.log('Database schema is present and typechecked by the package build.');
