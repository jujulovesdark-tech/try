function isAbortError(error) {
  return error && (error.name === 'AbortError' || error.code === 'ABORT_ERR');
}

async function runBatched(items, worker, {
  batchSize = 1,
  signal,
  onProgress,
} = {}) {
  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new Error('batchSize must be a positive integer.');
  }

  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    if (signal?.aborted) {
      break;
    }

    const batch = items.slice(i, i + batchSize);
    // eslint-disable-next-line no-await-in-loop
    const settled = await Promise.allSettled(
      batch.map((item, index) => worker(item, i + index, signal)),
    );

    settled.forEach((entry, localIndex) => {
      const globalIndex = i + localIndex;
      if (entry.status === 'fulfilled') {
        results.push({
          ok: true,
          index: globalIndex,
          item: items[globalIndex],
          value: entry.value,
        });
      } else {
        results.push({
          ok: false,
          index: globalIndex,
          item: items[globalIndex],
          error: isAbortError(entry.reason) ? new Error('Operation cancelled.') : entry.reason,
        });
      }
      onProgress?.(results.at(-1));
    });
  }

  return results;
}

module.exports = {
  runBatched,
};
