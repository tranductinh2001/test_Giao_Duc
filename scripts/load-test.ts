type LoadTestConfig = {
  baseUrl: string;
  path: string;
  method: "GET" | "POST";
  requests: number;
  concurrency: number;
  headers: Record<string, string>;
  body?: string;
};

function parseIntEnv(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function runLoadTest(config: LoadTestConfig) {
  const startedAt = Date.now();
  let inFlight = 0;
  let completed = 0;
  let failures = 0;
  let totalLatency = 0;
  let totalStatus = 0;

  return await new Promise<void>((resolve) => {
    const launchNext = () => {
      while (inFlight < config.concurrency && completed + inFlight < config.requests) {
        inFlight++;
        const requestStartedAt = Date.now();

        fetch(`${config.baseUrl}${config.path}`, {
          method: config.method,
          headers: config.headers,
          body: config.body,
        })
          .then(async (response) => {
            totalLatency += Date.now() - requestStartedAt;
            totalStatus += response.status;
            if (!response.ok) failures++;
          })
          .catch(() => {
            failures++;
            totalLatency += Date.now() - requestStartedAt;
          })
          .finally(() => {
            inFlight--;
            completed++;
            if (completed >= config.requests) {
              const durationMs = Date.now() - startedAt;
              const avgLatency = completed ? Math.round(totalLatency / completed) : 0;
              const avgStatus = completed ? (totalStatus / completed).toFixed(2) : "0.00";

              console.log(JSON.stringify({
                baseUrl: config.baseUrl,
                path: config.path,
                requests: config.requests,
                concurrency: config.concurrency,
                completed,
                failures,
                durationMs,
                avgLatencyMs: avgLatency,
                avgStatusCode: avgStatus,
              }, null, 2));
              resolve();
              return;
            }

            launchNext();
          });
      }
    };

    launchNext();
  });
}

async function main() {
  const baseUrl = process.env.BASE_URL || "http://localhost:3000";
  const path = process.env.PATHNAME || "/api/user/stats";
  const method = (process.env.METHOD || "GET").toUpperCase() as "GET" | "POST";
  const requests = parseIntEnv(process.env.REQUESTS, 50);
  const concurrency = parseIntEnv(process.env.CONCURRENCY, 10);
  const headers: Record<string, string> = {};

  if (process.env.AUTH_COOKIE) {
    headers.cookie = process.env.AUTH_COOKIE;
  }
  if (process.env.CONTENT_TYPE) {
    headers["content-type"] = process.env.CONTENT_TYPE;
  }
  if (process.env.BODY) {
    headers["content-type"] ||= "application/json";
  }

  await runLoadTest({
    baseUrl,
    path,
    method,
    requests,
    concurrency,
    headers,
    body: process.env.BODY,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
