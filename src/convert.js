import { readFileSync } from 'fs';
import YAML from 'yaml';
import { convertOpenApi } from './converters/openapi.js';
import { convertPostman } from './converters/postman.js';

export function detectFormat(parsedDoc) {
  if (parsedDoc.openapi) {
    if (parsedDoc.openapi.startsWith('3.')) {
      return 'openapi';
    }
    throw new Error(`Unsupported OpenAPI version: ${parsedDoc.openapi}. Only 3.x is supported.`);
  }

  if (parsedDoc.swagger) {
    throw new Error('Swagger 2.0 is not supported. Please use OpenAPI 3.x instead.');
  }

  if (parsedDoc.info && Array.isArray(parsedDoc.item)) {
    return 'postman';
  }

  throw new Error('Unrecognized format — expected an OpenAPI 3.x spec or a Postman collection');
}

export function convertToTestlyn(filePath, { format } = {}) {
  const content = readFileSync(filePath, 'utf-8');

  let parsedDoc;
  try {
    parsedDoc = JSON.parse(content);
  } catch {
    parsedDoc = YAML.parse(content);
  }

  const detectedFormat = format || detectFormat(parsedDoc);

  let testSuite;
  if (detectedFormat === 'openapi') {
    testSuite = convertOpenApi(parsedDoc);
  } else if (detectedFormat === 'postman') {
    testSuite = convertPostman(parsedDoc);
  } else {
    throw new Error(`Unknown format: ${detectedFormat}`);
  }

  return { format: detectedFormat, testSuite };
}
