import { cp, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scenarioDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const siteDir = resolve(scenarioDir, '..');
const buildDir = resolve(scenarioDir, 'dist');

await cp(resolve(buildDir, 'index.html'), resolve(siteDir, 'scenario.html'));
await rm(resolve(siteDir, 'scenario-assets'), { recursive: true, force: true });
await cp(resolve(buildDir, 'scenario-assets'), resolve(siteDir, 'scenario-assets'), { recursive: true });
console.log('Published scenario.html and scenario-assets/.');
