import fs from 'fs';
import { execSync, exec, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

let anthropic;
let gemini;
let openai;

const DEFAULT_CLAUDE_CLI = '/Users/bugbookee/.nvm/versions/node/v22.22.1/bin/claude';
const DEFAULT_GEMINI_CLI = '/Users/bugbookee/.nvm/versions/node/v22.22.1/bin/gemini';
const DEFAULT_CODEX_CLI = '/Users/bugbookee/.nvm/versions/node/v22.22.1/bin/codex';

const NODE_BIN = '/Users/bugbookee/.nvm/versions/node/v22.22.1/bin';
const CLI_ENV = { ...process.env, PATH: `${NODE_BIN}:${process.env.PATH || ''}` };

// 50MB: 대형 코드파일 응답도 수용
const MAX_BUFFER = 50 * 1024 * 1024;

export const COST_PER_TOKEN = {
  'claude-sonnet-4-6': { input: 0.003 / 1000, output: 0.015 / 1000 },
  'claude-opus-4-6': { input: 0.015 / 1000, output: 0.075 / 1000 },
  'claude-cli': { input: 0, output: 0 },
  'gemini-2.5-pro': { input: 0.00125 / 1000, output: 0.005 / 1000 },
  'gpt-4o': { input: 0.0025 / 1000, output: 0.01 / 1000 },
  codex: { input: 0, output: 0 },
  'gemini-cli': { input: 0, output: 0 },
};

function createLogger(logger) {
  return typeof logger === 'function' ? logger : () => {};
}

export function getClaudeCliPath() {
  return process.env.CLAUDE_CLI || DEFAULT_CLAUDE_CLI;
}

export function getGeminiCliPath() {
  return process.env.GEMINI_CLI || DEFAULT_GEMINI_CLI;
}

export function getCodexCliPath() {
  return process.env.CODEX_CLI || DEFAULT_CODEX_CLI;
}

export function resolveModelId(model) {
  if (model === 'sonnet') return 'claude-sonnet-4-6';
  if (model === 'opus') return 'claude-opus-4-6';
  if (model === 'gemini') return gemini ? 'gemini-2.5-pro' : 'gemini-cli';
  if (model === 'openai') return 'gpt-4o';
  return model;
}

function commandExists(command) {
  try {
    execSync(`${command} --version`, { encoding: 'utf-8', timeout: 5000, env: CLI_ENV });
    return true;
  } catch {
    return false;
  }
}

// Gemini CLI stdout에 섞이는 경고/메타 라인 제거
// "YOLO mode is enabled..." 등 --approval-mode yolo 사용 후에도
// 혹시 남을 수 있는 접두 라인 strip
function stripGeminiNoise(output) {
  return output
    .split('\n')
    .filter((line) => {
      const l = line.trim();
      if (l.startsWith('YOLO mode is enabled')) return false;
      if (l.startsWith('All tool calls will be automatically approved')) return false;
      return true;
    })
    .join('\n')
    .trim();
}

// 비동기 CLI 실행 래퍼 (진짜 async - 이벤트 루프 블로킹 없음)
async function execCli(command, timeoutMs) {
  const { stdout } = await execAsync(command, {
    encoding: 'utf-8',
    timeout: timeoutMs,
    maxBuffer: MAX_BUFFER,
    env: CLI_ENV,
  });
  return stdout;
}

// Codex: stdin 파이프 방식 (spawn) — $(cat file) shell expansion ARG_MAX 회피
function spawnCodex(promptFile, outFile, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`Codex timeout after ${timeoutMs / 1000}s`));
    }, timeoutMs);

    const child = spawn(
      getCodexCliPath(),
      ['exec', '--dangerously-bypass-approvals-and-sandbox', '--skip-git-repo-check', '-o', outFile, '-'],
      { env: CLI_ENV, stdio: ['pipe', 'pipe', 'pipe'] }
    );

    const promptStream = fs.createReadStream(promptFile);
    promptStream.pipe(child.stdin);

    child.on('error', (err) => { clearTimeout(timer); reject(err); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0 && code !== null) {
        reject(new Error(`Codex exited with code ${code}`));
      } else {
        resolve();
      }
    });
  });
}

export async function initProviders(options = {}) {
  const log = createLogger(options.logger);

  if (process.env.ANTHROPIC_API_KEY) {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    anthropic = new Anthropic();
    log('✅ Claude SDK ready');
  } else if (commandExists(getClaudeCliPath())) {
    log('✅ Claude CLI ready (구독 fallback)');
  } else {
    log('⚠️ Claude: SDK/CLI 없음');
  }

  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
    log('✅ Gemini SDK ready');
  } else if (commandExists(getGeminiCliPath())) {
    log('✅ Gemini CLI ready (Ultra fallback)');
  } else {
    log('⚠️ Gemini: SDK/CLI 없음');
  }

  if (process.env.OPENAI_API_KEY) {
    const { default: OpenAI } = await import('openai');
    openai = new OpenAI();
    log('✅ OpenAI SDK ready');
  } else if (commandExists(getCodexCliPath())) {
    log('✅ Codex CLI ready (OpenAI fallback)');
  } else {
    log('⚠️ OpenAI/Codex: SDK/CLI 없음');
  }

  return getProviderStatus();
}

export function getProviderStatus() {
  const claudeCli = commandExists(getClaudeCliPath());
  const geminiCli = commandExists(getGeminiCliPath());
  const codexCli = commandExists(getCodexCliPath());

  return {
    claude: {
      available: Boolean(anthropic) || claudeCli,
      mode: anthropic ? 'sdk' : claudeCli ? 'cli' : null,
      cli_path: claudeCli ? getClaudeCliPath() : null,
      models: anthropic || claudeCli ? ['claude-sonnet-4-6', 'claude-opus-4-6'] : [],
    },
    gemini: {
      available: Boolean(gemini) || geminiCli,
      mode: gemini ? 'sdk' : geminiCli ? 'cli' : null,
      cli_path: geminiCli ? getGeminiCliPath() : null,
      models: gemini ? ['gemini-2.5-pro'] : geminiCli ? ['gemini-2.5-pro'] : [],
    },
    openai: {
      available: Boolean(openai) || codexCli,
      mode: openai ? 'sdk' : codexCli ? 'cli' : null,
      cli_path: codexCli ? getCodexCliPath() : null,
      models: openai ? ['gpt-4o'] : codexCli ? ['codex'] : [],
    },
  };
}

export function calculateCost(model, inputTokens = 0, outputTokens = 0) {
  const resolvedModel = resolveModelId(model);
  const pricing = COST_PER_TOKEN[resolvedModel];
  if (!pricing) return 0;
  return Number(((inputTokens * pricing.input) + (outputTokens * pricing.output)).toFixed(6));
}

export async function callAI(model, prompt, options = {}) {
  const startTime = Date.now();
  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : () => {};
  const resolvedModel = resolveModelId(model);
  let billingModel = resolvedModel;

  let result = '';
  let inputTokens = 0;
  let outputTokens = 0;

  if (resolvedModel.startsWith('claude')) {
    if (anthropic) {
      const resp = await anthropic.messages.create({
        model: resolvedModel,
        max_tokens: options.maxTokens || 4096,
        messages: [{ role: 'user', content: prompt }],
      });
      result = resp.content[0].text;
      inputTokens = resp.usage?.input_tokens || 0;
      outputTokens = resp.usage?.output_tokens || 0;
    } else {
      onProgress('📡 Claude CLI fallback (구독)');
      const tmpFile = `/tmp/buildkit-claude-${Date.now()}.txt`;
      fs.writeFileSync(tmpFile, prompt);
      // execAsync: 이벤트 루프 블로킹 없음 → 병렬 태스크 진짜 동시 실행
      result = await execCli(
        `cat "${tmpFile}" | ${getClaudeCliPath()} -p --output-format text`,
        300000
      );
      fs.unlink(tmpFile, () => {});
      inputTokens = Math.ceil(prompt.length / 4);
      billingModel = 'claude-cli';
    }
  } else if (resolvedModel.startsWith('gemini') || model === 'gemini') {
    if (gemini) {
      const m = gemini.getGenerativeModel({
        model: resolvedModel === 'gemini-cli' ? 'gemini-2.5-pro' : resolvedModel,
      });
      const resp = await m.generateContent(prompt);
      result = resp.response.text();
      inputTokens = resp.response.usageMetadata?.promptTokenCount || 0;
      outputTokens = resp.response.usageMetadata?.candidatesTokenCount || 0;
      if (!inputTokens && !outputTokens) {
        inputTokens = resp.response.usageMetadata?.totalTokenCount || 0;
      }
    } else {
      onProgress('📡 Gemini CLI fallback (Ultra 구독)');
      const tmpFile = `/tmp/buildkit-gemini-${Date.now()}.txt`;
      fs.writeFileSync(tmpFile, prompt);
      // 수정: -y → --approval-mode yolo (YOLO 경고 stdout 오염 제거)
      // 수정: -s false → --no-sandbox (-s false는 sandbox ON + "false" 쿼리 추가 버그)
      const raw = await execCli(
        `cat "${tmpFile}" | ${getGeminiCliPath()} -p "주어진 내용을 분석하고 한국어로 상세히 답해라." --approval-mode yolo --no-sandbox -o text 2>/dev/null`,
        300000  // 기존 180s → 300s (대형 프롬프트 여유)
      );
      fs.unlink(tmpFile, () => {});
      result = stripGeminiNoise(raw);
      inputTokens = Math.ceil(prompt.length / 4);
    }
  } else if (resolvedModel.startsWith('gpt')) {
    if (!openai) throw new Error('OPENAI_API_KEY 없음');
    const resp = await openai.chat.completions.create({
      model: resolvedModel,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: options.maxTokens || 4096,
    });
    result = resp.choices[0].message.content;
    inputTokens = resp.usage?.prompt_tokens || 0;
    outputTokens = resp.usage?.completion_tokens || 0;
  } else if (resolvedModel === 'codex') {
    onProgress('📡 Codex CLI fallback (OpenAI 구독)');
    const tmpFile = `/tmp/buildkit-codex-${Date.now()}.txt`;
    const outFile = `/tmp/buildkit-codex-out-${Date.now()}.txt`;
    fs.writeFileSync(tmpFile, prompt);
    // 수정: $(cat file) shell expansion → stdin 파이프 (ARG_MAX 1MB 한계 회피)
    // spawnCodex는 Promise 기반 → 이벤트 루프 블로킹 없음
    await spawnCodex(tmpFile, outFile, 1800000); // 30분
    result = fs.existsSync(outFile) ? fs.readFileSync(outFile, 'utf-8') : '';
    fs.unlink(tmpFile, () => {});
    fs.unlink(outFile, () => {});
    inputTokens = Math.ceil(prompt.length / 4);
  } else {
    throw new Error(`Unknown model: ${model}`);
  }

  const tokensUsed = inputTokens + outputTokens;
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  return {
    result,
    inputTokens,
    outputTokens,
    tokensUsed,
    elapsed,
    model: resolvedModel,
    cost: calculateCost(billingModel, inputTokens, outputTokens),
  };
}
