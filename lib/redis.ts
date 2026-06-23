import Redis from "ioredis";

declare global {
  // eslint-disable-next-line no-var
  var _redisClient: Redis | null;
}

function createRedisClient(): Redis {
  const client = new Redis(process.env.REDIS_URL!, {
    maxRetriesPerRequest: 3,
    connectTimeout: 5000,
  });

  client.on("error", (err: Error) => {
    console.error("[Redis] Connection error:", err.message);
  });

  return client;
}

export function getRedis(): Redis {
  if (!global._redisClient) {
    global._redisClient = createRedisClient();
  }
  return global._redisClient;
}
