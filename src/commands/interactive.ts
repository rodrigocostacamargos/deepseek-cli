import * as readline from 'node:readline';
import { stdin as input, stdout as output } from 'node:process';
import chalk from 'chalk';
import ora from 'ora';
import { DeepSeekAPI, Message } from '../api';
import { Config } from '../config';

export async function interactiveCommand(config: Config, injectedApi?: DeepSeekAPI): Promise<void> {
  const api = injectedApi || new DeepSeekAPI(config);
  const history: Message[] = [];
  
  // Check Ollama connection if using local mode
  if (config.useLocal) {
    const isConnected = await api.checkOllamaConnection();
    if (!isConnected) {
      console.log(chalk.red('⚠️  Cannot connect to Ollama at'), chalk.white(config.ollamaHost));
      console.log(chalk.yellow('Make sure Ollama is running:'), chalk.white('ollama serve'));
      console.log(chalk.yellow('Install the model:'), chalk.white(`ollama pull ${config.model}`));
      console.log('');
    } else {
      console.log(chalk.green('✅ Connected to Ollama'));
      const models = await api.listOllamaModels();
      if (!models.includes(config.model)) {
        console.log(chalk.yellow(`⚠️  Model '${config.model}' not found locally`));
        console.log(chalk.yellow('Install it with:'), chalk.white(`ollama pull ${config.model}`));
      }
      console.log('');
    }
  }
  
  const rl = readline.createInterface({ input, output });

  const ask = (query: string): Promise<string> => {
    return new Promise((resolve) => rl.question(query, resolve));
  };

  try {
    while (true) {
      const userInput = await ask(chalk.green('deepseek-cli > '));
      
      if (userInput === null || userInput === undefined) break;

      const trimmed = userInput.trim();
      
      if (trimmed.toLowerCase() === 'exit' || trimmed.toLowerCase() === 'quit') {
        console.log(chalk.yellow('\nGoodbye! 👋'));
        break;
      }

      if (trimmed) {
        const spinner = ora('Thinking...').start();
        
        try {
          history.push({ role: 'user', content: trimmed });
          
          const MAX_HISTORY = 20;
          if (history.length > MAX_HISTORY) {
            history.splice(0, history.length - MAX_HISTORY);
          }

          const response = await api.complete(history);
          history.push({ role: 'assistant', content: response });
          
          spinner.stop();
          console.log('\n' + formatResponse(response) + '\n');
        } catch (error) {
          spinner.stop();
          history.pop();
          console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        }
      }
    }
  } finally {
    rl.close();
  }
}

function formatResponse(response: string): string {
  // Format code blocks
  let formatted = response.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const header = lang ? chalk.gray(`\`\`\`${lang}`) : chalk.gray('```');
    return header + '\n' + chalk.white(code.trim()) + '\n' + chalk.gray('```');
  });
  
  // Format inline code
  formatted = formatted.replace(/`([^`]+)`/g, chalk.bgGray.white(' $1 '));
  
  // Format headers
  formatted = formatted.replace(/^#{1,3} (.+)$/gm, chalk.bold.cyan('$1'));
  
  // Format bold
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, chalk.bold('$1'));
  
  return formatted;
}
