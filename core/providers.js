import fs from 'fs';
import { execSync } from 'child_process';

let anthropic;
let gemini;
let openai;

const DEFAULT_CLAUDE_CLI = '/Users/bugbookee/.nvm/versions/node/v22.22.1/bin/claude';
const DEFAULT_GEMINI_CLI = '/tmp/node-v22.14.0-darwin-arm64/bin/gemini';
const DEFAULT_CODEX_CLI = '/tmp/node-v22.14.0-darwin-arm64/bin/codex';

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
    execSync(`${command} --version`, { encoding: 'utf-8', timeout: 5000 });
    return true;
  } catch {
    return false;
  }
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
      const tmpFile = '/tmp/buildkit-claude-prompt.txt';
      fs.writeFileSync(tmpFile, prompt);
      result = execSync(
        `cat "${tmpFile}" | ${getClaudeCliPath()} -p --output-format text`,
        { encoding: 'utf-8', timeout: 300000 }
      );
      inputTokens = Math.ceil(prompt.length / 4);
      billingModel = 'claude-cli';
    }
  } else if (resolvedModel.startsWith('gemini') || model === 'gemini') {
    if (gemini) {
      const m = gemini.getGenerativeModel({ model: resolvedModel === 'gemini-cli' ? 'gemini-2.5-pro' : resolvedModel });
      const resp = await m.generateContent(prompt);
      result = resp.response.text();
      inputTokens = resp.response.usageMetadata?.promptTokenCount || 0;
      outputTokens = resp.response.usageMetadata?.candidatesTokenCount || 0;
      if (!inputTokens && !outputTokens) {
        inputTokens = resp.response.usageMetadata?.totalTokenCount || 0;
      }
    } else {
      onProgress('📡 Gemini CLI fallback (Ultra 구독)');
      const tmpFile = '/tmp/buildkit-gemini-prompt.txt';
      fs.writeFileSync(tmpFile, prompt);
      result = execSync(
        `cat "${tmpFile}" | ${getGeminiCliPath()} -p "코드만 출력. 설명 불필요." -y --sandbox false -o text`,
        { encoding: 'utf-8', timeout: 180000 }
      );
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
    const tmpFile = '/tmp/buildkit-codex-prompt.txt';
    fs.writeFileSync(tmpFile, prompt);
    const outFile = '/tmp/buildkit-codex-output.txt';
    execSync(
      `${getCodexCliPath()} exec --ephemeral --skip-git-repo-check -o "${outFile}" "$(cat "${tmpFile}")"`,
      { encoding: 'utf-8', timeout: 180000 }
    );
    result = fs.existsSync(outFile) ? fs.readFileSync(outFile, 'utf-8') : '';
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
