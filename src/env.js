import { readFileSync } from 'fs';

function parseEnvFile(content) {
  const env = {};
  const lines = content.split('\n');

  lines.forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;

    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) return;

    const key = line.substring(0, eqIndex).trim();
    let value = line.substring(eqIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith('\'') && value.endsWith('\''))) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  });

  return env;
}

export function loadEnv(envPath = '.env') {
  const env = {};

  process.env.NODE_ENV = process.env.NODE_ENV || 'test';

  try {
    const content = readFileSync(envPath, 'utf-8');
    const parsedEnv = parseEnvFile(content);
    Object.assign(env, parsedEnv);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw new Error(`Failed to load .env file: ${error.message}`);
    }
  }

  Object.assign(env, process.env);

  return env;
}

export function replaceVariables(value, env) {
  if (typeof value !== 'string') return value;

  return value.replace(/\$\{([^}]+)\}|\$([A-Z_][A-Z0-9_]*)/gi, (match, bracedVar, plainVar) => {
    const varName = bracedVar || plainVar;
    return env[varName] !== undefined ? env[varName] : match;
  });
}

export function processEnvVariables(obj, env) {
  if (typeof obj === 'string') {
    return replaceVariables(obj, env);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => processEnvVariables(item, env));
  }

  if (obj !== null && typeof obj === 'object') {
    const processed = {};
    for (const [key, value] of Object.entries(obj)) {
      processed[key] = processEnvVariables(value, env);
    }
    return processed;
  }

  return obj;
}
