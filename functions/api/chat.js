// This file runs on Cloudflare's server, never in the browser.
// It's the "hidden drawer" that holds your real API key.
// The key itself lives in Cloudflare's dashboard as a secret, not in this file.

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { contents, systemInstruction } = body;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents, systemInstruction }),
      }
    );

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: { message: err.message } }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
