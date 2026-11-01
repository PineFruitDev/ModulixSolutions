const { spawnSync } = require('node:child_process');
const baseline = require('../docs/dependencies/audit-baseline.json');
const result = spawnSync('npm', ['audit', '--json'], { encoding: 'utf8' });
let audit;
try { audit = JSON.parse(result.stdout); } catch { throw new Error('npm audit did not return JSON'); }
if (result.error || ![0, 1].includes(result.status) || audit.error || !audit.vulnerabilities) throw new Error('npm audit failed');
const findings = Object.entries(audit.vulnerabilities).flatMap(([name, v]) => v.via.filter(x => typeof x === 'object').map(x => ({name, url:x.url, severity:x.severity, range:x.range})));
const unexpected = findings.filter(x => !baseline.some(b => JSON.stringify(b) === JSON.stringify(x)));
console.log(JSON.stringify({ totals: audit.metadata.vulnerabilities, unexpected }, null, 2));
if (unexpected.length) process.exitCode = 1;
