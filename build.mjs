import { mkdirSync, copyFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

mkdirSync('dist/resources', { recursive: true });
for (const name of readdirSync('public')) copyFileSync(join('public', name), join('dist', name));
// Publish only the selected portrait, never reference invitations or backups.
copyFileSync('resources/1000070477.png', 'dist/resources/1000070477.png');
console.log('Static invitation built in dist/');
