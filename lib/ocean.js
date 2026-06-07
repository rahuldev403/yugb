//* Stage 1: Ocean.io (The Expansion)
//* Goal: Take one domain and return a clean array of strings (lookalike domains).
//* Logic: Extract only the domain strings. If Ocean.io fails or returns zero results, the pipeline must throw a hard error, because the rest of the chain cannot run without this data.

import axios from "axios";
import chalk from "chalk";
import ora from "ora";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url, payload, headers, retries = 3) {
  try {
    return await axios.post(url, payload, { headers });
  } catch (error) {
    const status = error.response?.status;

    if (status >= 500 && status < 600 && retries > 0) {
      console.warn(
        chalk.yellow(
          `\n  ⚠️ Ocean.io server glitched (Status ${status}). Retrying in 5 seconds... (${retries} attempts left)`,
        ),
      );
      await delay(5000); // Wait 5 seconds
      return fetchWithRetry(url, payload, headers, retries - 1);
    }

    throw error;
  }
}

export async function getLookalikes(seedDomain) {
  console.log(
    chalk.cyan(
      `\n[1/4] Fetching lookalikes for ${chalk.bold(seedDomain)} from Ocean.io...`,
    ),
  );
  const spinner = ora("Searching Ocean.io...").start();

  let allDomains = [];
  let nextCursor = null;
  let hasMore = true;
  const MAX_DOMAINS = 20;

  try {
    while (hasMore && allDomains.length < MAX_DOMAINS) {
      const payload = {
        size: 20,
        companiesFilters: {
          lookalikeDomains: [seedDomain],
        },
      };

      if (nextCursor) payload.searchAfter = nextCursor;

      const response = await fetchWithRetry(
        "https://api.ocean.io/v3/search/companies",
        payload,
        {
          "X-Api-Token": process.env.OCEAN_IO_API_KEY,
          "Content-Type": "application/json",
        },
      );

      const batch = response.data.companies.map((c) => c.domain);
      allDomains.push(...batch);

      // Only grab the next page if we haven't hit our limit
      if (response.data.searchAfter && allDomains.length < MAX_DOMAINS) {
        nextCursor = response.data.searchAfter;
        spinner.text = `Fetched ${allDomains.length} domains so far, grabbing next page...`;
      } else {
        hasMore = false;
      }
    }

    spinner.stop();

    // Trim the array just in case the final batch pushed us slightly over 20
    allDomains = allDomains.slice(0, MAX_DOMAINS);

    console.log(
      chalk.green(
        `✅ Finished: Filtered down to ${chalk.bold(allDomains.length)} lookalike companies.`,
      ),
    );
    return allDomains;
  } catch (error) {
    spinner.fail("Ocean.io Search Failed");
    const detailedError = error.response?.data
      ? JSON.stringify(error.response.data, null, 2)
      : error.message;
    throw new Error(`Ocean.io API Failed:\n${detailedError}`);
  }
}
