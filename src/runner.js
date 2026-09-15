import axios from 'axios';
import chalk from 'chalk';
import { resolveStepReferences, extractVariables } from './context.js';

export async function runTests(testFile, options = {}) {
  const { parseTestFile } = await import('./parser.js');
  const tests = parseTestFile(testFile, options.envFile);

  if (!tests || !tests.tests) {
    throw new Error('Invalid test file format. Expected "tests" key.');
  }

  let passedCount = 0;
  let failedCount = 0;
  const results = [];
  const context = { vars: {}, steps: {} };

  console.log(chalk.blue(`\n🧪 Running ${tests.tests.length} test(s)...\n`));

  for (const test of tests.tests) {
    try {
      const resolvedTest = resolveStepReferences(test, context);
      const result = await executeTest(resolvedTest, tests.baseUrl);

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

      if (result.rawResponse) {
        context.steps[test.name] = result.rawResponse;

        if (test.extract) {
          try {
            const extracted = extractVariables(test.extract, result.rawResponse);
            Object.assign(context.vars, extracted);
          } catch (error) {
            failedCount++;
            results[results.length - 1] = {
              ...result,
              passed: false,
              error: error.message,
            };
            console.log(chalk.red(`   Extraction error: ${error.message}`));

            if (options.stopOnError) {
              break;
            }
          }
        }
      }

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
    const rawResponse = { status: response.status, headers: response.headers, body: response.data };

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
        rawResponse,
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
        rawResponse,
      };
    }

    return {
      name,
      passed: true,
      response: response.data,
      method,
      url: fullUrl,
      duration,
      rawResponse,
    };
  } catch (error) {
    throw new Error(`Request failed: ${error.message}`);
  }
}
