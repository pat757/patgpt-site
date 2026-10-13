import type { Metadata } from "next";
import { ContactForm } from "@/components/ContactForm";
import { isInquiryKind } from "@/lib/site";

export const metadata: Metadata = {
  title: "Work with me",
  description: "Promotion and partnerships, AI consulting, or a general question. Get in touch with Pat from PatGPT.",
  alternates: { canonical: "/work-with-me" },
};

export default async function WorkWithMePage({ searchParams }: { searchParams: Promise<{ type?: string | string[] }> }) {
  const { type } = await searchParams;
  const t = Array.isArray(type) ? type[0] : type;
  const initialKind = isInquiryKind(t) ? t : "promotion";
  return (
    <section className="view" aria-labelledby="contact-h">
      <div className="wrap" style={{ maxWidth: 880 }}>
        {/* key resets the form when someone follows a link to a different type */}
        <ContactForm key={initialKind} initialKind={initialKind} />
      </div>
    </section>
  );
}
