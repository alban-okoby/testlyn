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

  const itemsPerPage = 10;
  const totalPages = Math.ceil(results.length / itemsPerPage);

  const resultPages = [];
  for (let page = 0; page < totalPages; page++) {
    const startIdx = page * itemsPerPage;
    const endIdx = Math.min(startIdx + itemsPerPage, results.length);
    const pageResults = results.slice(startIdx, endIdx);

    const pageRows = pageResults
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

    resultPages.push(pageRows);
  }

  // Generate table bodies for each page (hidden by default, except first)
  const tableBodies = resultPages
    .map((pageRows, idx) => {
      const hidden = idx > 0 ? 'style="display:none;"' : '';
      return `<tbody class="page-body" ${hidden} data-page="${idx}">
${pageRows}
      </tbody>`;
    })
    .join('\n');

  // Generate pagination controls
  const pageButtons = Array.from({ length: totalPages }, (_, idx) => {
    const isActive = idx === 0 ? 'active' : '';
    return `<button class="page-btn ${isActive}" data-page="${idx}">${idx + 1}</button>`;
  }).join('\n      ');

  const paginationHtml =
    totalPages > 1
      ? `
    <div class="pagination-controls">
      <button id="prev-btn" ${totalPages <= 1 ? 'disabled' : ''}>← Previous</button>
      <div class="page-buttons">
        ${pageButtons}
      </div>
      <button id="next-btn" ${totalPages <= 1 ? 'disabled' : ''}>Next →</button>
    </div>
    <div class="pagination-info">
      Page <span id="current-page">1</span> of <span id="total-pages">${totalPages}</span> |
      Showing <span id="showing-start">1</span>-<span id="showing-end">${Math.min(itemsPerPage, results.length)}</span> of ${results.length} results
    </div>`
      : '';

  // Prepare data for JavaScript with HTML escaping done on server side
  const escapedResults = results.map(r => ({
    name: escapeHtml(r.name),
    passed: r.passed,
    method: escapeHtml(r.method || 'GET'),
    url: escapeHtml(r.url || '—'),
    expected: escapeHtml(r.expected !== undefined ? JSON.stringify(r.expected) : '—'),
    actual: escapeHtml(r.actual !== undefined ? JSON.stringify(r.actual) : (r.error || '—')),
    duration: escapeHtml(r.duration ? `${r.duration}ms` : '—'),
    error: escapeHtml(r.error || null),
  }));

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
      background: #667eea;
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

    .pagination-controls {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 1rem;
      margin: 2rem 0 1rem;
      flex-wrap: wrap;
    }

    .page-buttons {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      justify-content: center;
    }

    .page-btn {
      padding: 0.5rem 0.75rem;
      border: 1px solid #ddd;
      background: white;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.9rem;
      transition: all 0.2s;
    }

    .page-btn:hover {
      background: #f0f0f0;
      border-color: #667eea;
    }

    .page-btn.active {
      background: #667eea;
      color: white;
      border-color: #667eea;
    }

    .page-btn:disabled,
    #prev-btn:disabled,
    #next-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    #prev-btn,
    #next-btn {
      padding: 0.5rem 1rem;
      border: 1px solid #ddd;
      background: white;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.9rem;
      transition: all 0.2s;
    }

    #prev-btn:hover:not(:disabled),
    #next-btn:hover:not(:disabled) {
      background: #f0f0f0;
      border-color: #667eea;
    }

    .pagination-info {
      text-align: center;
      color: #666;
      font-size: 0.9rem;
      margin: 0.5rem 0;
    }

    .items-per-page-bottom {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      justify-content: flex-start;
      margin-top: 1rem;
      padding-left: 0;
    }

    .items-per-page-bottom select {
      padding: 0.5rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 0.9rem;
      background: white;
      cursor: pointer;
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
        ${tableBodies}
      </table>
      ${paginationHtml}
      ${results.length > 0 ? `
      <div class="items-per-page-bottom">
        <label for="items-select">Items per page:</label>
        <select id="items-select" onchange="updateItemsPerPage(this.value)">
          <option value="5">5</option>
          <option value="10" selected>10</option>
          <option value="25">25</option>
          <option value="50">50</option>
          <option value="${results.length}">All</option>
        </select>
      </div>
      ` : ''}
    </div>

    <div class="footer">
      <p>Generated by Testlyn v0.1.0</p>
    </div>
  </div>

  <script>
    function escapeHtml(str) {
      const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
      return String(str).replace(/[&<>"']/g, m => map[m]);
    }
    let currentItemsPerPage = 10;
    let allResults = ${JSON.stringify(escapedResults)};

    function updateItemsPerPage(value) {
      currentItemsPerPage = parseInt(value);
      renderTable();
    }

    function escapeHtmlDisplay(str) {
      return str;
    }

    function renderTable() {
      const totalPages = Math.ceil(allResults.length / currentItemsPerPage);
      const pageBodies = document.querySelectorAll('.page-body');
      pageBodies.forEach(body => body.remove());
      const tbody = document.querySelector('thead').parentElement;
      for (let page = 0; page < totalPages; page++) {
        const startIdx = page * currentItemsPerPage;
        const endIdx = Math.min(startIdx + currentItemsPerPage, allResults.length);
        const pageResults = allResults.slice(startIdx, endIdx);
        const pageBody = document.createElement('tbody');
        pageBody.className = 'page-body';
        pageBody.dataset.page = page;
        if (page > 0) pageBody.style.display = 'none';
        pageResults.forEach(result => {
          const tr = document.createElement('tr');
          tr.className = \`result-row \${result.passed ? 'pass' : 'fail'}\`;
          const status = result.passed ? '✅ Pass' : '❌ Fail';
          const actualCell = result.error !== 'null' && result.error !== null ? \`<td class="actual error">\${result.error}</td>\` : \`<td class="actual">\${result.actual}</td>\`;
          tr.innerHTML = \`
            <td class="status">\${status}</td>
            <td class="name">\${result.name}</td>
            <td class="method">\${result.method}</td>
            <td class="url">\${result.url}</td>
            <td class="expected">\${result.expected}</td>
            \${actualCell}
            <td class="duration">\${result.duration}</td>
          \`;
          pageBody.appendChild(tr);
        });
        tbody.appendChild(pageBody);
      }
      updatePaginationControls(totalPages);
    }

    function updatePaginationControls(totalPages) {
      if (totalPages <= 1) return;
      const paginationControls = document.querySelector('.pagination-controls');
      const paginationInfo = document.querySelector('.pagination-info');
      if (paginationControls) {
        document.querySelectorAll('.page-btn').forEach(btn => btn.remove());
        const pageButtonsDiv = paginationControls.querySelector('.page-buttons');
        for (let i = 0; i < totalPages; i++) {
          const btn = document.createElement('button');
          btn.className = 'page-btn' + (i === 0 ? ' active' : '');
          btn.dataset.page = i;
          btn.textContent = i + 1;
          btn.onclick = () => goToPage(i);
          pageButtonsDiv.appendChild(btn);
        }
      }
      updatePageInfo(0, totalPages);
    }

    function goToPage(pageNum) {
      const pageBodies = document.querySelectorAll('.page-body');
      pageBodies.forEach(body => body.style.display = 'none');
      const targetPage = document.querySelector(\`[data-page="\${pageNum}"]\`);
      if (targetPage) targetPage.style.display = '';
      document.querySelectorAll('.page-btn').forEach((btn, idx) => {
        btn.classList.toggle('active', idx === pageNum);
      });
      const totalPages = Math.ceil(allResults.length / currentItemsPerPage);
      const prevBtn = document.getElementById('prev-btn');
      const nextBtn = document.getElementById('next-btn');
      if (prevBtn) prevBtn.disabled = pageNum === 0;
      if (nextBtn) nextBtn.disabled = pageNum === totalPages - 1;
      updatePageInfo(pageNum, totalPages);
    }

    function updatePageInfo(currentPage, totalPages) {
      const startIdx = currentPage * currentItemsPerPage;
      const endIdx = Math.min(startIdx + currentItemsPerPage, allResults.length);
      const currentPageSpan = document.getElementById('current-page');
      const totalPagesSpan = document.getElementById('total-pages');
      const showingStart = document.getElementById('showing-start');
      const showingEnd = document.getElementById('showing-end');
      if (currentPageSpan) currentPageSpan.textContent = currentPage + 1;
      if (totalPagesSpan) totalPagesSpan.textContent = totalPages;
      if (showingStart) showingStart.textContent = startIdx + 1;
      if (showingEnd) showingEnd.textContent = endIdx;
    }

    function setupPaginationButtons() {
      const prevBtn = document.getElementById('prev-btn');
      const nextBtn = document.getElementById('next-btn');
      if (prevBtn) {
        prevBtn.onclick = () => {
          const currentBtn = document.querySelector('.page-btn.active');
          if (currentBtn && currentBtn.previousElementSibling) {
            const prevPageBtn = currentBtn.previousElementSibling;
            prevPageBtn.click();
          }
        };
      }
      if (nextBtn) {
        nextBtn.onclick = () => {
          const currentBtn = document.querySelector('.page-btn.active');
          if (currentBtn && currentBtn.nextElementSibling) {
            const nextPageBtn = currentBtn.nextElementSibling;
            nextPageBtn.click();
          }
        };
      }
    }

    document.addEventListener('DOMContentLoaded', () => {
      setupPaginationButtons();
      const totalPages = Math.ceil(allResults.length / currentItemsPerPage);
      if (totalPages > 1) {
        goToPage(0);
      }
    });
  </script>
</body>
</html>`;

  return html;
}

function getDefaultReportFilename() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `report-${year}-${month}-${day}-${hours}${minutes}${seconds}.html`;
}

export function generateHtmlReport(runResult, { testFile, outputPath } = {}) {
  const resolvedPath = outputPath || resolve(process.cwd(), getDefaultReportFilename());
  const html = buildHtmlReport({
    testFile,
    passedCount: runResult.passedCount,
    failedCount: runResult.failedCount,
    results: runResult.results,
  });

  writeFileSync(resolvedPath, html, 'utf-8');
  return resolvedPath;
}
