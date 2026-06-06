//* Stage 1: Ocean.io (The Expansion)
//* Goal: Take one domain and return a clean array of strings (lookalike domains).
//* Logic: Extract only the domain strings. If Ocean.io fails or returns zero results, the pipeline must throw a hard error, because the rest of the chain cannot run without this data.

import axios from "axios";

export async function getLookalikes(seedDomain) {
  console.log(
    `\n[1/4] Fetching lookalike domains for ${seedDomain} from Ocean.io...`,
  );

  try {
    const response = await axios.post(
      "https://api.ocean.io/v1/lookalikes",
      {
        domain: seedDomain,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OCEAN_IO_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      },
    );

    if (!response.data || !Array.isArray(response.data.lookalikes)) {
      throw new Error("Ocean.io returned an unexpected data structure.");
    }

    const domains = response.data.lookalikes.map((company) => company.domain);
    console.log(`✅ Found ${domains.length} lookalike companies.`);

    return domains;
  } catch (error) {
    const message = error.response
      ? error.response.data.message
      : error.message;
    throw new Error(`Stage 1 Failed (Ocean.io): ${message}`);
  }
}
