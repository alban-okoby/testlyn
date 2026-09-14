import { test } from 'node:test';
import assert from 'node:assert';
import { buildHtmlReport, generateHtmlReport } from '../src/report.js';
import { runTests } from '../src/runner.js';
import { writeFileSync, unlinkSync, readFileSync } from 'fs';
import { join } from 'path';

test('report - buildHtmlReport includes title and counts', () => {
  const html = buildHtmlReport({
    testFile: 'test.yaml',
    passedCount: 2,
    failedCount: 1,
    results: [
      { name: 'Test 1', passed: true, method: 'GET', url: 'https://api.example.com/health', duration: 100 },
      { name: 'Test 2', passed: false, method: 'POST', url: 'https://api.example.com/data', expected: 201, actual: 500, duration: 150 },
      { name: 'Test 3', passed: false, method: 'GET', url: 'https://api.example.com/invalid', error: 'Connection refused' },
    ],
  });

  assert.ok(html.includes('<html'));
  assert.ok(html.includes('test.yaml'));
  assert.ok(html.includes('3'));
  assert.ok(html.includes('Passed'));
  assert.ok(html.includes('Failed'));
  assert.ok(html.includes('Test 1'));
  assert.ok(html.includes('Test 2'));
  assert.ok(html.includes('Test 3'));
});

test('report - buildHtmlReport escapes HTML in test names', () => {
  const html = buildHtmlReport({
    testFile: 'test.yaml',
    passedCount: 1,
    failedCount: 0,
    results: [
      { name: 'Test <script>alert("xss")</script>', passed: true, method: 'GET', url: 'https://api.example.com', duration: 50 },
    ],
  });

  assert.ok(!html.includes('<script>alert'));
  assert.ok(html.includes('&lt;script&gt;'));
});

test('report - buildHtmlReport escapes HTML in response data', () => {
  const html = buildHtmlReport({
    testFile: 'test.yaml',
    passedCount: 0,
    failedCount: 1,
    results: [
      { name: 'Test', passed: false, method: 'GET', url: 'https://api.example.com', expected: '<test>', actual: '<response>', duration: 100 },
    ],
  });

  assert.ok(!html.includes('<response>'));
  assert.ok(html.includes('&lt;response&gt;'));
});

test('report - buildHtmlReport handles error entries', () => {
  const html = buildHtmlReport({
    testFile: 'test.yaml',
    passedCount: 0,
    failedCount: 1,
    results: [
      { name: 'Failed Test', passed: false, method: 'GET', url: 'https://invalid.example.com', error: 'getaddrinfo ENOTFOUND invalid.example.com' },
    ],
  });

  assert.ok(html.includes('Failed Test'));
  assert.ok(html.includes('getaddrinfo ENOTFOUND'));
  assert.ok(html.includes('❌'));
});

test('report - generateHtmlReport writes file to default path', () => {
  try {
    const reportPath = generateHtmlReport(
      { passedCount: 1, failedCount: 0, results: [{ name: 'Test', passed: true, method: 'GET', url: 'https://api.example.com', duration: 50 }] },
      { testFile: 'test.yaml' }
    );

    assert.ok(reportPath.includes('report-'));
    assert.ok(reportPath.endsWith('.html'));
    const content = readFileSync(reportPath, 'utf-8');
    assert.ok(content.includes('Test'));
    assert.ok(content.includes('test.yaml'));
  } finally {
    try {
      const files = require('fs').readdirSync(process.cwd()).filter(f => f.startsWith('report-') && f.endsWith('.html'));
      files.forEach(f => {
        try {
          unlinkSync(join(process.cwd(), f));
        } catch (e) {
          // ignore
        }
      });
    } catch (e) {
      // ignore
    }
  }
});

test('report - generateHtmlReport writes file to custom path', () => {
  const reportPath = join(process.cwd(), 'custom-report.html');

  try {
    const html = generateHtmlReport(
      { passedCount: 1, failedCount: 0, results: [{ name: 'Test', passed: true, method: 'GET', url: 'https://api.example.com', duration: 50 }] },
      { testFile: 'test.yaml', outputPath: reportPath }
    );

    assert.strictEqual(html, reportPath);
    const content = readFileSync(reportPath, 'utf-8');
    assert.ok(content.includes('Test'));
    assert.ok(content.includes('test.yaml'));
  } finally {
    if (reportPath) {
      try {
        unlinkSync(reportPath);
      } catch (e) {
        // ignore
      }
    }
  }
});

test('report - integration: HTML report with runTests output', async () => {
  const testFile = join(process.cwd(), 'temp-report-integration.yaml');
  const reportPath = join(process.cwd(), 'temp-report-integration.html');

  const yaml = `tests:
  - name: Passing Test
    url: https://httpbin.org/status/200
    method: GET
    expect:
      status: 200
  - name: Failing Test
    url: https://invalid-url-12345.example.com/404
    method: GET
    expect:
      status: 200`;

  try {
    writeFileSync(testFile, yaml);
    const result = await runTests(testFile);

    assert.strictEqual(result.results.length, 2);
    assert.ok(result.results[1].passed === false);
    assert.ok(result.results[1].error);

    const generatedPath = generateHtmlReport(result, { testFile: 'temp-report-integration.yaml', outputPath: reportPath });
    const content = readFileSync(generatedPath, 'utf-8');

    assert.ok(content.includes('Passing Test'));
    assert.ok(content.includes('Failing Test'));
    assert.ok(content.includes('✅'));
    assert.ok(content.includes('❌'));
  } finally {
    try {
      unlinkSync(testFile);
    } catch (e) {
      // ignore
    }
    try {
      unlinkSync(reportPath);
    } catch (e) {
      // ignore
    }
  }
});
