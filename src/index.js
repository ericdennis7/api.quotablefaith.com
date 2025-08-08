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

// Fuzzy matching helper functions
function levenshteinDistance(str1, str2) {
  const matrix = [];
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[str2.length][str1.length];
}

function isFuzzyMatch(query, target, maxDistance = 2) {
  const distance = levenshteinDistance(query.toLowerCase(), target.toLowerCase());
  // Allow more distance for longer strings
  const adjustedMaxDistance = target.length > 8 ? maxDistance + 1 : maxDistance;
  return distance <= adjustedMaxDistance;
}

async function searchQuotesWithFuzzy(db, qRaw, limit) {
  // Step 1: Normalize the query
  const q = qRaw.toLowerCase().replace(/[.\s]/g, "");

  // Step 2: Try exact matching first
  const exactStmt = await db
    .prepare(`
      SELECT author, quote, topics
      FROM quotes
      WHERE
        REPLACE(REPLACE(LOWER(author), '.', ''), ' ', '') LIKE ?
        OR
        REPLACE(REPLACE(LOWER(topics), '.', ''), ' ', '') LIKE ?
      ORDER BY RANDOM()
      LIMIT ?
    `)
    .bind(`%${q}%`, `%${q}%`, limit)
    .all();

  if (exactStmt.results.length > 0) {
    return exactStmt.results;
  }

  // Step 3: If no exact matches and query is substantial, try fuzzy matching
  if (q.length >= 4) {
    // Get all quotes for fuzzy matching (you might want to add a reasonable limit here)
    const allQuotes = await db
      .prepare("SELECT author, quote, topics FROM quotes LIMIT 1000")
      .all();

    const fuzzyMatches = allQuotes.results.filter(quote => {
      const normalizedAuthor = quote.author.toLowerCase().replace(/[.\s]/g, "");
      const normalizedTopics = quote.topics.toLowerCase().replace(/[.\s]/g, "");
      
      // Check if query fuzzy matches the author
      if (isFuzzyMatch(q, normalizedAuthor)) {
        return true;
      }
      
      // Check if query fuzzy matches any topic
      const topics = normalizedTopics.split(',').map(topic => topic.trim());
      return topics.some(topic => isFuzzyMatch(q, topic));
    });

    // Randomize and limit the fuzzy matches
    const shuffled = fuzzyMatches.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, limit);
  }

  return [];
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

      const qRaw = searchParams.get("q");
      if (!qRaw || qRaw.trim().length < 1) {
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

      let limitParam = parseInt(searchParams.get("limit"), 10);
      if (isNaN(limitParam)) limitParam = 1;
      const limit = Math.min(Math.max(limitParam, 1), 50);

      // Use the enhanced search function with fuzzy matching
      const results = await searchQuotesWithFuzzy(db, qRaw, limit);

      if (results.length === 0) {
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

      const response = Response.json(results);
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