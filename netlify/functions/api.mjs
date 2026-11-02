// Horizons 30x30 Tracker - API (Netlify Function + Netlify Blobs storage)
import { getStore } from "@netlify/blobs";

const TZ = "Asia/Dubai";
const START = "2026-10-31";
const END = "2026-11-29";
// Days before the tracker launched count as done for everyone.
const GRACE = ["2026-10-31", "2026-11-01"];
const MAX_PEOPLE = 1000;

export function dubaiToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

export function cleanName(n) {
  return String(n || "").replace(/[\u0000-\u001f<>]/g, "").replace(/\s+/g, " ").trim();
}

export function idOf(name) {
  return name.toLowerCase().normalize("NFKC")
    .replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

const keyOf = (id) => "people/" + encodeURIComponent(id);

async function loadPeople(store) {
  const { blobs } = await store.list({ prefix: "people/" });
  const rows = await Promise.all(blobs.map((b) => store.get(b.key, { type: "json" })));
  return rows.filter(Boolean);
}

export function publicState(people, today) {
  const grace = GRACE.filter((d) => d <= today);
  return {
    today, start: START, end: END, grace,
    people: people.map((p) => {
      const days = new Set(grace);
      (p.days || []).forEach((d) => { if (d >= START && d <= END && d <= today) days.add(d); });
      return { id: p.id, name: p.name, days: [...days].sort() };
    }),
  };
}

export default async (req) => {
  const url = new URL(req.url);
  const route = url.pathname.replace(/^\/api\/?/, "").replace(/\/$/, "");
  const store = getStore({ name: "dfc-30x30", consistency: "strong" });

  try {
    if (req.method === "GET" && route === "state") {
      return json(publicState(await loadPeople(store), dubaiToday()));
    }
    if (req.method !== "POST") return json({ error: "Not found" }, 404);
    const body = await req.json().catch(() => ({}));

    if (route === "register") {
      const name = cleanName(body.name);
      if (name.length < 2 || name.length > 40) return json({ error: "Please enter your full name (2 to 40 characters)." }, 400);
      const id = idOf(name);
      if (!id) return json({ error: "Please use letters in your name." }, 400);
      let person = await store.get(keyOf(id), { type: "json" });
      if (!person) {
        const { blobs } = await store.list({ prefix: "people/" });
        if (blobs.length >= MAX_PEOPLE) return json({ error: "The tracker is full. Please contact HR." }, 400);
        person = { id, name, created: new Date().toISOString(), days: [] };
        await store.setJSON(keyOf(id), person);
      }
      return json({ person: { id: person.id, name: person.name }, state: publicState(await loadPeople(store), dubaiToday()) });
    }

    if (route === "done" || route === "undo") {
      const id = String(body.id || "");
      const person = id ? await store.get(keyOf(id), { type: "json" }) : null;
      if (!person) return json({ error: "We couldn't find that name. Please register again." }, 404);
      const today = dubaiToday(); // the server decides "today", so past days can't be ticked
      if (today < START || today > END) return json({ error: "The challenge runs from 31 October to 29 November." }, 400);
      const days = new Set(person.days || []);
      if (route === "done") days.add(today); else days.delete(today); // undo only ever touches today
      person.days = [...days].sort();
      person.updated = new Date().toISOString();
      await store.setJSON(keyOf(id), person);
      return json(publicState(await loadPeople(store), today));
    }

    return json({ error: "Not found" }, 404);
  } catch (e) {
    console.error(e);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
};

export const config = { path: "/api/*" };
