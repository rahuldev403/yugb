//* Stage 1: Ocean.io (The Expansion)
//* Goal: Take one domain and return a clean array of strings (lookalike domains).
//* Logic: Extract only the domain strings. If Ocean.io fails or returns zero results, the pipeline must throw a hard error, because the rest of the chain cannot run without this data.

import axios from "axios";

// Our custom retry function for 5xx server errors
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url, payload, headers, retries = 3) {
  try {
    return await axios.post(url, payload, { headers });
  } catch (error) {
    const status = error.response?.status;

    // If it's a 5xx error (like our 520 Cloudflare error) AND we have retries left
    if (status >= 500 && status < 600 && retries > 0) {
      console.warn(
        `\n  ⚠️ Ocean.io server glitched (Status ${status}). Retrying in 5 seconds... (${retries} attempts left)`,
      );
      await delay(5000); // Wait 5 seconds
      return fetchWithRetry(url, payload, headers, retries - 1); // Try again
    }

    throw error; // If it's a 4xx error or we are out of retries, throw it
  }
}

export async function getLookalikes(seedDomain) {
  console.log(`\n[1/4] Fetching lookalikes for ${seedDomain} from Ocean.io...`);

  let allDomains = [];
  let nextCursor = null;
  let hasMore = true;
  const MAX_DOMAINS = 20; // 👈 Sensible default to protect API budgets

  try {
    // 👈 Stop looping if we hit our cap
    while (hasMore && allDomains.length < MAX_DOMAINS) {
      const payload = {
        size: 20, // 👈 Lower the payload size so we don't over-fetch
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
        console.log(
          `  Fetched ${allDomains.length} domains so far, grabbing next page...`,
        );
      } else {
        hasMore = false;
      }
    }

    // Trim the array just in case the final batch pushed us slightly over 20
    allDomains = allDomains.slice(0, MAX_DOMAINS);

    console.log(
      `✅ Finished: Filtered down to ${allDomains.length} lookalike companies.`,
    );
    return allDomains;
  } catch (error) {
    const detailedError = error.response?.data
      ? JSON.stringify(error.response.data, null, 2)
      : error.message;
    throw new Error(`Ocean.io API Failed:\n${detailedError}`);
  }
}
