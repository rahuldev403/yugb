export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function processInBatches(items, batchSize, asyncCallback) {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    const batchResults = await Promise.allSettled(batch.map(asyncCallback));
    results.push(...batchResults);

    if (i + batchSize < items.length) await delay(1500);
  }
  return results;
}
