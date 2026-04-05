import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

export function extractContext(codebase, files, keywords = []) {
  let context = '';

  for (const filePath of files) {
    const fullPath = path.resolve(codebase, filePath);
    if (!fs.existsSync(fullPath)) {
      context += `\n// [${filePath}] 파일 없음\n`;
      continue;
    }

    const content = fs.readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n');

    if (lines.length <= 200) {
      context += `\n// === ${filePath} ===\n${content}\n`;
      continue;
    }

    if (keywords.length > 0) {
      const relevantLines = new Set();
      lines.forEach((line, idx) => {
        if (keywords.some((keyword) => line.toLowerCase().includes(keyword.toLowerCase()))) {
          for (let i = Math.max(0, idx - 5); i <= Math.min(lines.length - 1, idx + 10); i += 1) {
            relevantLines.add(i);
          }
        }
      });

      const extracted = [...relevantLines]
        .sort((a, b) => a - b)
        .map((lineIndex) => `${lineIndex + 1}: ${lines[lineIndex]}`)
        .join('\n');
      context += `\n// === ${filePath} (관련 부분만) ===\n${extracted}\n`;
      continue;
    }

    context += `\n// === ${filePath} (처음 200줄) ===\n${lines.slice(0, 200).join('\n')}\n`;
  }

  return context;
}

export function getGitDiff(codebase) {
  try {
    return execSync('git diff --cached || git diff', { cwd: codebase, encoding: 'utf-8' });
  } catch {
    return '';
  }
}
