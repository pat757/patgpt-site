import type { InquiryKind } from "./site";

export type StoredFile = {
  path: string; // path inside the storage bucket
  name: string; // original file name shown to readers
  type: string; // MIME type
  size: number; // bytes
};

export type Breakdown = {
  id: string;
  slug: string;
  title: string;
  category: string;
  tags: string[];
  description: string | null;
  body: string | null;
  link: string | null;
  files: StoredFile[];
  created_at: string;
};

export type Inquiry = {
  id: string;
  type: InquiryKind;
  name: string;
  email: string;
  business: string | null;
  product: string | null;
  budget: string | null;
  message: string;
  created_at: string;
};
