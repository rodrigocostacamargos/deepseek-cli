#!/usr/bin/env node
import { config } from 'dotenv';
import { CLI } from './cli';
import chalk from 'chalk';

// Load environment variables
config();

async function main() {
  try {
    const cli = new CLI();
    await cli.run();
  } catch (error: any) {
    // Commander throws an error when it wants to exit (e.g., after displaying help or version)
    if (error.code === 'commander.helpDisplayed' || error.code === 'commander.version') {
      process.exit(0);
    }
    
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();