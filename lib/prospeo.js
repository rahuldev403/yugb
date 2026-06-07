import axios from "axios";
import chalk from "chalk";
import ora from "ora";
import { processInBatches, delay } from "./utils.js";

export async function getDecisionMakers(domains) {
  console.log(
    chalk.cyan(
      `\n[2/4] Hunting C-Suite across ${chalk.bold(domains.length)} domains via Prospeo...`,
    ),
  );

  const spinner = ora("Initializing Prospeo bulk search...").start();
  const validExecutives = [];

  const results = await processInBatches(domains, 1, async (domain) => {
    try {
      spinner.text = `Cooling down for 2.5s to respect Prospeo rate limits...`;
      await delay(2500);
      spinner.text = `Extracting targets from: ${domain}`;

      const response = await axios.post(
        "https://api.prospeo.io/search-person",
        {
          filters: {
            company: { websites: { include: [domain] } },
            person_seniority: {
              include: ["C-Suite", "Vice President", "Founder/Owner"],
            },
          },
        },
        {
          headers: {
            "X-KEY": process.env.PROSPEO_API_KEY,
            "Content-Type": "application/json",
          },
          timeout: 15000,
        },
      );
      return { domain, data: response.data };
    } catch (error) {
      if (error.response?.data?.error_code === "NO_RESULTS") {
        return { domain, data: null };
      }

      const apiError = error.response?.data
        ? JSON.stringify(error.response.data)
        : error.message;
      throw new Error(`[${domain}] ${apiError}`);
    }
  });

  spinner.stop();

  results.forEach((result) => {
    if (
      result.status === "fulfilled" &&
      result.value.data &&
      Array.isArray(result.value.data.results)
    ) {
      const records = result.value.data.results;

      records.forEach((record) => {
        const personData = record.person;
        if (personData) {
          const linkedIn =
            personData.linkedin_url || personData.linkedin || null;

          if (linkedIn) {
            validExecutives.push({
              name:
                personData.full_name || personData.name || "Unknown Executive",
              title: personData.job_title || personData.title || "Executive",
              linkedinUrl: linkedIn,
              company: result.value.domain,
            });
          }
        }
      });
    } else if (result.status === "rejected") {
      console.warn(
        chalk.yellow(
          `⚠️ Prospeo failed for a domain: ${result.reason.message}`,
        ),
      );
    }
  });

  console.log(
    chalk.green(
      `✅ Extracted ${chalk.bold(validExecutives.length)} high-level executives.`,
    ),
  );
  return validExecutives;
}
