import * as readline from 'node:readline';
import { stdin as input, stdout as output } from 'node:process';
import chalk from 'chalk';
import ora from 'ora';
import { DeepSeekAPI, Message } from '../api';
import { Config } from '../config';
import { extractFilePaths, readFileContent } from '../utils/files';
import { getProjectMap } from '../utils/project';

export async function interactiveCommand(config: Config, injectedApi?: DeepSeekAPI): Promise<void> {
  const api = injectedApi || new DeepSeekAPI(config);
  const history: Message[] = [];
  
  // Start the project scan in the background
  const projectMapPromise = getProjectMap(process.cwd());
  
  console.log(chalk.cyan('🔍 Scanning project structure...'));
  const projectMap = await projectMapPromise;
  
  // Add project context to the very beginning of the history
  history.push({ 
    role: 'system', 
    content: `Project structure:\n${projectMap}\nUser can reference files using @path/to/file.` 
  });

  console.log(chalk.green('✅ Project mapped. ') + chalk.gray('Use @filename to include file content.\n'));
  
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

  // Keep the process alive explicitly
  process.stdin.resume();

  // Handle sudden stream closures
  rl.on('close', () => {
    // If we're not exiting voluntarily, something else closed us
    // but in a while(true) loop, we'll just let it break naturally.
  });

  const ask = (query: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(query, (answer) => {
        resolve(answer);
      });
    });
  };

  try {
    while (true) {
      let userInput: string;
      try {
        userInput = await ask(chalk.green('deepseek-cli > '));
      } catch (e) {
        // Se a pergunta falhar (ex: Ctrl+D), saímos do loop
        break;
      }
      
      if (userInput === undefined || userInput === null) continue;

      const trimmed = userInput.trim();
      
      if (trimmed.toLowerCase() === 'exit' || trimmed.toLowerCase() === 'quit') {
        console.log(chalk.yellow('\nGoodbye! 👋'));
        break;
      }

      if (trimmed) {
        const filePaths = extractFilePaths(trimmed);
        let enhancedPrompt = trimmed;

        if (filePaths.length > 0) {
          process.stdout.write(chalk.cyan('📖 Reading files... '));
          let filesContent = '';
          
          for (const filePath of filePaths) {
            const content = await readFileContent(filePath);
            if (content) {
              filesContent += content + '\n';
            } else {
              console.log(chalk.yellow(`\n⚠️  Could not read file: ${filePath}`));
            }
          }
          
          if (filesContent) {
            enhancedPrompt = `Context files:\n${filesContent}\nUser request: ${trimmed}`;
            process.stdout.write(chalk.green('Done.\n'));
          } else {
            process.stdout.write(chalk.yellow('Failed.\n'));
          }
        }

        console.log(chalk.gray('Thinking...'));
        
        try {
          history.push({ role: 'user', content: enhancedPrompt });
          
          const MAX_HISTORY = 20;
          if (history.length > MAX_HISTORY) {
            history.splice(0, history.length - MAX_HISTORY);
          }

          const response = await api.complete(history);
          history.push({ role: 'assistant', content: response });
          
          console.log('\n' + formatResponse(response) + '\n');
        } catch (error) {
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
