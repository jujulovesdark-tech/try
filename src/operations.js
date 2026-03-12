const fs = require('node:fs/promises');
const path = require('node:path');
const { DEFAULT_BATCH_SIZE, DEFAULT_LAUNCH_CONCURRENCY } = require('./constants');
const { runBatched } = require('./queue');
const { validateProfileInputs, ensureWritableDirectory } = require('./validation');

function summarizeResults(results, operation) {
  const succeeded = results.filter((result) => result.ok);
  const failed = results.filter((result) => !result.ok);
  const cancelled = failed.filter((result) => result.error?.message === 'Operation cancelled.').length;

  return {
    operation,
    total: results.length,
    succeeded: succeeded.length,
    failed: failed.length,
    cancelled,
    failures: failed.map((result) => ({
      profile: result.item,
      index: result.index,
      message: result.error?.message || String(result.error),
    })),
  };
}

function createActionableMessage(summary, noun) {
  if (summary.failed === 0) {
    return `${summary.succeeded}/${summary.total} ${noun} completed successfully.`;
  }

  if (summary.cancelled > 0 && summary.succeeded === 0) {
    return `Operation cancelled before any ${noun} could complete. You can retry with fewer items.`;
  }

  return `${summary.succeeded}/${summary.total} ${noun} completed. ${summary.failed} failed. Review logs and retry failed items.`;
}

async function createProfiles({
  profileNames,
  baseDir,
  batchSize = DEFAULT_BATCH_SIZE,
  signal,
  logger,
  fsOps = fs,
} = {}) {
  const normalizedNames = validateProfileInputs({ profileNames });
  ensureWritableDirectory(baseDir);

  const results = await runBatched(normalizedNames, async (profileName, index, activeSignal) => {
    if (activeSignal?.aborted) {
      const abortError = new Error('Operation cancelled.');
      abortError.name = 'AbortError';
      throw abortError;
    }

    const profilePath = path.join(baseDir, profileName);
    try {
      await fsOps.mkdir(profilePath, { recursive: false });
      return { profilePath, index };
    } catch (error) {
      logger?.log(error, { operation: 'createProfiles', profileName, profilePath });
      throw error;
    }
  }, { batchSize, signal });

  const summary = summarizeResults(results, 'createProfiles');
  return {
    summary,
    message: createActionableMessage(summary, 'profile creations'),
    logFilePath: logger?.logFilePath,
  };
}

async function launchProfiles({
  profileNames,
  profileDir,
  launchConcurrency = DEFAULT_LAUNCH_CONCURRENCY,
  signal,
  logger,
  launcher,
} = {}) {
  if (typeof launcher !== 'function') {
    throw new Error('launcher function is required.');
  }

  const normalizedNames = validateProfileInputs({ profileNames });
  ensureWritableDirectory(profileDir);

  const results = await runBatched(normalizedNames, async (profileName, index, activeSignal) => {
    if (activeSignal?.aborted) {
      const abortError = new Error('Operation cancelled.');
      abortError.name = 'AbortError';
      throw abortError;
    }

    const userDataDir = path.join(profileDir, profileName);
    try {
      await launcher({ profileName, userDataDir, index, signal: activeSignal });
      return { profileName, userDataDir };
    } catch (error) {
      logger?.log(error, { operation: 'launchProfiles', profileName, userDataDir });
      throw error;
    }
  }, {
    batchSize: launchConcurrency,
    signal,
  });

  const summary = summarizeResults(results, 'launchProfiles');
  return {
    summary,
    message: createActionableMessage(summary, 'launches'),
    logFilePath: logger?.logFilePath,
  };
}

module.exports = {
  createProfiles,
  launchProfiles,
  summarizeResults,
  createActionableMessage,
};
