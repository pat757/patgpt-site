"use server";
import { BUDGETS, isInquiryKind } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import { isConfigured } from "@/lib/supabase/env";

export type InquiryState = { ok: boolean; message: string } | null;

const str = (v: FormDataEntryValue | null, max: number) => String(v ?? "").trim().slice(0, max);

export async function sendInquiry(_prev: InquiryState, form: FormData): Promise<InquiryState> {
  // Bots fill every field, including this hidden one. Pretend it worked.
  if (str(form.get("website"), 200)) return { ok: true, message: "Inquiry sent. I'll reply within two working days." };

  const typeRaw = str(form.get("type"), 20);
  const type = isInquiryKind(typeRaw) ? typeRaw : "general";
  const name = str(form.get("name"), 80);
  const email = str(form.get("email"), 120);
  const business = type === "general" ? "" : str(form.get("business"), 120);
  const productRaw = str(form.get("product"), 300);
  const budgetRaw = str(form.get("budget"), 40);
  const message = str(form.get("message"), 2000);

  if (!name || !email || !message) return { ok: false, message: "Fill in your name, email and message." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, message: "That email address doesn't look right." };
  if (type === "promotion" && !business) return { ok: false, message: "Add your brand or company name." };
  if (!isConfigured()) return { ok: false, message: "The form isn't connected yet. Email pat@patgpt-ai.com instead." };

  const supabase = await createClient();
  const { error } = await supabase.from("inquiries").insert({
    type,
    name,
    email,
    business: business || null,
    product: type === "promotion" ? productRaw || null : null,
    budget: type === "promotion" ? ((BUDGETS as readonly string[]).includes(budgetRaw) ? budgetRaw : "Not sure yet") : null,
    message,
  });
  if (error) return { ok: false, message: "Couldn't send it. Email pat@patgpt-ai.com instead." };
  return { ok: true, message: "Inquiry sent. I'll reply within two working days." };
}
