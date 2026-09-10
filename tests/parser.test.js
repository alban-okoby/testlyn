import { test } from 'node:test';
import assert from 'node:assert';
import { parseTestFile, createTestTemplate } from '../src/parser.js';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

test('parser - parseTestFile with valid YAML', () => {
  const testFile = join(process.cwd(), 'temp-test-valid.yaml');
  const yaml = `tests:
  - name: Test 1
    url: https://api.example.com/health
    method: GET
    expect:
      status: 200`;

  try {
    writeFileSync(testFile, yaml);
    const result = parseTestFile(testFile);

    assert.ok(result.tests);
    assert.strictEqual(result.tests.length, 1);
    assert.strictEqual(result.tests[0].name, 'Test 1');
    assert.strictEqual(result.tests[0].url, 'https://api.example.com/health');
  } finally {
    unlinkSync(testFile);
  }
});

test('parser - parseTestFile missing tests key', () => {
  const testFile = join(process.cwd(), 'temp-test-invalid.yaml');
  const yaml = 'suite: My Tests';

  try {
    writeFileSync(testFile, yaml);
    assert.throws(() => parseTestFile(testFile), /Invalid test file format/);
  } finally {
    unlinkSync(testFile);
  }
});

test('parser - parseTestFile with invalid tests array', () => {
  const testFile = join(process.cwd(), 'temp-test-invalid-array.yaml');
  const yaml = 'tests: "not an array"';

  try {
    writeFileSync(testFile, yaml);
    assert.throws(() => parseTestFile(testFile), /"tests" must be an array/);
  } finally {
    unlinkSync(testFile);
  }
});

test('parser - parseTestFile missing test name', () => {
  const testFile = join(process.cwd(), 'temp-test-no-name.yaml');
  const yaml = `tests:
  - url: https://api.example.com/health`;

  try {
    writeFileSync(testFile, yaml);
    assert.throws(() => parseTestFile(testFile), /must have a "name"/);
  } finally {
    unlinkSync(testFile);
  }
});

test('parser - parseTestFile missing test url', () => {
  const testFile = join(process.cwd(), 'temp-test-no-url.yaml');
  const yaml = `tests:
  - name: Test 1`;

  try {
    writeFileSync(testFile, yaml);
    assert.throws(() => parseTestFile(testFile), /must have a "url"/);
  } finally {
    unlinkSync(testFile);
  }
});

test('parser - parseTestFile with multiple tests', () => {
  const testFile = join(process.cwd(), 'temp-test-multiple.yaml');
  const yaml = `tests:
  - name: Test 1
    url: https://api.example.com/users
    method: GET
  - name: Test 2
    url: https://api.example.com/posts
    method: POST`;

  try {
    writeFileSync(testFile, yaml);
    const result = parseTestFile(testFile);

    assert.strictEqual(result.tests.length, 2);
    assert.strictEqual(result.tests[0].name, 'Test 1');
    assert.strictEqual(result.tests[1].name, 'Test 2');
  } finally {
    unlinkSync(testFile);
  }
});

test('parser - createTestTemplate generates valid template', () => {
  const template = createTestTemplate('Test Project');

  assert.ok(template.includes('tests:'));
  assert.ok(template.includes('Health Check'));
  assert.ok(template.includes('Create Resource'));
  assert.ok(template.includes('GET'));
  assert.ok(template.includes('POST'));
});

test('parser - parseTestFile with headers and body', () => {
  const testFile = join(process.cwd(), 'temp-test-headers.yaml');
  const yaml = `tests:
  - name: Create User
    url: https://api.example.com/users
    method: POST
    headers:
      Content-Type: application/json
      Authorization: Bearer token123
    body:
      email: user@example.com
      name: John Doe
    expect:
      status: 201`;

  try {
    writeFileSync(testFile, yaml);
    const result = parseTestFile(testFile);

    const test = result.tests[0];
    assert.deepStrictEqual(test.headers, {
      'Content-Type': 'application/json',
      Authorization: 'Bearer token123'
    });
    assert.deepStrictEqual(test.body, {
      email: 'user@example.com',
      name: 'John Doe'
    });
  } finally {
    unlinkSync(testFile);
  }
});
