export function resolveRef(doc, ref) {
  if (!ref.startsWith('#/')) {
    return { $unresolved: ref };
  }

  const parts = ref.slice(2).split('/');
  let current = doc;

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return { $unresolved: ref };
    }
    current = current[part];
  }

  return current;
}

export function generateExampleFromSchema(schema, doc, depth = 0) {
  if (depth > 6) {
    return null;
  }

  if (schema.example !== undefined) {
    return schema.example;
  }

  if (schema.$ref) {
    const resolved = resolveRef(doc, schema.$ref);
    if (resolved.$unresolved) {
      return null;
    }
    return generateExampleFromSchema(resolved, doc, depth + 1);
  }

  const type = schema.type;

  if (type === 'object') {
    const obj = {};
    if (schema.properties) {
      for (const [key, prop] of Object.entries(schema.properties)) {
        obj[key] = generateExampleFromSchema(prop, doc, depth + 1);
      }
    }
    return obj;
  }

  if (type === 'array') {
    if (schema.items) {
      const itemExample = generateExampleFromSchema(schema.items, doc, depth + 1);
      return itemExample !== null ? [itemExample] : [];
    }
    return [];
  }

  if (type === 'string') return '';
  if (type === 'number') return 0;
  if (type === 'integer') return 0;
  if (type === 'boolean') return false;

  return null;
}

export function convertOpenApi(doc) {
  if (!doc.info) {
    throw new Error('Invalid OpenAPI spec: missing info');
  }

  const baseUrl = doc.servers?.[0]?.url || '';
  const tests = [];

  if (!doc.paths) {
    return { suite: doc.info.title, baseUrl, tests };
  }

  const methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

  for (const [path, pathItem] of Object.entries(doc.paths)) {
    const pathParams = pathItem.parameters || [];

    for (const method of methods) {
      const operation = pathItem[method];
      if (!operation) continue;

      const operationParams = operation.parameters || [];
      const allParams = [...pathParams, ...operationParams];

      const name = operation.operationId || operation.summary || `${method.toUpperCase()} ${path}`;

      let url = path;
      const queryParams = [];
      const headers = {};

      for (const param of allParams) {
        const paramObj = param.$ref ? resolveRef(doc, param.$ref) : param;

        const paramName = paramObj.name;
        const paramValue = paramObj.example || paramObj.default || `\${${paramName}}`;

        if (paramObj.in === 'path') {
          url = url.replace(`{${paramName}}`, paramValue);
        } else if (paramObj.in === 'query' && paramObj.required) {
          queryParams.push(`${paramName}=${paramValue}`);
        } else if (paramObj.in === 'header') {
          headers[paramName] = paramValue;
        }
      }

      if (queryParams.length > 0) {
        url += '?' + queryParams.join('&');
      }

      const test = {
        name,
        url,
        method: method.toUpperCase(),
        expect: { status: 200 },
      };

      if (Object.keys(headers).length > 0) {
        test.headers = headers;
      }

      if (operation.requestBody) {
        const jsonContent = operation.requestBody.content?.['application/json'];
        if (jsonContent?.schema) {
          const example = generateExampleFromSchema(jsonContent.schema, doc);
          if (example !== null) {
            test.body = example;
            headers['Content-Type'] = 'application/json';
          }
        }
      }

      if (operation.responses) {
        const status2xx = Object.keys(operation.responses)
          .filter(code => code !== 'default' && /^2\d\d$/.test(code))
          .sort()[0];
        if (status2xx) {
          test.expect.status = parseInt(status2xx, 10);
        }
      }

      tests.push(test);
    }
  }

  return { suite: doc.info.title, baseUrl, tests };
}
