const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

/**
 * executeCode - calls Piston (if configured) else returns a mocked response
 */
async function executeCode(language, code, stdin = '') {
  const url = process.env.PISTON_URL;
  const key = process.env.PISTON_KEY;

  if (!url) {
    // Mocked response for demo
    return {
      stdout: 'Demo execution (PISTON_URL not set).\\nYour code:\\n' + code.slice(0, 400),
      stderr: '',
      exitCode: 0
    };
  }

  const body = { language, source: code, stdin };
  const headers = { 'Content-Type': 'application/json' };
  if (key) headers['Authorization'] = key;

  const res = await fetch(url, { method: 'POST', body: JSON.stringify(body), headers });
  if (!res.ok) {
    const text = await res.text();
    return { stdout: '', stderr: 'Execution API error: ' + text, exitCode: 1 };
  }
const json = await res.json();
  return {
    stdout: json?.run?.stdout ?? '',
    stderr: json?.run?.stderr ?? '',
    exitCode: json?.run?.code ?? 0
  };
}

module.exports = { executeCode };
