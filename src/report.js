import { writeFileSync } from 'fs';
import { resolve } from 'path';

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    '\'': '&#039;',
  };
  return String(text).replace(/[&<>"']/g, (m) => map[m]);
}

export function buildHtmlReport({ testFile, passedCount, failedCount, results, generatedAt = new Date() }) {
  const totalTests = passedCount + failedCount;
  const passRate = totalTests > 0 ? Math.round((passedCount / totalTests) * 100) : 0;
  const timestamp = generatedAt.toLocaleString();

  const resultRows = results
    .map((result) => {
      const status = result.passed ? '✅ Pass' : '❌ Fail';
      const statusClass = result.passed ? 'pass' : 'fail';
      const name = escapeHtml(result.name);
      const method = escapeHtml(result.method || '—');
      const url = escapeHtml(result.url || '—');
      const duration = result.duration ? `${result.duration}ms` : '—';

      if (result.error) {
        const error = escapeHtml(result.error);
        return `
      <tr class="result-row ${statusClass}">
        <td class="status">${status}</td>
        <td class="name">${name}</td>
        <td class="method">${method}</td>
        <td class="url">${url}</td>
        <td class="expected">—</td>
        <td class="actual error">${error}</td>
        <td class="duration">${duration}</td>
      </tr>`;
      }

      const expected = result.expected !== undefined ? escapeHtml(JSON.stringify(result.expected)) : '—';
      const actual = result.actual !== undefined ? escapeHtml(JSON.stringify(result.actual)) : '—';

      return `
      <tr class="result-row ${statusClass}">
        <td class="status">${status}</td>
        <td class="name">${name}</td>
        <td class="method">${method}</td>
        <td class="url">${url}</td>
        <td class="expected">${expected}</td>
        <td class="actual">${actual}</td>
        <td class="duration">${duration}</td>
      </tr>`;
    })
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Testlyn Report</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      padding: 2rem;
      min-height: 100vh;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }

    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 2rem;
      text-align: center;
    }

    .header h1 {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
    }

    .header .meta {
      font-size: 0.95rem;
      opacity: 0.9;
    }

    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      padding: 2rem;
      background: #f8f9fa;
      border-bottom: 1px solid #e9ecef;
    }

    .stat {
      text-align: center;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: bold;
      color: #333;
    }

    .stat-label {
      font-size: 0.9rem;
      color: #666;
      margin-top: 0.25rem;
    }

    .stat.pass .stat-value {
      color: #28a745;
    }

    .stat.fail .stat-value {
      color: #dc3545;
    }

    .stat.rate .stat-value {
      color: #667eea;
    }

    .results-section {
      padding: 2rem;
    }

    .results-section h2 {
      margin-bottom: 1rem;
      color: #333;
      font-size: 1.5rem;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }

    thead {
      background: #f8f9fa;
      border-bottom: 2px solid #e9ecef;
    }

    th {
      padding: 1rem;
      text-align: left;
      font-weight: 600;
      color: #333;
    }

    td {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid #e9ecef;
    }

    tr:hover {
      background: #f8f9fa;
    }

    .result-row.pass .status {
      color: #28a745;
      font-weight: bold;
    }

    .result-row.fail .status {
      color: #dc3545;
      font-weight: bold;
    }

    .result-row.fail .actual.error {
      color: #dc3545;
      font-style: italic;
    }

    .name {
      font-weight: 500;
      color: #333;
    }

    .method {
      font-family: 'Courier New', monospace;
      color: #666;
      font-size: 0.85rem;
    }

    .url {
      font-family: 'Courier New', monospace;
      color: #666;
      font-size: 0.85rem;
      word-break: break-all;
    }

    .expected,
    .actual {
      font-family: 'Courier New', monospace;
      font-size: 0.85rem;
      color: #555;
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: pre-wrap;
    }

    .duration {
      text-align: right;
      color: #999;
      font-size: 0.85rem;
    }

    .footer {
      background: #f8f9fa;
      padding: 1rem 2rem;
      text-align: center;
      border-top: 1px solid #e9ecef;
      color: #666;
      font-size: 0.9rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🧪 Testlyn Report</h1>
      <div class="meta">
        <div>File: <strong>${escapeHtml(testFile)}</strong></div>
        <div>Generated: <strong>${timestamp}</strong></div>
      </div>
    </div>

    <div class="summary">
      <div class="stat total">
        <div class="stat-value">${totalTests}</div>
        <div class="stat-label">Total Tests</div>
      </div>
      <div class="stat pass">
        <div class="stat-value">${passedCount}</div>
        <div class="stat-label">Passed</div>
      </div>
      <div class="stat fail">
        <div class="stat-value">${failedCount}</div>
        <div class="stat-label">Failed</div>
      </div>
      <div class="stat rate">
        <div class="stat-value">${passRate}%</div>
        <div class="stat-label">Pass Rate</div>
      </div>
    </div>

    <div class="results-section">
      <h2>Test Results</h2>
      <table>
        <thead>
          <tr>
            <th>Status</th>
            <th>Test Name</th>
            <th>Method</th>
            <th>URL</th>
            <th>Expected</th>
            <th>Actual / Error</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
${resultRows}
        </tbody>
      </table>
    </div>

    <div class="footer">
      <p>Generated by Testlyn v0.1.0</p>
    </div>
  </div>
</body>
</html>`;

  return html;
}

export function generateHtmlReport(runResult, { testFile, outputPath } = {}) {
  const resolvedPath = outputPath || resolve(process.cwd(), 'testlyn-report.html');
  const html = buildHtmlReport({
    testFile,
    passedCount: runResult.passedCount,
    failedCount: runResult.failedCount,
    results: runResult.results,
  });

  writeFileSync(resolvedPath, html, 'utf-8');
  return resolvedPath;
}
