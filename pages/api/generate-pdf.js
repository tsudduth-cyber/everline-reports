import { buildReportHTML } from "../../lib/report.js";

export const config = {
  api: { bodyParser: { sizeLimit: "30mb" } },
  maxDuration: 60,
};

async function renderViaBrowserless(token, html) {
  const body = JSON.stringify({
    html,
    options: {
      printBackground: true,
      preferCSSPageSize: true, // honor the report's @page size (Letter landscape)
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    },
  });
  const endpoints = [
    `https://production-sfo.browserless.io/pdf?token=${token}`,
    `https://chrome.browserless.io/pdf?token=${token}`,
  ];
  let lastErr = "";
  for (const url of endpoints) {
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      if (r.ok) return Buffer.from(await r.arrayBuffer());
      lastErr = `${r.status} ${(await r.text()).slice(0, 200)}`;
    } catch (e) {
      lastErr = String(e && e.message ? e.message : e);
    }
  }
  throw new Error(`Browserless request failed: ${lastErr}`);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const token = process.env.BROWSERLESS_TOKEN;
  if (!token) {
    res.status(500).json({ error: "BROWSERLESS_TOKEN is not set in Vercel environment variables." });
    return;
  }
  try {
    const project = req.body;
    const html = buildReportHTML(project);
    const pdf = await renderViaBrowserless(token, html);
    const fileName = (project.fileName || "LRES-Report").replace(/[^\w\-]+/g, "-");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}.pdf"`);
    res.status(200).send(pdf);
  } catch (err) {
    console.error("PDF generation failed:", err);
    res.status(500).json({ error: String(err && err.message ? err.message : err) });
  }
}
