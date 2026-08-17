***

# GateKeeper 🔒

A production-grade, highly resilient API built with Node.js, Express, PostgreSQL, Prisma, and Redis. GateKeeper demonstrates how to protect backend services from abuse, duplicate operations, and malicious traffic while maintaining high performance.

## Table of Contents
1. [System Architecture](#1-system-architecture)
2. [Is This an API Gateway? Where Does This Fit in Real Apps?](#2-is-this-an-api-gateway-where-does-this-fit-in-real-apps)
3. [What We Built & Why (The Technical Trade-offs)](#3-what-we-built--why-the-technical-trade-offs)
   * [Why Lua Scripts?](#why-lua-scripts)
   * [Trade-offs & System Design Answers](#trade-offs--system-design-answers)
4. [Real-World Application of Concepts](#4-real-world-application-of-concepts)

---

## 1. System Architecture

GateKeeper uses a Layered Architecture (Routes → Controllers → Services) and a strict Middleware Pipeline. 

**The Request Lifecycle:**
```text
HTTP Request
  ↓
Helmet (Security Headers) & CORS (Origin Validation)
  ↓
Express JSON Parser
  ↓
API Key Auth (Timing-Safe Comparison)
  ↓
Rate Limiter (Redis-backed Token Bucket via Lua)
  ↓
Idempotency Check (Redis-backed Fingerprinting)
  ↓
Zod Validation (Schema enforcement)
  ↓
Controller (HTTP Handling)
  ↓
Service (Business Logic)
  ↓
Prisma ORM (Parameterized SQL generation)
  ↓
PostgreSQL (Data Persistence)
```

---

## 2. Is This an API Gateway? Where Does This Fit in Real Apps?

**Yes, conceptually, we built an API Gateway layer.**

In modern microservices architectures, you don't put rate limiting, API key validation, or CORS logic inside every single microservice. Instead, you put those "cross-cutting concerns" in an **API Gateway** (like Kong, AWS API Gateway, or a custom Node Edge service). 

*   **What we built:** A monolithic API that contains both the Gateway logic (Rate Limiting, Auth, Idempotency) and the Business logic (Messages CRUD). 
*   **How it's used in production:** In a real company, the middlewares we wrote here would be extracted into a standalone Edge/Gateway server. When a request hits the Gateway, it validates the API key, checks the rate limit in Redis, and if everything passes, forwards the request to the downstream microservice. If the rate limit fails, the Gateway rejects it immediately, protecting the downstream services from ever seeing the traffic.

---

## 3. What We Built & Why (The Technical Trade-offs)

### Why Lua Scripts?
When implementing the Token Bucket rate limiter, we had to read the current token count, calculate the refill based on elapsed time, deduct a token, and save it back to Redis. 

If we did this in Node.js (`GET` from Redis, do math in JS, `SET` in Redis), two requests hitting the server at the exact same millisecond would both `GET` the same token count (e.g., 1 token left), both think they were allowed, and both `SET` the count to 0. This is a **race condition** that allows users to bypass limits.

**Why Lua?** Redis executes Lua scripts **atomically**. No other Redis command can run while the Lua script is executing. It guarantees the read-math-write operation is 100% thread-safe.

### Trade-offs & System Design Answers

Here are the answers to the core architectural questions of this project:

**1. Why Token Bucket instead of Fixed Window or Leaky Bucket?**
*   *Answer:* The Token Bucket allows for **bursts**. If a user hasn't made a request in a while, their bucket fills up to capacity (e.g., 10 tokens). They can instantly make 10 requests in one second (a burst), which matches natural human behavior (like clicking a few links quickly). A Leaky Bucket forces a strict, constant rate (1 request per second), making the UI feel sluggish. A Fixed Window allows double the burst traffic at the boundary of the window (10 requests at 0:59 and 10 at 1:00). 

**2. What happens if traffic increases by 10×?**
*   *Answer:* The architecture acts as a shock absorber. Because we use Redis for rate limiting and idempotency, a 10× spike in traffic results in a 10× spike in Redis queries (which are sub-millisecond and handle 100k+ ops/sec easily). However, the actual PostgreSQL database is shielded. The rate limiter rejects the excess traffic with `429 Too Many Requests`, ensuring Postgres doesn't run out of connection pools or crash under the load.

**3. Why is Redis essential in a multi-instance deployment?**
*   *Answer:* In production, you run multiple Node.js servers behind a load balancer. If rate limits or idempotency keys were stored in Node.js memory (RAM), Server A wouldn't know what Server B did. A user could make 10 requests to Server A (exhausting its limit) and then 10 more to Server B. Redis provides a **single source of truth** across all server instances, making the security state global and consistent.

---

## 4. Real-World Application of Concepts

Everything you learned in GateKeeper maps directly to enterprise engineering:

*   **Cursor Pagination:** Used by Twitter, Stripe, and GitHub APIs. Offset pagination (`OFFSET 10000`) requires the database to scan and discard 10,000 rows, becoming slower over time. Cursor pagination (`WHERE id > 10000`) uses indexes to jump instantly to the data, taking constant time regardless of how deep you paginate.
*   **Idempotency Keys:** Heavily used by Payment APIs (like Stripe). If a user has a spotty internet connection and their phone double-clicks "Submit Payment", the API must guarantee they are only charged once. The client sends a UUID; the server locks it in Redis and safely replays the response on retries.
*   **Timing-Safe Comparison:** Used in authentication systems everywhere. Hackers can measure the micro-milliseconds it takes for a server to reject a password or API key. By comparing hashes with `crypto.timingSafeEqual()`, we ensure the comparison takes the exact same amount of time whether the first character is wrong or the last character is wrong, defeating timing-based side-channel attacks.
*   **Helmet & CORS:** Standard baseline security for any public-facing web application. Helmet prevents downgrade attacks and clickjacking, while CORS prevents malicious websites from making unauthorized requests to your API using a user's browser.

***

<!-- ### 🎓 Portfolio Note
*Add this line to your System Design Portfolio README index:* -->
> **GateKeeper** — A production-grade Node.js/Express API implementing Redis-backed Token Bucket rate limiting, Idempotency Keys with body fingerprinting, cursor pagination, and timing-safe API key authentication.




***

## 5. How to Test the System

To prove the resilience and security features of GateKeeper, you can run these exact `curl` commands in your terminal. 

*Note: Ensure the backend is running on `http://localhost:4201` (or update the ports below to match your `PORT` variable).*

### Test 1: The Happy Path (Validation & Database)
Verify that valid data passes Zod validation and is saved to PostgreSQL.
```bash
curl -i -X POST http://localhost:4201/api/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: super-secret-gatekeeper-key-123" \
  -d '{"content": "Hello GateKeeper", "author": "Alice"}'
```
*Expected:* `HTTP/1.1 201 Created` with the new message object in the JSON body.

### Test 2: Idempotency Replay (Redis Duplicate Protection)
Simulate a network double-click by sending the exact same request (with the same `Idempotency-Key` and body) multiple times. 
```bash
curl -i -X POST http://localhost:4201/api/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: super-secret-gatekeeper-key-123" \
  -H "Idempotency-Key: replay-test-001" \
  -d '{"content": "Important data", "author": "Bob"}'
```
*Expected:* Run it 3 times. The first request returns `201 Created` with a new ID. The next two requests return the exact same `201 Created` response and the exact same ID. **The database is only hit once.** (Check your server logs—no Prisma SQL is executed for the 2nd and 3rd requests).

### Test 3: Idempotency Conflict (Fingerprinting)
Attempt to reuse an old `Idempotency-Key` but change the request body.
```bash
curl -i -X POST http://localhost:4201/api/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: super-secret-gatekeeper-key-123" \
  -H "Idempotency-Key: replay-test-001" \
  -d '{"content": "DIFFERENT DATA", "author": "Charlie"}'
```
*Expected:* `HTTP/1.1 409 Conflict` with `IDEMPOTENCY_CONFLICT`. The API refuses to process a different operation under the same key.

### Test 4: Rate Limit Flooding (Token Bucket Depletion)
Hammer the GET endpoint 15 times in a row to deplete the 10-token bucket limit.
```bash
for i in {1..15}; do
  echo "--- Request $i ---"
  curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" \
    -X GET http://localhost:4201/api/messages \
    -H "x-api-key: super-secret-gatekeeper-key-123"
done
```
*Expected:* The first ~10 requests return `HTTP Status: 200`. The remaining requests instantly return `HTTP Status: 429` (Too Many Requests). The database is shielded from the excess traffic.

### Test 5: Unauthorized Access (Missing API Key)
Attempt to access the API without the `x-api-key` header.
```bash
curl -i -X GET http://localhost:4201/api/messages
```
*Expected:* `HTTP/1.1 401 Unauthorized` with `API key is required`.