import { z } from "zod";
import { id } from "zod/v4/locales";

export const SCHEMA_VERSION = 1;

export const BlockSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("paragraph"), id: id(), text: z.string() }),
  z.object({
    kind: z.literal("bullets"),
    id: id(),
    items: z.array(z.string()),
  }),
]);

export const EntryVariantSchema = z.enum(["job", "project", "education"]);

export const ItemSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("entry"),
    id: id(),
    variant: EntryVariantSchema,
    title: z.string(), // position/project name/institution
    subtitle: z.string(), // company/ (n/a) / major
    date: z.string(), // TODO: validate date format
    location: z.string(), // city, country
    body: z.array(BlockSchema),
  }),
  z.object({
    kind: z.literal("oneline"),
    id: id(),
    title: z.string(),
    content: z.string(),
  }),
  z.object({
    kind: z.literal("prose"),
    id: id(),
    body: z.array(BlockSchema),
  }),
]);

export const ContactSchema = z.object({
  id: id(),
  text: z.string(),
  link: z.string(),
});

export const SectionSchema = z.object({
  id: id(),
  label: z.string(),
  items: z.array(ItemSchema),
});

export const CVDocumentSchema = z.object({
  schemaVersion: z.number().int().positive(),
  name: z.string(),
  address: z.string(),
  date: z.string(), // TODO: validate date format, ISO, "last updated"
  contacts: z.array(ContactSchema),
  sections: z.array(SectionSchema),
});

export type Block = z.infer<typeof BlockSchema>;
export type EntryVariant = z.infer<typeof EntryVariantSchema>;
export type Item = z.infer<typeof ItemSchema>;
export type Contact = z.infer<typeof ContactSchema>;
export type Section = z.infer<typeof SectionSchema>;
export type CVDocument = z.infer<typeof CVDocumentSchema>;
