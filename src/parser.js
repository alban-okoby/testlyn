import { readFileSync } from 'fs';
import YAML from 'yaml';
import { loadEnv, processEnvVariables } from './env.js';

export function parseTestFile(filePath, envPath) {
  try {
    if (!filePath.endsWith('.yml') && !filePath.endsWith('.yaml')) {
      throw new Error('Test file must have .yml or .yaml extension');
    }

    const fileContent = readFileSync(filePath, 'utf-8');
    const parsed = YAML.parse(fileContent);

    if (!parsed || !parsed.tests) {
      throw new Error('Invalid test file format. Expected "tests" key at root level.');
    }

    const env = envPath ? loadEnv(envPath) : {};
    const processedParsed = processEnvVariables(parsed, env);

    validateTestStructure(processedParsed);
    return processedParsed;
  } catch (error) {
    throw new Error(`Failed to parse test file: ${error.message}`);
  }
}

function validateTestStructure(testSuite) {
  if (!Array.isArray(testSuite.tests)) {
    throw new Error('"tests" must be an array');
  }

  testSuite.tests.forEach((test, index) => {
    if (!test.name) {
      throw new Error(`Test at index ${index} must have a "name"`);
    }
    if (!test.url) {
      throw new Error(`Test "${test.name}" must have a "url"`);
    }
  });
}

export function createTestTemplate(projectName = 'My API Tests') {
  return `# ${projectName}
# Testlyn - API Testing using YAML

tests:
  - name: Health Check
    url: https://api.example.com/health
    method: GET
    expect:
      status: 200

  - name: Create Resource
    url: https://api.example.com/resources
    method: POST
    headers:
      Content-Type: application/json
    body:
      name: "Test Resource"
      description: "Created via Testlyn"
    expect:
      status: 201

  - name: Get Resource
    url: https://api.example.com/resources/1
    method: GET
    expect:
      status: 200
      body:
        id: 1
`;
}
