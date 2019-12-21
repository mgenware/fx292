import * as assert from 'assert';
import * as cp from 'child_process';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require('../package.json');

it('CLI --version', () => {
  assert.equal(
    cp.execSync('node ./dist/main.js --version').toString(),
    `${pkg.version}\n`,
  );
});
