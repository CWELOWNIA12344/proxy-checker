// Proxy Checker Application
// Sends proxy requests to API and displays results

const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// In-memory storage for proxy check results
let proxyResults = [];

/**
 * Check if a proxy is working by sending a test request
 * @param {string} proxyUrl - The proxy URL to check
 * @returns {Promise<object>} - Result object with status and response time
 */
async function checkProxy(proxyUrl) {
  const startTime = Date.now();
  try {
    const response = await axios.get('https://api.ipify.org?format=json', {
      httpAgent: new http.Agent({ proxy: proxyUrl }),
      httpsAgent: new https.Agent({ proxy: proxyUrl }),
      timeout: 5000,
    });
    
    const responseTime = Date.now() - startTime;
    return {
      proxy: proxyUrl,
      status: 'working',
      ip: response.data.ip,
      responseTime: responseTime,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      proxy: proxyUrl,
      status: 'failed',
      error: error.message,
      responseTime: responseTime,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * API Endpoint: POST /api/check-proxy
 * Checks a single proxy
 */
app.post('/api/check-proxy', async (req, res) => {
  const { proxy } = req.body;

  if (!proxy) {
    return res.status(400).json({ error: 'Proxy URL is required' });
  }

  try {
    const result = await checkProxy(proxy);
    proxyResults.push(result);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to check proxy', details: error.message });
  }
});

/**
 * API Endpoint: POST /api/check-proxies
 * Checks multiple proxies concurrently
 */
app.post('/api/check-proxies', async (req, res) => {
  const { proxies } = req.body;

  if (!Array.isArray(proxies) || proxies.length === 0) {
    return res.status(400).json({ error: 'Array of proxy URLs is required' });
  }

  try {
    const results = await Promise.all(proxies.map(proxy => checkProxy(proxy)));
    proxyResults.push(...results);
    res.json({
      total: results.length,
      results: results,
      summary: {
        working: results.filter(r => r.status === 'working').length,
        failed: results.filter(r => r.status === 'failed').length,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check proxies', details: error.message });
  }
});

/**
 * API Endpoint: GET /api/results
 * Retrieves all proxy check results
 */
app.get('/api/results', (req, res) => {
  res.json({
    total: proxyResults.length,
    results: proxyResults,
  });
});

/**
 * API Endpoint: GET /api/results/working
 * Retrieves only working proxies
 */
app.get('/api/results/working', (req, res) => {
  const workingProxies = proxyResults.filter(r => r.status === 'working');
  res.json({
    total: workingProxies.length,
    results: workingProxies,
  });
});

/**
 * API Endpoint: DELETE /api/results
 * Clears all results
 */
app.delete('/api/results', (req, res) => {
  proxyResults = [];
  res.json({ message: 'All results cleared', timestamp: new Date().toISOString() });
});

/**
 * API Endpoint: GET /api/stats
 * Returns statistics about proxy checks
 */
app.get('/api/stats', (req, res) => {
  const workingCount = proxyResults.filter(r => r.status === 'working').length;
  const failedCount = proxyResults.filter(r => r.status === 'failed').length;
  const avgResponseTime = proxyResults.length > 0
    ? (proxyResults.reduce((sum, r) => sum + r.responseTime, 0) / proxyResults.length).toFixed(2)
    : 0;

  res.json({
    totalChecks: proxyResults.length,
    working: workingCount,
    failed: failedCount,
    successRate: proxyResults.length > 0 ? ((workingCount / proxyResults.length) * 100).toFixed(2) : 0,
    averageResponseTime: `${avgResponseTime}ms`,
    lastUpdated: new Date().toISOString(),
  });
});

/**
 * Serve the main HTML page
 */
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Proxy Checker</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 20px;
        }
        .container {
          max-width: 1000px;
          margin: 0 auto;
          background: white;
          border-radius: 10px;
          padding: 30px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        }
        h1 { color: #333; margin-bottom: 30px; text-align: center; }
        h2 { color: #667eea; margin-top: 30px; margin-bottom: 15px; }
        .form-group {
          margin-bottom: 15px;
          display: flex;
          gap: 10px;
        }
        input, textarea {
          flex: 1;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 5px;
          font-family: monospace;
        }
        button {
          padding: 10px 20px;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-weight: bold;
          transition: background 0.3s;
        }
        button:hover { background: #764ba2; }
        button.secondary {
          background: #6c757d;
        }
        button.secondary:hover {
          background: #5a6268;
        }
        .results {
          margin-top: 20px;
          max-height: 500px;
          overflow-y: auto;
        }
        .result-item {
          padding: 15px;
          margin-bottom: 10px;
          border-left: 4px solid #ddd;
          background: #f8f9fa;
          border-radius: 5px;
        }
        .result-item.working {
          border-left-color: #28a745;
          background: #d4edda;
        }
        .result-item.failed {
          border-left-color: #dc3545;
          background: #f8d7da;
        }
        .result-item p {
          margin: 5px 0;
          color: #333;
        }
        .stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 15px;
          margin-top: 20px;
        }
        .stat-card {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 5px;
          text-align: center;
          border: 1px solid #ddd;
        }
        .stat-card .value {
          font-size: 24px;
          font-weight: bold;
          color: #667eea;
        }
        .stat-card .label {
          color: #666;
          font-size: 12px;
          margin-top: 5px;
        }
        .loading {
          text-align: center;
          color: #667eea;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🔍 Proxy Checker</h1>
        
        <div>
          <h2>Check Single Proxy</h2>
          <div class="form-group">
            <input type="text" id="singleProxy" placeholder="http://proxy.example.com:8080" />
            <button onclick="checkSingleProxy()">Check</button>
          </div>
        </div>

        <div>
          <h2>Check Multiple Proxies</h2>
          <div class="form-group">
            <textarea id="multipleProxies" rows="5" placeholder="Enter proxies (one per line)&#10;http://proxy1.com:8080&#10;http://proxy2.com:8080"></textarea>
          </div>
          <div class="form-group">
            <button onclick="checkMultipleProxies()">Check All</button>
            <button class="secondary" onclick="clearResults()">Clear Results</button>
          </div>
        </div>

        <div>
          <h2>Statistics</h2>
          <div class="stats" id="stats">
            <div class="loading">Loading...</div>
          </div>
        </div>

        <div>
          <h2>Results</h2>
          <div class="results" id="results"></div>
        </div>
      </div>

      <script>
        async function checkSingleProxy() {
          const proxy = document.getElementById('singleProxy').value;
          if (!proxy) {
            alert('Please enter a proxy URL');
            return;
          }
          
          try {
            const response = await fetch('/api/check-proxy', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ proxy }),
            });
            const result = await response.json();
            displayResults();
            document.getElementById('singleProxy').value = '';
          } catch (error) {
            alert('Error: ' + error.message);
          }
        }

        async function checkMultipleProxies() {
          const proxies = document.getElementById('multipleProxies').value
            .split('\\n')
            .map(p => p.trim())
            .filter(p => p);
          
          if (proxies.length === 0) {
            alert('Please enter at least one proxy URL');
            return;
          }
          
          try {
            const response = await fetch('/api/check-proxies', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ proxies }),
            });
            const result = await response.json();
            console.log('Results:', result);
            displayResults();
          } catch (error) {
            alert('Error: ' + error.message);
          }
        }

        async function displayResults() {
          try {
            const response = await fetch('/api/results');
            const data = await response.json();
            const resultsDiv = document.getElementById('results');
            
            if (data.results.length === 0) {
              resultsDiv.innerHTML = '<p>No results yet. Check some proxies!</p>';
              return;
            }

            resultsDiv.innerHTML = data.results.reverse().map(result => \`
              <div class="result-item \${result.status}">
                <p><strong>Proxy:</strong> \${result.proxy}</p>
                <p><strong>Status:</strong> \${result.status === 'working' ? '✅ Working' : '❌ Failed'}</p>
                \${result.ip ? \`<p><strong>IP:</strong> \${result.ip}</p>\` : ''}
                <p><strong>Response Time:</strong> \${result.responseTime}ms</p>
                \${result.error ? \`<p><strong>Error:</strong> \${result.error}</p>\` : ''}
                <p><small>Checked: \${new Date(result.timestamp).toLocaleString()}</small></p>
              </div>
            \`).join('');

            updateStats();
          } catch (error) {
            console.error('Error displaying results:', error);
          }
        }

        async function updateStats() {
          try {
            const response = await fetch('/api/stats');
            const stats = await response.json();
            document.getElementById('stats').innerHTML = \`
              <div class="stat-card">
                <div class="value">\${stats.totalChecks}</div>
                <div class="label">Total Checks</div>
              </div>
              <div class="stat-card">
                <div class="value">\${stats.working}</div>
                <div class="label">Working</div>
              </div>
              <div class="stat-card">
                <div class="value">\${stats.failed}</div>
                <div class="label">Failed</div>
              </div>
              <div class="stat-card">
                <div class="value">\${stats.successRate}%</div>
                <div class="label">Success Rate</div>
              </div>
              <div class="stat-card">
                <div class="value">\${stats.averageResponseTime}</div>
                <div class="label">Avg Response</div>
              </div>
            \`;
          } catch (error) {
            console.error('Error updating stats:', error);
          }
        }

        async function clearResults() {
          if (confirm('Are you sure you want to clear all results?')) {
            try {
              await fetch('/api/results', { method: 'DELETE' });
              document.getElementById('results').innerHTML = '';
              updateStats();
            } catch (error) {
              alert('Error: ' + error.message);
            }
          }
        }

        // Load results on page load
        displayResults();
        updateStats();
      </script>
    </body>
    </html>
  `);
});

/**
 * Error handling middleware
 */
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({ error: 'Internal Server Error', details: error.message });
});

/**
 * Start the server
 */
app.listen(PORT, () => {
  console.log(`Proxy Checker API running on http://localhost:${PORT}`);
  console.log('API endpoints:');
  console.log('  POST /api/check-proxy - Check single proxy');
  console.log('  POST /api/check-proxies - Check multiple proxies');
  console.log('  GET /api/results - Get all results');
  console.log('  GET /api/results/working - Get working proxies only');
  console.log('  GET /api/stats - Get statistics');
  console.log('  DELETE /api/results - Clear all results');
});

module.exports = app;
