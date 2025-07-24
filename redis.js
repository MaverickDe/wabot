const { createClient } = require("redis");
const { config } = require("./config");
const redis = createClient({
//   url: process.env.REDIS_URL,
//  ,
  url: config.REDIS_URL,
});

redis.on('error', (err) => console.error('Redis Error:', err));


module.exports ={redis}