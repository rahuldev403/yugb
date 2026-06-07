#!/usr/bin/env node
import "dotenv/config";
import inquirer from "inquirer";
import chalk from "chalk";
import figlet from "figlet";
import gradient from "gradient-string";
import boxen from "boxen";
import ora from "ora";
import Table from "cli-table3";

import { getLookalikes } from "./lib/ocean.js";
import { getDecisionMakers } from "./lib/prospeo.js";
import { resolveEmails } from "./lib/eazyreach.js";
import { sendOutreach } from "./lib/brevo.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  try {
    console.clear();
    const title = figlet.textSync("V-LABS PIPELINE", { font: "Standard" });
    console.log(gradient.pastel.multiline(title));
    console.log(
      boxen(chalk.italic("The Ultimate Autonomous Outreach Engine"), {
        padding: 1,
        margin: 1,
        borderStyle: "round",
        borderColor: "magenta",
      }),
    );

    const { seed } = await inquirer.prompt([
      {
        type: "input",
        name: "seed",
        message: chalk.cyan("Enter the seed domain (e.g., target.com):"),
        validate: (input) => (input ? true : "Domain is required"),
      },
    ]);

    console.log(
      chalk.magenta(`\n🚀 Firing pipeline for: ${chalk.bold(seed)}\n`),
    );
    await sleep(500);

    // Stage 1 -> Stage 2 -> Stage 3
    // const domains = await getLookalikes(seed);
    const domains = ["vercel.com", "stripe.com", "linear.app"];
    const executives = await getDecisionMakers(domains);
    const verifiedContacts = await resolveEmails(executives);

    // THE SAFETY CHECKPOINT
    console.log(
      `\n${chalk.bgGray.white.bold(" ================ PIPELINE SUMMARY ================ ")}`,
    );

    // Create an attractive table
    const table = new Table({
      head: [
        chalk.green("Name"),
        chalk.green("Title"),
        chalk.green("Company"),
        chalk.green("Email"),
        chalk.green("LinkedIn"),
      ],
      style: {
        head: [],
        border: ["gray"],
      },
    });

    verifiedContacts.forEach((contact) => {
      table.push([
        contact.name || chalk.gray("N/A"),
        contact.title ? contact.title.substring(0, 30) : chalk.gray("N/A"),
        contact.company || chalk.gray("N/A"),
        chalk.blue.underline(contact.email || ""),
        contact.linkedinUrl
          ? chalk.blue.underline(contact.linkedinUrl)
          : chalk.gray("N/A"),
      ]);
    });

    console.log(table.toString());
    console.log(
      `${chalk.bgGray.white.bold(" ================================================== ")}\n`,
    );

    const { confirm } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirm",
        message: chalk.yellow(
          `🔥 Fire personalized emails to these ${chalk.bold(verifiedContacts.length)} verified contacts?`,
        ),
        default: false,
      },
    ]);

    if (!confirm) {
      console.log(chalk.red("\n✋ Pipeline halted. No emails sent.\n"));
      process.exit(0);
    }

    // Stage 4
    console.log(chalk.cyan(`\nInitiating dispatch sequence...`));
    await sendOutreach(verifiedContacts);

    console.log(
      boxen(chalk.green.bold("✅ Pipeline execution completed successfully!"), {
        padding: 1,
        margin: 1,
        borderStyle: "double",
        borderColor: "green",
      }),
    );
  } catch (error) {
    console.error(
      boxen(chalk.red.bold(`❌ Fatal Pipeline Error:\n\n${error.message}`), {
        padding: 1,
        borderStyle: "bold",
        borderColor: "red",
      }),
    );
  }
}

run();
