import { test } from 'node:test';
import assert from 'node:assert';
import { parseTestFile } from '../src/parser.js';
import { runTests } from '../src/runner.js';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

test('integration - full workflow: create template, parse, and run', async () => {
  const testFile = join(process.cwd(), 'temp-integration-full.yaml');

  // Use template for reference
  const yaml = `tests:
  - name: Test JSONPlaceholder API
    url: https://jsonplaceholder.typicode.com/users/1
    method: GET
    expect:
      status: 200
      body:
        id: 1`;

  try {
    writeFileSync(testFile, yaml);

    // Parse file
    const parsed = parseTestFile(testFile);
    assert.ok(parsed.tests);
    assert.strictEqual(parsed.tests.length, 1);

    // Run tests
    const result = await runTests(testFile);
    assert.ok('passedCount' in result);
    assert.ok('failedCount' in result);
    assert.ok(result.results.length > 0);
  } finally {
    unlinkSync(testFile);
  }
});

test('integration - complex test with headers and body', async () => {
  const testFile = join(process.cwd(), 'temp-integration-complex.yaml');
  const yaml = `tests:
  - name: POST to JSONPlaceholder
    url: https://jsonplaceholder.typicode.com/posts
    method: POST
    headers:
      Content-Type: application/json
    body:
      title: "Test Post"
      body: "Integration test body"
      userId: 1
    expect:
      status: 201`;

  try {
    writeFileSync(testFile, yaml);
    const result = await runTests(testFile);

    assert.ok(result.results);
    assert.ok(result.results[0]);
  } finally {
    unlinkSync(testFile);
  }
});

test('integration - validate test file structure', async () => {
  const testFile = join(process.cwd(), 'temp-integration-validate.yaml');
  const yaml = `tests:
  - name: Simple GET
    url: https://httpbin.org/get
    method: GET
  - name: Simple POST
    url: https://httpbin.org/post
    method: POST
    body:
      test: "data"`;

  try {
    writeFileSync(testFile, yaml);
    const parsed = parseTestFile(testFile);

    assert.strictEqual(parsed.tests.length, 2);
    assert.strictEqual(parsed.tests[0].method, 'GET');
    assert.strictEqual(parsed.tests[1].method, 'POST');
    assert.deepStrictEqual(parsed.tests[1].body, { test: 'data' });
  } finally {
    unlinkSync(testFile);
  }
});
