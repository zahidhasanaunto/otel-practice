const redis = require('redis');
const redisClient = redis.createClient({
  url: 'redis://localhost:6379',
});

redisClient.on('error', (error) =>
  console.error(`Redis Client Error: ${error}`)
);

redisClient.connect();

module.exports = redisClient;
