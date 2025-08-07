// src/index.js
// Author: Eric Dennis
// Created: August 4, 2025
// api.quotablefaith.com

function withCors(response) {
  const newHeaders = new Headers(response.headers);
  newHeaders.set("Access-Control-Allow-Origin", "*"); // Or specify your allowed origin
  newHeaders.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  newHeaders.set("Access-Control-Allow-Headers", "Content-Type, x-api-key");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

export default {
  async fetch(request, env, ctx) {
    const { pathname, searchParams } = new URL(request.url);
    const method = request.method;
    const db = env.DB;

    // --- CORS preflight handler ---
    if (method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*", // Or your allowed origin
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, x-api-key",
        }
      });
    }

    // --- ROUTES ---

    // GET /
    if (method === "GET" && pathname === "/") {
      return withCors(Response.json({
        message: "Welcome to the Bible API. See /docs for available endpoints.",
      }));
    }

    // GET /quotes/random
    if (method === "GET" && pathname === "/v1/quotes/random") {
      // Extract API key and look up user_id from tokens table
      const apiKey = request.headers.get("x-api-key") || null;
      let user_id = null;
      if (apiKey) {
        const tokenRow = await db
          .prepare("SELECT user_id FROM tokens WHERE token = ? LIMIT 1")
          .bind(apiKey)
          .first();
        if (tokenRow) user_id = tokenRow.user_id;
      }

      const quote = await db
        .prepare("SELECT author, quote, topics FROM quotes ORDER BY RANDOM() LIMIT 1")
        .first();

      if (!quote) {
        return withCors(new Response(
          JSON.stringify({ detail: "No quotes available." }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        ));
      }

      // Deliver response first
      const response = Response.json(quote);

      // Log the request asynchronously
      ctx.waitUntil(
        db.prepare(`
          INSERT INTO usage_logs (user_id, endpoint, method, status)
          VALUES (?, ?, ?, ?)
        `)
        .bind(user_id, "/v1/quotes/random", "GET", 200)
        .run()
      );

      return withCors(response);
    }
    
    // GET /quotes?q=hope&limit=10
    if (method === "GET" && pathname === "/v1/quotes") {
      // Extract API key and look up user_id from tokens table
      const apiKey = request.headers.get("x-api-key") || null;
      let user_id = null;
      if (apiKey) {
        const tokenRow = await db
          .prepare("SELECT user_id FROM tokens WHERE token = ? LIMIT 1")
          .bind(apiKey)
          .first();
        if (tokenRow) user_id = tokenRow.user_id;
      }

      const q = searchParams.get("q");
      let limitParam = parseInt(searchParams.get("limit"), 10);
      if (isNaN(limitParam)) limitParam = 1;
      const limit = Math.min(Math.max(limitParam, 1), 50);

      if (!q || q.trim().length < 1) {
        const response = new Response(
          JSON.stringify({ detail: "Missing or invalid query param: q" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
        ctx.waitUntil(
          db.prepare(`
            INSERT INTO usage_logs (user_id, endpoint, method, status)
            VALUES (?, ?, ?, ?)
          `)
          .bind(user_id, "/v1/quotes", "GET", 400)
          .run()
        );
        return withCors(response);
      }

      const stmt = await db
        .prepare(`
          SELECT author, quote, topics
          FROM quotes
          WHERE LOWER(topics) LIKE ?
          ORDER BY RANDOM()
          LIMIT ?
        `)
        .bind(`%${q.toLowerCase()}%`, limit)
        .all();

      if (stmt.results.length === 0) {
        const response = new Response(
          JSON.stringify({ detail: "No quotes found for that topic." }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
        ctx.waitUntil(
          db.prepare(`
            INSERT INTO usage_logs (user_id, endpoint, method, status)
            VALUES (?, ?, ?, ?)
          `)
          .bind(user_id, "/v1/quotes", "GET", 404)
          .run()
        );
        return withCors(response);
      }

      const response = Response.json(stmt.results);
      ctx.waitUntil(
        db.prepare(`
          INSERT INTO usage_logs (user_id, endpoint, method, status)
          VALUES (?, ?, ?, ?)
        `)
        .bind(user_id, "/v1/quotes", "GET", 200)
        .run()
      );
      return withCors(response);
    }

    // --- 404 fallback ---
    return withCors(new Response(
      JSON.stringify({ detail: "Not Found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    ));
  },
};