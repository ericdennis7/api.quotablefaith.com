// src/index.js
// Author: Eric Dennis
// Created: August 4, 2025
// api.quotablefaith.com

export default {
  async fetch(request, env, ctx) {
    const { pathname, searchParams } = new URL(request.url);
    const method = request.method;
    const db = env.DB;

    // --- ROUTES ---

    // GET /
    if (method === "GET" && pathname === "/") {
      return Response.json({
        message: "Welcome to the Bible API. See /docs for available endpoints.",
      });
    }

    // GET /quotes/random
    if (method === "GET" && pathname === "/v1/quotes/random") {
      const quote = await db
        .prepare("SELECT author, quote, likes, topics FROM quotes ORDER BY RANDOM() LIMIT 1")
        .first();

      if (!quote) {
        return new Response(
          JSON.stringify({ detail: "No quotes available." }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      return Response.json(quote);
    }
    
    // GET /quotes?q=hope&limit=10
    if (method === "GET" && pathname === "/v1/quotes") {
      const q = searchParams.get("q");
      let limitParam = parseInt(searchParams.get("limit"), 10);
      if (isNaN(limitParam)) limitParam = 1;
      const limit = Math.min(Math.max(limitParam, 1), 50);

      if (!q || q.trim().length < 1) {
        return new Response(
          JSON.stringify({ detail: "Missing or invalid query param: q" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const stmt = await db
        .prepare(`
          SELECT author, quote, likes, topics
          FROM quotes
          WHERE LOWER(topics) LIKE ?
          ORDER BY RANDOM()
          LIMIT ?
        `)
        .bind(`%${q.toLowerCase()}%`, limit)
        .all();

      if (stmt.results.length === 0) {
        return new Response(
          JSON.stringify({ detail: "No quotes found for that topic." }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      return Response.json(stmt.results);
    }

    // --- 404 fallback ---
    return new Response(
      JSON.stringify({ detail: "Not Found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  },
};