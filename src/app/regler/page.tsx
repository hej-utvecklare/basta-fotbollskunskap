import { readFile } from "fs/promises";
import path from "path";
import { marked } from "marked";

export const dynamic = "force-dynamic";

export default async function ReglerPage() {
  const md = await readFile(
    path.join(process.cwd(), "regler-basta-fotbollskunskap-2026-27.md"),
    "utf8"
  );
  const html = await marked.parse(md);

  return (
    <article
      className="prose-custom rounded-xl border border-slate-200 bg-white p-5"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
