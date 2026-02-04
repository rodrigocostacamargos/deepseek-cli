import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'bin', 'obj', 'out'];
const IGNORE_EXTS = ['.exe', '.dll', '.so', '.pyc', '.png', '.jpg', '.zip', '.gz'];

export async function getProjectMap(dir: string, baseDir: string = dir): Promise<string> {
  let results: string[] = [];
  try {
    const list = await fs.readdir(dir);

    for (const file of list) {
      const filePath = path.resolve(dir, file);
      const relativePath = path.relative(baseDir, filePath);
      const stats = await fs.stat(filePath);

      if (stats.isDirectory()) {
        if (!IGNORE_DIRS.includes(file)) {
          const subMap = await getProjectMap(filePath, baseDir);
          if (subMap) results.push(subMap);
        }
      } else {
        const ext = path.extname(file).toLowerCase();
        if (!IGNORE_EXTS.includes(ext)) {
          results.push(relativePath);
        }
      }
    }
  } catch (err) {
    // Ignore errors for specific files
  }

  return results.join('\n');
}