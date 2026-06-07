// *Stage 4: Brevo (The Outreach)
// *Goal: Send the finalized payload to Brevo's v3 Transactional API.
// *Logic: Fire the emails individually or via Brevo's bulk endpoint. For maximum personalization reliability, dispatching them iteratively with a slight delay is the safest approach.

import axios from "axios";
import chalk from "chalk";
import ora from "ora";
import { delay } from "./utils.js";

export async function sendOutreach(contacts) {
  console.log(
    chalk.cyan(`\n[4/4] Dispatching personalized emails via Brevo...`),
  );
  if (!process.env.BREVO_API_KEY) {
    console.error(chalk.red("\n❌ FATAL ERROR: BREVO_API_KEY is undefined."));
    console.error(
      chalk.yellow(
        "Please ensure your .env file is loaded properly using dotenv.config() in index.js",
      ),
    );
    return;
  }

  let successCount = 0;
  let failCount = 0;

  const spinner = ora("Connecting to Brevo SMTP...").start();

  for (const contact of contacts) {
    try {
      spinner.text = `Sending to ${contact.email}...`;
      await axios.post(
        "https://api.brevo.com/v3/smtp/email",
        {
          sender: { name: "Rahul Swain", email: "rahul@rahulswain.me" },
          to: [{ email: contact.email, name: contact.name }],
          subject: `Quick question regarding ${contact.company}`,
          htmlContent: `
          <div style="font-family: sans-serif; font-size: 14px; color: #333;">
            <p>Hi ${contact.name},</p>
            <p>I noticed your work as ${contact.title} at ${contact.company}. I'm building an automated top-of-funnel pipeline and would love your feedback on the architecture.</p>
            <p>Open to a quick chat this week?</p>
            <p>Best,<br>Rahul</p>
          </div>
        `,
        },
        {
          headers: {
            accept: "application/json",
            "Content-Type": "application/json",
            "api-key": process.env.BREVO_API_KEY,
          },
        },
      );

      spinner.succeed(chalk.green(`  ✅ Sent: ${contact.email}`));
      successCount++;
      spinner.start();

      await delay(200);
    } catch (error) {
      spinner.fail(
        chalk.red(
          `  ❌ Failed to send to ${contact.email}: ${error.response?.data?.message || error.message}`,
        ),
      );
      failCount++;
      spinner.start();
    }
  }

  spinner.stop();

  console.log(
    chalk.magenta(
      `\n🎉 Outreach Complete: ${chalk.bold.green(`${successCount} sent`)}, ${chalk.bold.red(`${failCount} failed`)}.`,
    ),
  );
}
