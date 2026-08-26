import type { CVDocument } from "../schema/cv";
import { parseDocument, type ParseResult } from "../schema/parse";

/** `matias-ricarte.json`, or `content.json` before there is a name to slug */
function filename(doc: CVDocument): string {
  const slug = doc.name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug ? `${slug}.json` : "content.json";
}

export function exportDocument(doc: CVDocument) {
  const blob = new Blob([JSON.stringify(doc, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename(doc);
  document.body.append(a); // firefox ignores a click on a detached anchor
  a.click();
  a.remove();

  // revoking in the same tick has been known to kill the download mid-flight
  setTimeout(() => URL.revokeObjectURL(url), 0);
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
