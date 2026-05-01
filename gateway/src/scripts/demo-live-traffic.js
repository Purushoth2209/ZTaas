/**
 * Live demo: drive real HTTP traffic through the gateway as normal / suspect / attacker personas.
 * Populates telemetry_logs → baseline job → rule-based risk; optionally enqueue ML features if enabled.
 *
 * Prerequisites:
 *   - MongoDB, gateway (8081), backend (5001) running
 *   - Users from backend-service/src/data/users.js (password default: password123)
 *
 * Usage:
 *   cd gateway && node src/scripts/demo-live-traffic.js
 *   GATEWAY_URL=http://127.0.0.1:8081 DEMO_PASSWORD=secret node src/scripts/demo-live-traffic.js
 *
 * Options (env):
 *   GATEWAY_URL    — default http://127.0.0.1:8081
 *   DEMO_PASSWORD  — default password123
 *   PHASE_PAUSE_MS — pause between personas (default 600)
 */
import 'dotenv/config';

const GATEWAY = process.env.GATEWAY_URL || 'http://127.0.0.1:8081';
const PASSWORD = process.env.DEMO_PASSWORD || 'password123';
const PHASE_PAUSE_MS = Number(process.env.PHASE_PAUSE_MS) || 600;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

/** Backend routes behind gateway (no /api prefix). */
const PATHS_OK = [
  () => '/users',
  () => '/users/1',
  () => '/orders',
  () => '/hello',
];

const PATHS_MIXED = [...PATHS_OK, () => `/users/${randInt(9000, 9999)}`, () => `/users/${randInt(50, 99)}`];

async function login(username) {
  const res = await fetch(`${GATEWAY}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: PASSWORD }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Login failed for ${username}: ${res.status} ${JSON.stringify(data)}`);
  }
  const token = data.accessToken || data.token;
  if (!token) throw new Error(`No token for ${username}: ${JSON.stringify(data)}`);
  return token;
}

async function requestGateway(token, method, path, opts = {}) {
  const headers = {
    Authorization: `Bearer ${token}`,
    'User-Agent': opts.userAgent || 'ZTaaS-demo/1.0',
    ...opts.headers,
  };
  const init = { method, headers };
  if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body);
  }
  const res = await fetch(`${GATEWAY}${path}`, init);
  await res.text().catch(() => {});
  return res.status;
}

/**
 * @param {object} cfg
 * @param {string} cfg.username
 * @param {number} cfg.totalRequests
 * @param {number} cfg.minDelayMs
 * @param {number} cfg.maxDelayMs
 * @param {() => string} cfg.pickPath
 * @param {string[]} cfg.methods
 * @param {string[]} [cfg.userAgents]
 */
async function runPersonaBurst(cfg) {
  const token = await login(cfg.username);
  let ok = 0;
  let fail = 0;
  for (let i = 0; i < cfg.totalRequests; i++) {
    const path = cfg.pickPath();
    const method = pick(cfg.methods);
    const ua = cfg.userAgents ? pick(cfg.userAgents) : 'ZTaaS-demo/1.0';
    try {
      const status = await requestGateway(token, method, path, {
        userAgent: ua,
        body: method !== 'GET' && method !== 'HEAD' ? { demo: true, i } : undefined,
      });
      if (status >= 200 && status < 400) ok++;
      else fail++;
    } catch (e) {
      fail++;
      console.error(`    [${cfg.username}] ${method} ${path} → ${e.message}`);
    }
    if (i < cfg.totalRequests - 1) {
      const d =
        cfg.minDelayMs +
        Math.floor(Math.random() * Math.max(1, cfg.maxDelayMs - cfg.minDelayMs + 1));
      await sleep(d);
    }
  }
  console.log(`    Done ${cfg.username}: ${cfg.totalRequests} reqs (~${ok} ok / ~${fail} errors)`);
}

async function runParallelWorkers(username, workers, eachCount, profile) {
  const token = await login(username);
  const tasks = [];
  for (let w = 0; w < workers; w++) {
    tasks.push(
      (async () => {
        let ok = 0;
        let fail = 0;
        for (let i = 0; i < eachCount; i++) {
          const path = profile.pickPath();
          const method = pick(profile.methods);
          try {
            const status = await requestGateway(token, method, path, {
              userAgent: pick(profile.userAgents),
              body: method !== 'GET' && method !== 'HEAD' ? { demo: true } : undefined,
            });
            if (status >= 200 && status < 400) ok++;
            else fail++;
          } catch {
            fail++;
          }
          if (i < eachCount - 1) {
            await sleep(randInt(profile.minDelayMs, profile.maxDelayMs));
          }
        }
        return { ok, fail };
      })()
    );
  }
  const results = await Promise.all(tasks);
  const sum = results.reduce((a, r) => ({ ok: a.ok + r.ok, fail: a.fail + r.fail }), { ok: 0, fail: 0 });
  const total = workers * eachCount;
  console.log(`    Done ${username}: ${total} reqs (${sum.ok} ok / ${sum.fail} errors) — ${workers} parallel workers`);
}

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  ZTaaS live demo traffic');
  console.log(`  Gateway: ${GATEWAY}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('[1/3] Normal users — low rate, mostly GET, short gaps');
  await runPersonaBurst({
    username: 'frank',
    totalRequests: 22,
    minDelayMs: 15,
    maxDelayMs: 90,
    pickPath: () => pick(PATHS_OK)(),
    methods: ['GET', 'GET', 'GET'],
    userAgents: ['Mozilla/5.0 Demo', 'ZTaaS-normal/1.0'],
  });
  await runPersonaBurst({
    username: 'grace',
    totalRequests: 18,
    minDelayMs: 250,
    maxDelayMs: 800,
    pickPath: () => pick(PATHS_OK)(),
    methods: ['GET', 'GET', 'GET'],
    userAgents: ['Mozilla/5.0 Demo', 'ZTaaS-normal/1.0'],
  });

  console.log(`\n… pausing ${PHASE_PAUSE_MS}ms …\n`);
  await sleep(PHASE_PAUSE_MS);

  console.log('[2/3] Suspects — higher volume, 4xx noise, mixed methods');
  await runPersonaBurst({
    username: 'nathan',
    totalRequests: 48,
    minDelayMs: 5,
    maxDelayMs: 35,
    pickPath: () => pick(PATHS_MIXED)(),
    methods: ['GET', 'GET', 'POST', 'GET'],
    userAgents: ['python-requests/2.31', 'curl/8.0', 'PostmanRuntime/7.36'],
  });
  await runPersonaBurst({
    username: 'olivia',
    totalRequests: 42,
    minDelayMs: 6,
    maxDelayMs: 40,
    pickPath: () => pick(PATHS_MIXED)(),
    methods: ['GET', 'POST', 'GET', 'GET'],
    userAgents: ['python-requests/2.31', 'curl/8.0'],
  });

  console.log(`\n… pausing ${PHASE_PAUSE_MS}ms …\n`);
  await sleep(PHASE_PAUSE_MS);

  console.log('[3/3] Attackers — burst traffic, writes + probing');
  const attackerProfile = {
    pickPath: () => pick(PATHS_MIXED)(),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'GET', 'GET'],
    userAgents: ['masscan/1.0', 'curl/7.64', 'python-urllib3/demo', 'ZmEu/bot'],
    minDelayMs: 0,
    maxDelayMs: 12,
  };
  await runParallelWorkers('ryan', 8, 22, attackerProfile);
  await runParallelWorkers('sara', 8, 20, attackerProfile);

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  Demo traffic finished.');
  console.log('  • Admin Dashboard → telemetry & risk tables');
  console.log('  • Baseline job runs on schedule (or restart gateway for immediate run)');
  console.log('  • ML queue: ensure RabbitMQ + ml-service if you want risk_scores updates');
  console.log('═══════════════════════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error('[DEMO] Fatal:', err.message);
  process.exit(1);
});

