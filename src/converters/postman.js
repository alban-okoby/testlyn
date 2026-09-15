export function postmanVarsToTestlyn(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/\{\{([^}]+)\}\}/g, (match, varName) => `\${${varName}}`);
}

function flattenPostmanItems(items, parentFolder = '') {
  const flattened = [];

  for (const item of items) {
    if (item.item && Array.isArray(item.item)) {
      const folderName = parentFolder ? `${parentFolder} / ${item.name}` : item.name;
      flattened.push(...flattenPostmanItems(item.item, folderName));
    } else if (item.request) {
      const testName = parentFolder ? `${parentFolder} / ${item.name}` : item.name;
      flattened.push({ ...item, testName });
    }
  }

  return flattened;
}

export function convertPostman(collection) {
  if (!collection.info) {
    throw new Error('Invalid Postman collection: missing info');
  }

  if (!Array.isArray(collection.item)) {
    throw new Error('Invalid Postman collection: item array not found');
  }

  const tests = [];
  const flatItems = flattenPostmanItems(collection.item);

  for (const item of flatItems) {
    const request = item.request;

    let url = '';
    if (typeof request.url === 'string') {
      url = postmanVarsToTestlyn(request.url);
    } else if (request.url) {
      url = request.url.raw ? postmanVarsToTestlyn(request.url.raw) : '';
    }

    const method = request.method || 'GET';

    const test = {
      name: item.testName,
      url,
      method,
      expect: { status: 200 },
    };

    const headers = {};
    if (Array.isArray(request.header)) {
      for (const hdr of request.header) {
        if (!hdr.disabled && hdr.key && hdr.value !== undefined) {
          headers[hdr.key] = postmanVarsToTestlyn(hdr.value);
        }
      }
    }

    if (request.auth && request.auth.type === 'bearer') {
      const token = postmanVarsToTestlyn(request.auth.bearer?.[0]?.value || '');
      headers.Authorization = `Bearer ${token}`;
    }

    if (Object.keys(headers).length > 0) {
      test.headers = headers;
    }

    if (request.body) {
      const mode = request.body.mode || 'raw';

      if (mode === 'raw' && request.body.raw) {
        let body = postmanVarsToTestlyn(request.body.raw);
        try {
          test.body = JSON.parse(body);
        } catch {
          test.body = body;
        }
      } else if (mode === 'urlencoded' && Array.isArray(request.body.urlencoded)) {
        const encoded = {};
        for (const param of request.body.urlencoded) {
          if (!param.disabled && param.key) {
            encoded[param.key] = postmanVarsToTestlyn(param.value || '');
          }
        }
        if (Object.keys(encoded).length > 0) {
          test.body = encoded;
          headers['Content-Type'] = 'application/x-www-form-urlencoded';
        }
      } else if (mode === 'formdata' && Array.isArray(request.body.formdata)) {
        const formData = {};
        for (const field of request.body.formdata) {
          if (!field.disabled && field.key && field.type !== 'file') {
            formData[field.key] = postmanVarsToTestlyn(field.value || '');
          }
        }
        if (Object.keys(formData).length > 0) {
          test.body = formData;
        }
      }
    }

    tests.push(test);
  }

  return { suite: collection.info.name, tests };
}
