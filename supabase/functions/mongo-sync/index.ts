// Mirror user actions to MongoDB Atlas via Data API-less direct driver
// Lightweight: uses native MongoDB driver via npm specifier
import { MongoClient } from "npm:mongodb@6.10.0";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

let cachedClient: MongoClient | null = null;
async function getMongo() {
  if (cachedClient) return cachedClient;
  const uri = Deno.env.get("MONGODB_URI");
  if (!uri) throw new Error("MONGODB_URI is not configured");
  cachedClient = new MongoClient(uri);
  await cachedClient.connect();
  return cachedClient;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);

    const userId = claims.claims.sub;
    const email = claims.claims.email;
    const body = await req.json().catch(() => ({}));
    const { event, payload } = body as { event: string; payload?: Record<string, unknown> };

    if (!event) return json({ error: "event is required" }, 400);

    const client = await getMongo();
    const db = client.db("betnaro");
    const doc = {
      user_id: userId,
      email,
      event,
      payload: payload ?? {},
      created_at: new Date(),
    };
    await db.collection("user_events").insertOne(doc);

    // Upsert user identity record
    await db.collection("users").updateOne(
      { user_id: userId },
      {
        $set: { user_id: userId, email, updated_at: new Date() },
        $setOnInsert: { created_at: new Date() },
      },
      { upsert: true },
    );

    return json({ ok: true });
  } catch (err) {
    console.error("mongo-sync error", err);
    return json({ error: (err as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
