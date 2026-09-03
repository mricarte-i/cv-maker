import type { CVDocument } from "../schema/cv";
import { parseDocument, type ParseResult } from "../schema/parse";
import { compilePdf } from "../typst/client";

/** `matias-ricarte`, or null before there is a name to slug */
export function slug(doc: CVDocument): string | null {
  const s = doc.name
    .normalize("NFD") // decompose, so the accent strips instead of the letter
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return s || null;
}

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a); // firefox ignores a click on a detached anchor
  a.click();
  a.remove();

  // revoking in the same tick has been known to kill the download mid-flight
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function exportDocument(doc: CVDocument) {
  save(
    new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" }),
    `${slug(doc) ?? "content"}.json`,
  );
}

export async function importDocument(file: File): Promise<ParseResult> {
  let json: unknown;
  try {
    json = JSON.parse(await file.text());
  } catch (e) {
    return { ok: false, error: `not valid JSON: ${String(e)}` };
  }
  return parseDocument(json);
}

export async function downloadPdf(doc: CVDocument): Promise<string | null> {
  const r = await compilePdf(JSON.stringify(doc));
  if (!r.ok) {
    console.warn("pdf compile failed", r.diagnostics);
    return r.error ?? "the document did not compile";
  }

  save(
    new Blob([r.pdf], { type: "application/pdf" }),
    `${slug(doc) ?? "cv"}.pdf`,
  );
  return null;
}
