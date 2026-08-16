-- src/scripts/tokenBucket.lua
-- KEYS[1] = The Redis key (e.g., rate_limit:127.0.0.1)
-- ARGV[1] = Capacity (Max tokens)
-- ARGV[2] = Refill Rate (Tokens per second)
-- ARGV[3] = Now (Current timestamp in milliseconds)
-- ARGV[4] = Cost (Tokens required for this request, usually 1)

local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local cost = tonumber(ARGV[4])

-- Get current bucket state
local bucket = redis.call("HMGET", key, "tokens", "timestamp")
local tokens = tonumber(bucket[1])
local last_time = tonumber(bucket[2])

-- If bucket doesn't exist yet, initialize it full
if tokens == nil then
    tokens = capacity
    last_time = now
end

-- Calculate how many tokens to add based on time elapsed
local delta = math.max(0, now - last_time)
local refilled_tokens = delta * (refill_rate / 1000.0) -- refill_rate is per second, delta is in ms
tokens = math.min(capacity, tokens + refilled_tokens)

local allowed = 0
if tokens >= cost then
    tokens = tokens - cost
    allowed = 1
end

-- Save the new state back to Redis
redis.call("HMSET", key, "tokens", tokens, "timestamp", now)
-- Set an expiration so we don't store inactive users forever (capacity / rate * 2 seconds)
redis.call("EXPIRE", key, math.ceil(capacity / refill_rate) * 2)

-- Return: allowed (1/0), remaining tokens
return {allowed, math.floor(tokens)}