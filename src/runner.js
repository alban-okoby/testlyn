import { readFileSync } from 'fs';
import YAML from 'yaml';
import axios from 'axios';
import chalk from 'chalk';

export async function runTests(testFile, options = {}) {
  const fileContent = readFileSync(testFile, 'utf-8');
  const tests = YAML.parse(fileContent);

  if (!tests || !tests.tests) {
    throw new Error('Invalid test file format. Expected "tests" key.');
  }

  let passedCount = 0;
  let failedCount = 0;
  const results = [];

  console.log(chalk.blue(`\n🧪 Running ${tests.tests.length} test(s)...\n`));

  for (const test of tests.tests) {
    try {
      const result = await executeTest(test, tests.baseUrl);

      if (result.passed) {
        passedCount++;
        console.log(chalk.green(`✅ ${test.name}`));
      } else {
        failedCount++;
        console.log(chalk.red(`❌ ${test.name}`));
        console.log(chalk.yellow(`   Expected: ${result.expected}`));
        console.log(chalk.yellow(`   Got: ${result.actual}`));
      }

      results.push(result);

      if (options.stopOnError && !result.passed) {
        break;
      }
    } catch (error) {
      failedCount++;
      results.push({
        name: test.name,
        passed: false,
        method: test.method || 'GET',
        url: test.url,
        error: error.message,
      });
      console.log(chalk.red(`❌ ${test.name}`));
      console.log(chalk.red(`   Error: ${error.message}`));

      if (options.stopOnError) {
        break;
      }
    }
  }

  // Summary
  console.log(chalk.blue('\n────────────────────────────'));
  console.log(chalk.green(`✅ Passed: ${passedCount}`));
  if (failedCount > 0) {
    console.log(chalk.red(`❌ Failed: ${failedCount}`));
  }
  console.log(chalk.blue('────────────────────────────\n'));

  return { passedCount, failedCount, results };
}

async function executeTest(test, baseUrl) {
  const { name, method = 'GET', url, headers = {}, body, expect } = test;

  if (!url) {
    throw new Error('Test must have a URL');
  }

  const fullUrl = baseUrl && url.startsWith('/') ? baseUrl + url : url;
  const startedAt = Date.now();

  try {
    const response = await axios({
      method,
      url: fullUrl,
      headers,
      data: body,
      validateStatus: () => true, // Don't throw on any status
    });

    const duration = Date.now() - startedAt;

    // Basic assertion - check status code
    if (expect?.status) {
      const passed = response.status === expect.status;
      return {
        name,
        passed,
        expected: expect.status,
        actual: response.status,
        method,
        url: fullUrl,
        duration,
      };
    }

    // Check response body
    if (expect?.body) {
      const bodyMatch = JSON.stringify(response.data).includes(
        JSON.stringify(expect.body)
      );
      return {
        name,
        passed: bodyMatch,
        expected: expect.body,
        actual: response.data,
        method,
        url: fullUrl,
        duration,
      };
    }

    return {
      name,
      passed: true,
      response: response.data,
      method,
      url: fullUrl,
      duration,
    };
  } catch (error) {
    throw new Error(`Request failed: ${error.message}`);
  }
}
