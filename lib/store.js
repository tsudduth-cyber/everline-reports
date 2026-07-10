import { Redis } from "@upstash/redis";

// Uses Upstash Redis when credentials are present (auto-injected on Vercel after
// you add the Upstash Redis integration). Falls back to in-memory for local dev.
let _redis = null;
const mem = { index: [], byId: {}, seeded: false };

function client() {
  if (_redis) return _redis;
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    _redis = new Redis({ url, token });
    return _redis;
  }
  return null; // dev fallback (in-memory, single process)
}

const IDX = "everline:index";
const KEY = (id) => `everline:project:${id}`;
const metaOf = (p) => ({
  id: p.id, name: p.name, location: p.location, reportNo: p.reportNo,
  suiteCount: (p.suites || []).length,
});

export async function listProjects() {
  const r = client();
  if (!r) return mem.index;
  return (await r.get(IDX)) || [];
}

export async function getProject(id) {
  const r = client();
  if (!r) return mem.byId[id] || null;
  return (await r.get(KEY(id))) || null;
}

export async function saveProject(p) {
  const r = client();
  if (!r) {
    mem.byId[p.id] = p;
    mem.index = mem.index.filter((x) => x.id !== p.id).concat(metaOf(p));
    return;
  }
  await r.set(KEY(p.id), p);
  const idx = ((await r.get(IDX)) || []).filter((x) => x.id !== p.id);
  idx.push(metaOf(p));
  await r.set(IDX, idx);
}

export async function deleteProject(id) {
  const r = client();
  if (!r) {
    delete mem.byId[id];
    mem.index = mem.index.filter((x) => x.id !== id);
    return;
  }
  await r.del(KEY(id));
  const idx = ((await r.get(IDX)) || []).filter((x) => x.id !== id);
  await r.set(IDX, idx);
}

// Seed once, race-safe (SET NX). Returns the resulting index.
export async function seedIfEmpty(seedProjects) {
  const r = client();
  if (!r) {
    if (!mem.seeded && mem.index.length === 0) {
      mem.seeded = true;
      for (const p of seedProjects) await saveProject(p);
    }
    return mem.index;
  }
  const won = await r.set("everline:seeded", "1", { nx: true });
  if (won) {
    for (const p of seedProjects) await saveProject(p);
  }
  return (await r.get(IDX)) || [];
}
