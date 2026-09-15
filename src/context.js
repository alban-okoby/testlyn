export function getPath(obj, path) {
  if (!path || typeof path !== 'string') return undefined;

  const segments = path.split(/\.|\[|\]/).filter(s => s.length > 0);
  let current = obj;

  for (const segment of segments) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[segment];
  }

  return current;
}

export function extractVariables(extractMap, rawResponse) {
  const extracted = {};

  for (const [varName, path] of Object.entries(extractMap)) {
    const value = getPath(rawResponse, path);
    if (value === undefined) {
      throw new Error(`Cannot extract '${varName}': path '${path}' not found in response`);
    }
    extracted[varName] = value;
  }

  return extracted;
}

function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => deepClone(item));
  const cloned = {};
  for (const [key, value] of Object.entries(obj)) {
    cloned[key] = deepClone(value);
  }
  return cloned;
}

function resolveStringReferences(str, context, testName) {
  if (typeof str !== 'string') return str;

  return str.replace(/\$\{([^}]+)\}/g, (match, key) => {
    if (context.vars[key] !== undefined) {
      return String(context.vars[key]);
    }

    const dotIndex = key.indexOf('.');
    if (dotIndex > -1) {
      const testRef = key.substring(0, dotIndex);
      const path = key.substring(dotIndex + 1);

      if (context.steps[testRef]) {
        const value = getPath(context.steps[testRef], path);
        if (value !== undefined) {
          return String(value);
        }
      }
    }

    throw new Error(
      `Test "${testName}": missing variable "${key}" (not yet extracted or no prior test produced it)`
    );
  });
}

function walkAndResolve(obj, context, testName) {
  if (typeof obj === 'string') {
    return resolveStringReferences(obj, context, testName);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => walkAndResolve(item, context, testName));
  }

  if (obj !== null && typeof obj === 'object') {
    const resolved = {};
    for (const [key, value] of Object.entries(obj)) {
      resolved[key] = walkAndResolve(value, context, testName);
    }
    return resolved;
  }

  return obj;
}

export function resolveStepReferences(test, context) {
  const cloned = deepClone(test);
  return walkAndResolve(cloned, context, test.name);
}
