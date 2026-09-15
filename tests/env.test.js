import { test } from 'node:test';
import assert from 'node:assert';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { loadEnv, replaceVariables, processEnvVariables } from '../src/env.js';
import { parseTestFile } from '../src/parser.js';

test('env - loadEnv parses .env file correctly', () => {
  const envFile = join(process.cwd(), 'temp-test.env');
  const envContent = `API_URL=https://api.example.com
API_TOKEN=secret123
DB_HOST=localhost
# This is a comment
QUOTED_VALUE="with spaces"
SINGLE_QUOTED='single quotes'
`;

  try {
    writeFileSync(envFile, envContent);
    const env = loadEnv(envFile);

    assert.strictEqual(env.API_URL, 'https://api.example.com');
    assert.strictEqual(env.API_TOKEN, 'secret123');
    assert.strictEqual(env.DB_HOST, 'localhost');
    assert.strictEqual(env.QUOTED_VALUE, 'with spaces');
    assert.strictEqual(env.SINGLE_QUOTED, 'single quotes');
  } finally {
    try {
      unlinkSync(envFile);
    } catch (e) {
      // ignore
    }
  }
});

test('env - replaceVariables replaces ${VAR} syntax', () => {
  const env = { API_URL: 'https://api.example.com', TOKEN: 'abc123' };
  const result = replaceVariables('Request to ${API_URL} with token ${TOKEN}', env);
  assert.strictEqual(result, 'Request to https://api.example.com with token abc123');
});

test('env - replaceVariables replaces $VAR syntax', () => {
  const env = { API_URL: 'https://api.example.com', TOKEN: 'abc123' };
  const result = replaceVariables('Request to $API_URL with token $TOKEN', env);
  assert.strictEqual(result, 'Request to https://api.example.com with token abc123');
});

test('env - replaceVariables keeps undefined variables', () => {
  const env = { API_URL: 'https://api.example.com' };
  const result = replaceVariables('URL: ${API_URL}, Missing: ${MISSING}', env);
  assert.strictEqual(result, 'URL: https://api.example.com, Missing: ${MISSING}');
});

test('env - processEnvVariables processes nested objects', () => {
  const env = { BASE_URL: 'https://api.example.com', TOKEN: 'secret' };
  const obj = {
    name: 'Test $NAME',
    url: '${BASE_URL}/users',
    headers: {
      Authorization: 'Bearer ${TOKEN}',
      'X-API-Key': 'key-${TOKEN}',
    },
    body: {
      username: 'test',
      email: 'test@${BASE_URL}',
    },
  };

  const result = processEnvVariables(obj, env);
  assert.strictEqual(result.url, 'https://api.example.com/users');
  assert.strictEqual(result.headers.Authorization, 'Bearer secret');
  assert.strictEqual(result.headers['X-API-Key'], 'key-secret');
  assert.strictEqual(result.body.email, 'test@https://api.example.com');
});

test('env - processEnvVariables handles arrays', () => {
  const env = { HOST: 'localhost', PORT: '3000' };
  const arr = [
    'Server ${HOST}:${PORT}',
    'Database ${HOST}',
  ];

  const result = processEnvVariables(arr, env);
  assert.strictEqual(result[0], 'Server localhost:3000');
  assert.strictEqual(result[1], 'Database localhost');
});

test('env - integration: parseTestFile with .env variables', () => {
  const envFile = join(process.cwd(), 'temp-integration.env');
  const testFile = join(process.cwd(), 'temp-integration.yaml');

  const envContent = 'BASE_URL=https://jsonplaceholder.typicode.com\nAPI_TOKEN=secret123\n';
  const testContent = `tests:
  - name: Get Users
    url: \${BASE_URL}/users
    method: GET
    headers:
      Authorization: Bearer \${API_TOKEN}
    expect:
      status: 200
  - name: Create Post
    url: \${BASE_URL}/posts
    method: POST
    headers:
      Authorization: Bearer \${API_TOKEN}
    body:
      title: Test Post
    expect:
      status: 201
`;

  try {
    writeFileSync(envFile, envContent);
    writeFileSync(testFile, testContent);

    const parsed = parseTestFile(testFile, envFile);

    assert.strictEqual(parsed.tests[0].url, 'https://jsonplaceholder.typicode.com/users');
    assert.strictEqual(parsed.tests[0].headers.Authorization, 'Bearer secret123');
    assert.strictEqual(parsed.tests[1].url, 'https://jsonplaceholder.typicode.com/posts');
    assert.strictEqual(parsed.tests[1].body.title, 'Test Post');
  } finally {
    try {
      unlinkSync(envFile);
    } catch (e) {
      // ignore
    }
    try {
      unlinkSync(testFile);
    } catch (e) {
      // ignore
    }
  }
});

test('env - parseTestFile works without .env file', () => {
  const testFile = join(process.cwd(), 'temp-no-env.yaml');
  const testContent = `tests:
  - name: Simple Test
    url: https://api.example.com/health
    method: GET
    expect:
      status: 200
`;

  try {
    writeFileSync(testFile, testContent);
    const parsed = parseTestFile(testFile);

    assert.strictEqual(parsed.tests[0].url, 'https://api.example.com/health');
    assert.strictEqual(parsed.tests[0].method, 'GET');
  } finally {
    try {
      unlinkSync(testFile);
    } catch (e) {
      // ignore
    }
  }
});
