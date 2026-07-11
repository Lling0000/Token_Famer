import { execFileSync } from 'node:child_process';

let output = '';
try {
  output = execFileSync('git', ['grep', '-n', '-E', 'TODO|FIXME', '--', '*.ts', '*.tsx'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
} catch (error) {
  if (error?.status !== 1) throw error;
}

const invalid = output
  .split(/\r?\n/)
  .filter(Boolean)
  .filter((line) => !/TODO\(#\d+\):/.test(line));

if (invalid.length > 0) {
  console.error('TODO comments must use TODO(#issue-number): reason');
  console.error(invalid.join('\n'));
  process.exit(1);
}
