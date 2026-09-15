import { test } from 'node:test';
import assert from 'node:assert';
import { runTests } from '../src/runner.js';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

test('runner - runTests with invalid file path', async () => {
  try {
    await runTests('/nonexistent/path/tests.yaml');
    assert.fail('Should have thrown an error');
  } catch (error) {
    assert.ok(error.message.includes('ENOENT') || error.message.includes('no such file'));
  }
});

test('runner - runTests with missing tests key', async () => {
  const testFile = join(process.cwd(), 'temp-runner-invalid.yaml');
  const yaml = 'suite: My Tests';

  try {
    writeFileSync(testFile, yaml);
    await assert.rejects(
      () => runTests(testFile),
      /Invalid test file format/
    );
  } finally {
    unlinkSync(testFile);
  }
});

test('runner - runTests with zero tests', async () => {
  const testFile = join(process.cwd(), 'temp-runner-empty.yaml');
  const yaml = 'tests: []';

  try {
    writeFileSync(testFile, yaml);
    const result = await runTests(testFile);

    assert.strictEqual(result.passedCount, 0);
    assert.strictEqual(result.failedCount, 0);
    assert.strictEqual(result.results.length, 0);
  } finally {
    unlinkSync(testFile);
  }
});

test('runner - runTests returns correct structure', async () => {
  const testFile = join(process.cwd(), 'temp-runner-structure.yaml');
  const yaml = `tests:
  - name: Valid structure test
    url: https://httpbin.org/status/200
    method: GET
    expect:
      status: 200`;

  try {
    writeFileSync(testFile, yaml);
    const result = await runTests(testFile);

    assert.ok(typeof result.passedCount === 'number');
    assert.ok(typeof result.failedCount === 'number');
    assert.ok(Array.isArray(result.results));
  } finally {
    unlinkSync(testFile);
  }
});

test('runner - runTests with stopOnError option', async () => {
  const testFile = join(process.cwd(), 'temp-runner-stop.yaml');
  const yaml = `tests:
  - name: Test that will fail (invalid URL)
    url: https://invalid-url-12345.example.com/404
    method: GET
    expect:
      status: 200
  - name: Second test (should not run)
    url: https://httpbin.org/status/200
    method: GET
    expect:
      status: 200`;

  try {
    writeFileSync(testFile, yaml);
    const result = await runTests(testFile, { stopOnError: true });

    // With stopOnError, should stop after first failure
    assert.strictEqual(result.failedCount >= 1, true);
  } finally {
    unlinkSync(testFile);
  }
});

test('runner - parseTestFile integration', async () => {
  const testFile = join(process.cwd(), 'temp-runner-integration.yaml');
  const yaml = `suite: Integration Tests
tests:
  - name: GET Request
    url: https://httpbin.org/status/200
    method: GET
    expect:
      status: 200
  - name: Another GET Request
    url: https://httpbin.org/status/404
    method: GET
    expect:
      status: 404`;

  try {
    writeFileSync(testFile, yaml);
    const result = await runTests(testFile);

    assert.ok('passedCount' in result);
    assert.ok('failedCount' in result);
    assert.ok('results' in result);
    assert.strictEqual(result.results.length, 2);
  } finally {
    unlinkSync(testFile);
  }
});

test('runner - test dependencies with extract', async () => {
  const testFile = join(process.cwd(), 'temp-runner-extract.yaml');
  const yaml = `tests:
  - name: Login
    url: https://httpbin.org/anything
    method: POST
    body:
      username: admin
      password: secret
    expect:
      status: 200
    extract:
      authToken: body.json.password
      username: body.json.username

  - name: Get Profile
    url: https://httpbin.org/anything
    method: GET
    headers:
      Authorization: Bearer \${authToken}
      X-User: \${username}
    expect:
      status: 200`;

  try {
    writeFileSync(testFile, yaml);
    const result = await runTests(testFile);

    assert.strictEqual(result.results.length, 2);
    assert.ok(result.results[0].passed);
    assert.ok(result.results[1].passed);
  } finally {
    unlinkSync(testFile);
  }
});

test('runner - test dependencies with direct step reference', async () => {
  const testFile = join(process.cwd(), 'temp-runner-step-ref.yaml');
  const yaml = `tests:
  - name: CreateUser
    url: https://httpbin.org/anything
    method: POST
    body:
      name: Alice
      email: alice@example.com
    expect:
      status: 200

  - name: GetUser
    url: https://httpbin.org/anything
    method: GET
    headers:
      X-User-Name: \${CreateUser.body.json.name}
      X-User-Email: \${CreateUser.body.json.email}
    expect:
      status: 200`;

  try {
    writeFileSync(testFile, yaml);
    const result = await runTests(testFile);

    assert.strictEqual(result.results.length, 2);
    assert.ok(result.results[0].passed);
    assert.ok(result.results[1].passed);
  } finally {
    unlinkSync(testFile);
  }
});

test('runner - missing variable fails test immediately', async () => {
  const testFile = join(process.cwd(), 'temp-runner-missing-var.yaml');
  const yaml = `tests:
  - name: First Test
    url: https://httpbin.org/status/200
    method: GET
    expect:
      status: 200

  - name: Second Test
    url: https://httpbin.org/anything
    method: GET
    headers:
      Authorization: Bearer \${UNDEFINED_TOKEN}
    expect:
      status: 200`;

  try {
    writeFileSync(testFile, yaml);
    const result = await runTests(testFile);

    assert.strictEqual(result.results.length, 2);
    assert.ok(result.results[0].passed);
    assert.ok(!result.results[1].passed);
    assert.ok(result.results[1].error.includes('missing variable'));
  } finally {
    unlinkSync(testFile);
  }
});
