import { z } from 'zod';

/**
 * Domain types for Capsule.
 *
 * Design: items are embedded in capsules (denormalized) for transactional updates
 * and simple round-tripping. Search index is built separately.
 */

export const ITEM_TYPES = ['text', 'code', 'url', 'image', 'file', 'voice'] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

// ---- Items ----

const BaseItem = z.object({
  id: z.string().min(1),
  order: z.number().int(),
  label: z.string().max(200).default(''),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
});

export const TextItemSchema = BaseItem.extend({
  type: z.literal('text'),
  text: z.string(),
});

export const CodeItemSchema = BaseItem.extend({
  type: z.literal('code'),
  text: z.string(),
  language: z.string().max(40).default('plaintext'),
});

export const UrlItemSchema = BaseItem.extend({
  type: z.literal('url'),
  href: z.string().url(),
  title: z.string().max(400).default(''),
  note: z.string().max(2000).default(''),
});

export const ImageItemSchema = BaseItem.extend({
  type: z.literal('image'),
  blobId: z.string().min(1),
  mime: z.string().max(100),
  width: z.number().int().nonnegative().optional(),
  height: z.number().int().nonnegative().optional(),
  /** Small images are also kept inline as dataUrl for fast preview; bounded. */
  thumbDataUrl: z.string().max(64 * 1024).optional(),
  note: z.string().max(2000).default(''),
});

export const FileItemSchema = BaseItem.extend({
  type: z.literal('file'),
  blobId: z.string().min(1),
  name: z.string().max(255),
  mime: z.string().max(100),
  size: z.number().int().nonnegative(),
  note: z.string().max(2000).default(''),
});

export const VoiceItemSchema = BaseItem.extend({
  type: z.literal('voice'),
  text: z.string(),
  mode: z.enum(['raw', 'clean', 'formatted']),
  /** raw transcript kept for re-cleaning if user toggles mode later */
  rawText: z.string(),
  durationMs: z.number().int().nonnegative(),
});

export const ItemSchema = z.discriminatedUnion('type', [
  TextItemSchema,
  CodeItemSchema,
  UrlItemSchema,
  ImageItemSchema,
  FileItemSchema,
  VoiceItemSchema,
]);

export type TextItem = z.infer<typeof TextItemSchema>;
export type CodeItem = z.infer<typeof CodeItemSchema>;
export type UrlItem = z.infer<typeof UrlItemSchema>;
export type ImageItem = z.infer<typeof ImageItemSchema>;
export type FileItem = z.infer<typeof FileItemSchema>;
export type VoiceItem = z.infer<typeof VoiceItemSchema>;
export type Item = z.infer<typeof ItemSchema>;

// ---- Capsules ----

export const CapsuleSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).default(''),
  tags: z.array(z.string().min(1).max(40)).max(30).default([]),
  pinned: z.boolean().default(false),
  items: z.array(ItemSchema).max(2000),
  /** Monotonic seq used for optimistic concurrency across tabs. */
  seq: z.number().int().nonnegative().default(0),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
  /** Last time this capsule was part of a deploy — for "recent" sort. */
  lastUsedAt: z.number().int().nonnegative().default(0),
  /** Free-form vars defined at the capsule scope, e.g. { project: "…" } */
  vars: z.record(z.string().max(4000)).default({}),
});

export type Capsule = z.infer<typeof CapsuleSchema>;

// ---- Library-level settings ----

export const GlobalVarsSchema = z.record(z.string().max(4000));
export type GlobalVars = z.infer<typeof GlobalVarsSchema>;

// ---- Constants ----

export const LIMITS = {
  MAX_CAPSULES: 5000,
  MAX_ITEMS_PER_CAPSULE: 2000,
  MAX_INLINE_TEXT_BYTES: 256 * 1024,
  SHARE_URL_BUDGET_CHARS: 1800,
  THUMB_MAX_EDGE: 256,
  THUMB_MAX_DATA_URL: 64 * 1024,
} as const;
