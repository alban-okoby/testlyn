import { test } from 'node:test';
import assert from 'node:assert';
import { getPath, extractVariables, resolveStepReferences } from '../src/context.js';

test('context - getPath resolves dot notation', () => {
  const obj = { body: { token: 'abc123', user: { id: 42 } } };

  assert.strictEqual(getPath(obj, 'body.token'), 'abc123');
  assert.strictEqual(getPath(obj, 'body.user.id'), 42);
});

test('context - getPath resolves bracket notation', () => {
  const obj = { body: { items: [{ id: 1 }, { id: 2 }] } };

  assert.strictEqual(getPath(obj, 'body.items[0].id'), 1);
  assert.strictEqual(getPath(obj, 'body.items[1].id'), 2);
});

test('context - getPath returns undefined for missing path', () => {
  const obj = { body: { token: 'abc' } };

  assert.strictEqual(getPath(obj, 'body.missing'), undefined);
  assert.strictEqual(getPath(obj, 'notexist.path'), undefined);
});

test('context - extractVariables extracts multiple paths', () => {
  const response = {
    status: 200,
    headers: { 'content-type': 'application/json' },
    body: { token: 'xyz789', userId: 123, user: { name: 'Alice' } },
  };

  const extracted = extractVariables(
    { authToken: 'body.token', id: 'body.userId', userName: 'body.user.name' },
    response
  );

  assert.deepStrictEqual(extracted, {
    authToken: 'xyz789',
    id: 123,
    userName: 'Alice',
  });
});

test('context - extractVariables throws on missing path', () => {
  const response = {
    status: 200,
    headers: {},
    body: { available: 'yes' },
  };

  assert.throws(
    () => extractVariables({ token: 'body.missing' }, response),
    /Cannot extract 'token': path 'body.missing' not found in response/
  );
});

test('context - resolveStepReferences resolves variables from context.vars', () => {
  const context = {
    vars: { TOKEN: 'secret123' },
    steps: {},
  };

  const test = {
    name: 'Test1',
    url: 'https://api.example.com/data',
    headers: { Authorization: 'Bearer ${TOKEN}' },
  };

  const resolved = resolveStepReferences(test, context);

  assert.strictEqual(resolved.headers.Authorization, 'Bearer secret123');
  assert.strictEqual(resolved.name, 'Test1');
  assert.strictEqual(resolved.url, 'https://api.example.com/data');
});

test('context - resolveStepReferences resolves direct step references', () => {
  const context = {
    vars: {},
    steps: {
      'Login': {
        status: 200,
        headers: {},
        body: { token: 'abc', user: { id: 99 } },
      },
    },
  };

  const test = {
    name: 'GetProfile',
    url: 'https://api.example.com/profile',
    headers: {
      Authorization: 'Bearer ${Login.body.token}',
      'X-User-ID': '${Login.body.user.id}',
    },
  };

  const resolved = resolveStepReferences(test, context);

  assert.strictEqual(resolved.headers.Authorization, 'Bearer abc');
  assert.strictEqual(resolved.headers['X-User-ID'], '99');
});

test('context - resolveStepReferences throws on missing variable', () => {
  const context = {
    vars: {},
    steps: {},
  };

  const test = {
    name: 'Test2',
    url: 'https://api.example.com',
    headers: { Authorization: 'Bearer ${MISSING_TOKEN}' },
  };

  assert.throws(
    () => resolveStepReferences(test, context),
    /Test "Test2": missing variable "MISSING_TOKEN"/
  );
});

test('context - resolveStepReferences throws on missing step reference', () => {
  const context = {
    vars: {},
    steps: {},
  };

  const test = {
    name: 'Test3',
    url: 'https://api.example.com',
    headers: { Authorization: 'Bearer ${NonexistentTest.body.token}' },
  };

  assert.throws(
    () => resolveStepReferences(test, context),
    /Test "Test3": missing variable "NonexistentTest.body.token"/
  );
});

test('context - resolveStepReferences resolves in nested body', () => {
  const context = {
    vars: { USERNAME: 'alice' },
    steps: {},
  };

  const test = {
    name: 'CreateUser',
    url: 'https://api.example.com/users',
    method: 'POST',
    body: {
      username: '${USERNAME}',
      email: 'alice@${USERNAME}.com',
    },
  };

  const resolved = resolveStepReferences(test, context);

  assert.strictEqual(resolved.body.username, 'alice');
  assert.strictEqual(resolved.body.email, 'alice@alice.com');
});

test('context - resolveStepReferences does not mutate original', () => {
  const context = {
    vars: { TOKEN: 'secret' },
    steps: {},
  };

  const original = {
    name: 'Test',
    headers: { Auth: '${TOKEN}' },
  };

  const resolved = resolveStepReferences(original, context);

  assert.strictEqual(original.headers.Auth, '${TOKEN}');
  assert.strictEqual(resolved.headers.Auth, 'secret');
});

test('context - resolveStepReferences with both vars and step references', () => {
  const context = {
    vars: { API_VERSION: 'v2' },
    steps: {
      'LoginStep': {
        status: 200,
        headers: {},
        body: { token: 'xyz123' },
      },
    },
  };

  const test = {
    name: 'FetchData',
    url: 'https://api.example.com/${API_VERSION}/data',
    headers: {
      Authorization: 'Bearer ${LoginStep.body.token}',
    },
  };

  const resolved = resolveStepReferences(test, context);

  assert.strictEqual(resolved.url, 'https://api.example.com/v2/data');
  assert.strictEqual(resolved.headers.Authorization, 'Bearer xyz123');
});
