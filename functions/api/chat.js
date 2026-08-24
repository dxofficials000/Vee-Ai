// This file runs on Cloudflare's server, never in the browser.
// It's the "hidden drawer" that holds your real API keys.
// Keys live in Cloudflare's dashboard as secrets, never in this file.
//
// You can add MULTIPLE keys here as GEMINI_API_KEY_1, GEMINI_API_KEY_2, etc.
// If one key hits its rate limit, Vee automatically tries the next one —
// no manual swapping needed. Just add more numbered keys in Cloudflare
// whenever you make new ones.

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { contents, systemInstruction } = body;

    // Collect every key that exists: GEMINI_API_KEY_1, GEMINI_API_KEY_2, ... up to 10
    // Also supports a single GEMINI_API_KEY for backward compatibility.
    const keys = [];
    if (env.GEMINI_API_KEY) keys.push(env.GEMINI_API_KEY);
    for (let i = 1; i <= 10; i++) {
      const k = env[`GEMINI_API_KEY_${i}`];
      if (k) keys.push(k);
    }

    if (keys.length === 0) {
      return new Response(
        JSON.stringify({ error: { message: "No API key configured." } }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    let lastError = null;

    for (const key of keys) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            systemInstruction,
            generationConfig: { maxOutputTokens: 700 },
          }),
        }
      );

      const data = await response.json();

      // If this key hit its rate limit, try the next one instead of giving up
      const isRateLimited = data.error?.code === 429 || data.error?.status === "RESOURCE_EXHAUSTED";
      if (isRateLimited) {
        lastError = data.error;
        continue;
      }

      // Success (or a non-rate-limit error) — return it as-is
      return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Every key was rate-limited
    return new Response(JSON.stringify({ error: lastError }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: { message: err.message } }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

