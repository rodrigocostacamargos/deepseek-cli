import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import chalk from 'chalk';

export async function readFileContent(filePath: string): Promise<string | null> {
  try {
    const absolutePath = path.resolve(process.cwd(), filePath);
    
    const stats = await fs.stat(absolutePath);
    
    if (!stats.isFile()) {
      return null;
    }

    if (stats.size > 1024 * 1024) {
      console.log(chalk.yellow(`\n⚠️  File ${filePath} is too large (>1MB). Skipping...`));
      return null;
    }

    const content = await fs.readFile(absolutePath, 'utf8');
    const ext = path.extname(filePath).slice(1) || 'text';
    
    return `--- FILE: ${filePath} ---\n\`\`\`${ext}\n${content}\n\`\`\`\n`;
  } catch (error) {
    return null;
  }
}

export function extractFilePaths(text: string): string[] {
  // Regex para capturar caminhos de arquivos após @
  // Suporta letras, números, pontos, barras e sublinhados
  const regex = /@([\w\.\/\-\\]+)/g;
  const matches = [...text.matchAll(regex)];
  return matches.map(match => match[1]);
}