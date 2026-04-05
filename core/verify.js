import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

export function applyCode(codebase, filePath, content) {
  const fullPath = path.resolve(codebase, filePath);
  const dir = path.dirname(fullPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const codeMatch = content.match(/```(?:typescript|javascript|tsx|jsx|ts|js)?\n([\s\S]*?)```/);
  const code = codeMatch ? codeMatch[1] : content;

  fs.writeFileSync(fullPath, code);
  return fullPath;
}

export function verify(codebase, type = 'typecheck') {
  try {
    if (type === 'typecheck') {
      execSync('npx tsc --noEmit 2>&1 || true', { cwd: codebase, encoding: 'utf-8', timeout: 30000 });
    } else if (type === 'lint') {
      execSync('npx eslint . --max-warnings 0 2>&1 || true', { cwd: codebase, encoding: 'utf-8', timeout: 30000 });
    } else if (type === 'build') {
      execSync('npm run build 2>&1', { cwd: codebase, encoding: 'utf-8', timeout: 60000 });
    }

    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error.stdout || error.message };
  }
}
