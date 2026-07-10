import { listProjects, getProject, saveProject, deleteProject, seedIfEmpty } from "../../lib/store.js";
import { seedProjects } from "../../lib/seed.js";

export const config = { api: { bodyParser: { sizeLimit: "8mb" } } };

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      if (req.query.id) {
        return res.status(200).json(await getProject(req.query.id));
      }
      let list = await listProjects();
      if (!list || list.length === 0) list = await seedIfEmpty(seedProjects());
      return res.status(200).json(list);
    }
    if (req.method === "PUT") {
      await saveProject(req.body);
      return res.status(200).json({ ok: true });
    }
    if (req.method === "DELETE") {
      await deleteProject(req.query.id);
      return res.status(200).json({ ok: true });
    }
    res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("projects API error:", err);
    res.status(500).json({ error: String(err && err.message ? err.message : err) });
  }
}
