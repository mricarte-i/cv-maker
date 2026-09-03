import { expect, test, vi } from "vitest";
import { emptyDocument } from "../schema/factory";
import { importDocument, slug } from "./transfer";

// transfer pulls in the typst client, which builds a Worker at module scope
vi.mock("../typst/client", () => ({ compilePdf: () => undefined }));

const named = (name: string) => ({ ...emptyDocument(), name });

test("an accented name keeps its letters", () => {
  expect(slug(named("Matías Ricarte"))).toBe("matias-ricarte");
  expect(slug(named("José A. Ñuñez"))).toBe("jose-a-nunez");
});

test("a name with nothing sluggable falls back to null", () => {
  expect(slug(named("!!!"))).toBeNull();
  expect(slug(named("   "))).toBeNull();
});

test("a document the app wrote imports back", async () => {
  const r = await importDocument(
    new File([JSON.stringify(named("Matias"))], "cv.json"),
  );

  if (!r.ok) {
    throw new Error(r.error);
  }

  expect(r.doc.name).toBe("Matias");
});

test("a file that is not JSON reports instead of throwing", async () => {
  const r = await importDocument(new File(["not json"], "cv.json"));

  expect(r.ok).toBe(false);
});
