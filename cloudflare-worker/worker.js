// -------------------------------------------------------
// CONFIGURATION — set these as Environment Variables
// in your Cloudflare Worker dashboard (not hardcoded here)
//
//   NOTION_TOKEN    — your Notion integration secret
//   NOTION_DB_ID    — your Notion database ID
//
// Your Notion database needs these properties:
//   Name       — Title (built-in)
//   Note       — Text
//   Submitted  — Text  (stores the date/time string)
// -------------------------------------------------------

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });
    }

    let name, text, timestamp;
    try {
      const body = await request.json();
      name      = body.name?.trim();
      text      = body.text?.trim();
      timestamp = body.timestamp?.trim();
      if (!name || !text) throw new Error("Missing fields");
    } catch {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const notionRes = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.NOTION_TOKEN}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        parent: { database_id: env.NOTION_DB_ID },
        properties: {
          Name: {
            title: [{ text: { content: name } }],
          },
          Note: {
            rich_text: [{ text: { content: text } }],
          },
          Submitted: {
            rich_text: [{ text: { content: timestamp || "" } }],
          },
        },
      }),
    });

    if (!notionRes.ok) {
      const err = await notionRes.text();
      return new Response(JSON.stringify({ error: err }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  },
};
