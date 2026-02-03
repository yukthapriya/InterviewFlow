const { fetch } = require('undici');

/**
 * Robust executor with 429 handling and runtime caching.
 *
 * - Retries on 429 with exponential backoff and honors Retry-After header when present.
 * - Caches runtimes for 5 minutes.
 * - Tries multiple request shapes to accommodate different Piston deployments.
 */

const RUNTIMES_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
let runtimesCache = { ts: 0, data: null };

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

async function fetchWithRetry(url, options = {}, maxRetries = 5) {
  let attempt = 0;
  let backoff = 200; // ms
  while (true) {
    attempt += 1;
    try {
      const res = await fetch(url, { ...options, bodyTimeout: 120000 });
      const status = res.status;
      const headersObj = res.headers || {};
      const retryAfter = headersObj.get ? headersObj.get('retry-after') : null;
      const text = await res.text();
      let json = null;
      try { json = JSON.parse(text); } catch (e) { json = null; }
      if (status === 429 && attempt <= maxRetries) {
        // parse Retry-After if present (seconds)
        let wait = backoff;
        if (retryAfter) {
          const n = parseInt(String(retryAfter), 10);
          if (!Number.isNaN(n)) wait = Math.max(wait, n * 1000);
        }
        console.log(`[executor] 429 received, retrying after ${wait}ms (attempt ${attempt}/${maxRetries})`);
        await sleep(wait);
        backoff = Math.min(2000, backoff * 2);
        continue;
      }
      return { status, text, json, headers: headersObj };
    } catch (err) {
      if (attempt >= maxRetries) throw err;
      console.log(`[executor] fetch error, retrying after ${backoff}ms (attempt ${attempt}/${maxRetries}):`, err && err.message ? err.message : err);
      await sleep(backoff);
      backoff = Math.min(2000, backoff * 2);
    }
  }
}

async function postJsonWithRetry(targetUrl, body, headers = {}, maxRetries = 5) {
  const options = {
    method: 'POST',
    body: JSON.stringify(body),
    headers: headers,
  };
  return await fetchWithRetry(targetUrl, options, maxRetries);
}

function filenameForLanguage(lang) {
  const m = String(lang).toLowerCase();
  const map = {
    python: 'py',
    javascript: 'js',
    typescript: 'ts',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    cs: 'cs',
    ruby: 'rb',
    go: 'go',
    php: 'php',
    rust: 'rs'
  };
  return map[m] || 'txt';
}

function normalizeRun(json) {
  const run = (json && json.run) ? json.run : json;
  return {
    stdout: (run && (run.stdout !== undefined)) ? run.stdout : (json && json.stdout) ? json.stdout : '',
    stderr: (run && (run.stderr !== undefined)) ? run.stderr : (json && json.stderr) ? json.stderr : '',
    exitCode: (run && (run.code !== undefined)) ? run.code : (json && json.code !== undefined) ? json.code : 0
  };
}

function deriveRuntimesUrl(executeUrl) {
  try {
    if (executeUrl.match(/\/execute\/?$/)) {
      return executeUrl.replace(/\/execute\/?$/, '/runtimes');
    }
    const u = new URL(executeUrl);
    return `${u.origin}${u.pathname.replace(/\/+$/, '')}/runtimes`;
  } catch (e) {
    return null;
  }
}

async function fetchRuntimesCached(runtimesUrl, headersBase) {
  const now = Date.now();
  if (runtimesCache.data && (now - runtimesCache.ts) < RUNTIMES_CACHE_TTL_MS) {
    return runtimesCache.data;
  }
  try {
    const res = await fetchWithRetry(runtimesUrl, { method: 'GET', headers: headersBase }, 3);
    if (res && res.status >= 200 && res.status < 300 && Array.isArray(res.json)) {
      runtimesCache = { ts: now, data: res.json };
      return res.json;
    }
  } catch (err) {
    console.error('[executor] runtimes fetch failed:', err && err.message ? err.message : err);
  }
  return null;
}

async function executeCode(language, code, stdin = '') {
  const url = process.env.PISTON_URL;
  const key = process.env.PISTON_KEY;

  if (!url) {
    return {
      stdout: 'Demo execution (PISTON_URL not set)\nYour code:\n' + code.slice(0, 400),
      stderr: '',
      exitCode: 0
    };
  }

  const headersBase = { 'Content-Type': 'application/json' };
  if (key) {
    headersBase['Authorization'] = key;
    headersBase['X-API-Key'] = key;
  }

  try {
    // 1) Try simple { language, source }
    const simpleBody = { language, source: code, stdin };
    console.log('[executor] POST (simple) ->', url);
    const res1 = await postJsonWithRetry(url, simpleBody, headersBase, 5);
    console.log('[executor] status:', res1.status);
    console.log('[executor] response (truncated):', (res1.text || '').slice(0, 2000));
    if (res1.status >= 200 && res1.status < 300) return normalizeRun(res1.json);

    const lowerText = (res1.text || '').toLowerCase();

    // 2) If "files is required", try files shape
    if (lowerText.includes('files is required')) {
      const ext = filenameForLanguage(language);
      const fileName = `Main.${ext}`;
      const filesBody = { language, files: [{ name: fileName, content: code }], stdin };
      console.log('[executor] retrying with files body');
      const rFiles = await postJsonWithRetry(url, filesBody, headersBase, 5);
      console.log('[executor] retry status (files):', rFiles.status);
      console.log('[executor] retry response (files, truncated):', (rFiles.text || '').slice(0, 2000));
      if (rFiles.status >= 200 && rFiles.status < 300) return normalizeRun(rFiles.json);
      // If that returns version required, fall through to version flow (setting variables)
      if (!(String(rFiles.status) === '400' && (rFiles.text || '').toLowerCase().includes('version is required'))) {
        return { stdout: '', stderr: `Execution API error (status ${rFiles.status}): ${rFiles.text}`, exitCode: 1 };
      }
      // else allow version flow below
    }

    // 3) If "version is required" or fallback, try fetching runtimes and retry with version
    if ( (res1.status === 400 && lowerText.includes('version is required')) || (String(res1.status) === '400' && (res1.text || '').toLowerCase().includes('version is required')) ) {
      const runtimesUrl = deriveRuntimesUrl(url);
      if (runtimesUrl) {
        console.log('[executor] Fetching runtimes from', runtimesUrl);
        const runtimes = await fetchRuntimesCached(runtimesUrl, headersBase);
        if (runtimes && Array.isArray(runtimes)) {
          const candidate = runtimes.find((rt) => String(rt.language).toLowerCase() === String(language).toLowerCase());
          let version = null;
          if (candidate) {
            if (candidate.version) version = candidate.version;
            else if (Array.isArray(candidate.versions) && candidate.versions.length > 0) version = candidate.versions[0];
          }

          if (version) {
            // Try with source + version
            const retryBody = { language, version: String(version), source: code, stdin };
            console.log('[executor] retrying execute with version:', version);
            const rVer = await postJsonWithRetry(url, retryBody, headersBase, 5);
            console.log('[executor] retry status:', rVer.status);
            console.log('[executor] retry response (truncated):', (rVer.text || '').slice(0, 2000));
            if (rVer.status >= 200 && rVer.status < 300) return normalizeRun(rVer.json);

            // If still requires files, try files + version
            if (String(rVer.status) === '400' && (rVer.text || '').toLowerCase().includes('files is required')) {
              const ext = filenameForLanguage(language);
              const fileName = `Main.${ext}`;
              const retryFilesBody = { language, version: String(version), files: [{ name: fileName, content: code }], stdin };
              console.log('[executor] retrying execute with files + version:', version);
              const r3 = await postJsonWithRetry(url, retryFilesBody, headersBase, 5);
              console.log('[executor] retry status (files+version):', r3.status);
              console.log('[executor] retry response (truncated):', (r3.text || '').slice(0, 2000));
              if (r3.status >= 200 && r3.status < 300) return normalizeRun(r3.json);
              return { stdout: '', stderr: `Execution API error (status ${r3.status}): ${r3.text}`, exitCode: 1 };
            }
            return { stdout: '', stderr: `Execution API error (status ${rVer.status}): ${rVer.text}`, exitCode: 1 };
          } else {
            console.log('[executor] No matching runtime/version found in runtimes response');
          }
        } else {
          console.log('[executor] runtimes fetch did not return array or failed');
        }
      } else {
        console.log('[executor] could not derive runtimes URL from', url);
      }
    }

    // Generic fallback error
    return { stdout: '', stderr: `Execution API error (status ${res1.status}): ${res1.text}`, exitCode: 1 };
  } catch (err) {
    console.error('[executor] Exception:', err);
    return { stdout: '', stderr: 'Executor exception: ' + (err && err.message ? err.message : String(err)), exitCode: 1 };
  }
}

module.exports = { executeCode };