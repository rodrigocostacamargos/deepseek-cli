import * as fs from 'node:fs/promises';
import chalk from 'chalk';
import ora from 'ora';
import { DeepSeekAPI } from '../api';
import { Config } from '../config';

export async function completeCommand(filePath: string, config: Config): Promise<void> {
  const spinner = ora(`Analyzing ${filePath}...`).start();
  
  try {
    const content = await fs.readFile(filePath, 'utf8');
    
    if (!content.includes('<FILL>')) {
      spinner.fail('No <FILL> marker found in the file.');
      console.log(chalk.gray('\nUsage: Add <FILL> in your file where you want the code to be completed.'));
      return;
    }

    const parts = content.split('<FILL>');
    const prefix = parts[0];
    const suffix = parts[1];
    
    const api = new DeepSeekAPI(config);
    spinner.text = 'Generating missing code...';
    
    const suggestion = await api.completeCode(prefix, suffix);
    
    spinner.succeed('Suggestion generated!');
    
    console.log(chalk.blue('\n--- SUGGESTED CODE ---'));
    console.log(chalk.green(suggestion));
    console.log(chalk.blue('----------------------\n'));
    
    console.log(chalk.gray('(Tip: Copy and paste the green code into your file)'));

  } catch (error) {
    spinner.fail('Error processing file');
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
  }
}