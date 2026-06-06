// *Stage 2: Prospeo (The Targeting)
// *Goal: Iterate through the domains, find employees, and filter for C-Suite/VP decision-makers.
// *Logic: We use the processInBatches utility. If one domain out of 50 fails, we log the warning but continue processing the other 49.

import axios from "axios";
import { processInBatches } from "./utils";

export async function getDecisionMakers(domains) {
  console.log(
    `\n[2/4] Hunting C-Suite across ${domains.length} domains via Prospeo...`,
  );

  const targetTitles = ["CEO", "CTO", "VP", "Founder", "Chief", "Director"];
  const validExecutives = [];

  const results = await processInBatches(domains, 5, async (domain) => {
    const response = await axios.post(
      "https://api.prospeo.io/v1/domain-search",
      {
        company_domain: domain,
      },
      {
        headers: { "X-KEY": process.env.PROSPEO_API_KEY },
        timeout: 15000,
      },
    );
    return { domain, data: response.data };
  });

  results.forEach((result) => {
    if (result.status === "fulfilled" && result.value.data.employees) {
      const decisionMakers = result.value.data.employees.filter((emp) =>
        targetTitles.some((title) =>
          emp.job_title?.toUpperCase().includes(title.toUpperCase()),
        ),
      );
      decisionMakers.forEach((dm) => {
        validExecutives.push({
          name: dm.full_name,
          title: dm.job_title,
          linkedinUrl: dm.linkedin_url,
          company: result.value.domain,
        });
      });
    } else if (result.status === "rejected") {
      console.warn(`⚠️ Prospeo failed for a domain: ${result.reason.message}`);
    }
  });

  console.log(`✅ Extracted ${validExecutives.length} high-level executives.`);
  return validExecutives;
}
