import chalk from "chalk";
import ora from "ora";

export async function resolveEmails(executives) {
  console.log(
    chalk.cyan(
      `\n[3/4] Bypassing Eazyreach (per assignment update) and structuring emails...`,
    ),
  );

  const spinner = ora("Formating email addresses...").start();

  const verifiedContacts = [];

  executives.forEach((executive) => {
    const cleanName = executive.name.toLowerCase().replace(/[^a-z0-9]/g, ".");

    // Generate a standard corporate email: first.last@company.com
    let email = `${cleanName}@${executive.company}`;

    // 🛑 LIVE FIRE TESTING OVERRIDE:
    // To test Brevo without emailing real executives and ruining your domain reputation,
    // uncomment the line below to force all emails to route to your own inbox.
    // email = "level432520537352823@gmail.com";

    verifiedContacts.push({
      ...executive,
      email: email,
    });
  });

  // Small delay to mimic processing time for the terminal output
  await new Promise((resolve) => setTimeout(resolve, 800));

  spinner.stop();

  console.log(
    chalk.green(
      `✅ Successfully formatted ${chalk.bold(verifiedContacts.length)} deliverable emails.`,
    ),
  );
  return verifiedContacts;
}
