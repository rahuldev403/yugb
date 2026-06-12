import axios from "axios";
import chalk from "chalk";
import ora from "ora";
import { processInBatches, delay } from "./utils.js";

export async function getDecisionMakers(companies) {
  console.log(
    chalk.cyan(
      `\n[2/4] Hunting C-Suite across ${chalk.bold(companies.length)} domains via Prospeo...`,
    ),
  );

  const spinner = ora("Initializing Prospeo bulk search...").start();
  const validExecutives = [];

  const results = await processInBatches(companies, 1, async (companyObj) => {
    // Determine if companyObj is just a string (old format) or an object (new format)
    const domain =
      typeof companyObj === "string" ? companyObj : companyObj.domain;
    const companyName =
      typeof companyObj === "string" ? companyObj : companyObj.name;

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
              include: [
                "C-Suite",
                "Vice President",
                "Founder/Owner",
                "Director",
                "Head",
                "Manager",
              ],
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
      return { domain, companyName, data: response.data };
    } catch (error) {
      if (error.response?.data?.error_code === "NO_RESULTS") {
        return { domain, companyName, data: null };
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

         f (linkedIn) {
            validExecutives.push({
              name: personData.full_name || personData.first_name || "Unknown Executive",
              title: personData.current_job_title || "Executive", 
              linkedinUrl: linkedIn,
              company: result.value.companyName || result.value.domain,
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

// What it does: Searches the domains for C-Suite executives and returns their names and LinkedIn URLs.

// The Logic: You pass the domains through your batch utility. You specifically filter for ["C-Suite", "Vice President", "Founder/Owner"]. When the data comes back, you use defensive mapping (personData.full_name || personData.name) to ensure the app doesn't break if Prospeo changes their JSON keys.

// Why it's impressive: You specifically catch the NO_RESULTS error code and return null instead of throwing a fatal error. This keeps the pipeline moving even if a domain has no executives.
