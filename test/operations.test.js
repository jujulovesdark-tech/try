const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createProfiles, launchProfiles } = require('../src/operations');
const { createErrorLogger } = require('../src/logger');
const { validateProfileInputs } = require('../src/validation');

test('validateProfileInputs enforces max profile upper bound', () => {
  const names = Array.from({ length: 3 }, (_, index) => `profile-${index}`);
  assert.throws(() => validateProfileInputs({ profileNames: names, maxProfiles: 2 }), /exceeds upper bound/);
});

test('createProfiles batches filesystem work and captures per-item failures', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'profiles-'));
  const logger = createErrorLogger({ logFilePath: path.join(tmp, 'errors.log') });

  fs.mkdirSync(path.join(tmp, 'taken'));
  const result = await createProfiles({
    profileNames: ['alpha', 'taken', 'beta'],
    baseDir: tmp,
    batchSize: 2,
    logger,
  });

  assert.equal(result.summary.total, 3);
  assert.equal(result.summary.succeeded, 2);
  assert.equal(result.summary.failed, 1);
  assert.match(result.message, /Review logs/);
  const logContents = fs.readFileSync(logger.logFilePath, 'utf8');
  assert.match(logContents, /createProfiles/);
});

test('launchProfiles supports cancellation and summary includes cancelled count', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'launch-'));
  const logger = createErrorLogger({ logFilePath: path.join(tmp, 'launch-errors.log') });
  const controller = new AbortController();

  let count = 0;
  const launcher = async ({ signal }) => {
    count += 1;
    if (count === 1) {
      controller.abort();
      return;
    }
    if (signal.aborted) {
      const error = new Error('Operation cancelled.');
      error.name = 'AbortError';
      throw error;
    }
  };

  const result = await launchProfiles({
    profileNames: ['one', 'two', 'three'],
    profileDir: tmp,
    launchConcurrency: 3,
    logger,
    launcher,
    signal: controller.signal,
  });

  assert.equal(result.summary.total, 3);
  assert.equal(result.summary.cancelled >= 1, true);
});
