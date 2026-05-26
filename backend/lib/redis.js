import Redis from "ioredis";

const url = process.env.UPSTASH_REDIS_URL || process.env.REDIS_URL;

console.log("[redis] using url:", url);


let redis = null;

if (!url) {
	console.warn("[redis] No UPSTASH_REDIS_URL/REDIS_URL found — running without Redis.");
} else {
	// If it's rediss:// it needs TLS
	const isTls = url.startsWith("rediss://");

	redis = new Redis(url, {
		maxRetriesPerRequest: null,
		enableReadyCheck: false,
		retryStrategy(times) {
			return Math.min(times * 200, 2000);
		},
		...(isTls ? { tls: {} } : {}),
	});

	redis.on("connect", () => console.log("[redis] connected"));
	redis.on("error", (err) => console.warn("[redis] error:", err.message));
}

export default redis;
export { redis };
