"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { INQUIRY_KINDS, INQUIRY_ORDER, type InquiryKind } from "@/lib/site";
import { fmtDate, safeUrl } from "@/lib/format";
import { getBrowserClient } from "@/lib/supabase/client";
import type { Inquiry } from "@/lib/types";
import { ConfirmButton } from "./ConfirmButton";

export function InboxTable({ items }: { items: Inquiry[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | InquiryKind>("all");
  const counts: Record<string, number> = { all: items.length, promotion: 0, consulting: 0, general: 0 };
  items.forEach((x) => (counts[x.type] = (counts[x.type] || 0) + 1));
  const rows = items.filter((x) => filter === "all" || x.type === filter);

  return (
    <div className="inbox">
      <h2>Your inquiries</h2>
      <p className="muted" style={{ fontSize: ".93rem", marginTop: 4 }}>
        Only you can see this. Reply straight from your email.
      </p>
      <div className="inbox-chips" role="group" aria-label="Filter inquiries">
        {(["all", ...INQUIRY_ORDER] as const).map((k) => (
          <button key={k} className="chip" type="button" aria-pressed={filter === k} onClick={() => setFilter(k)}>
            {k === "all" ? "All" : INQUIRY_KINDS[k].short} ({counts[k] || 0})
          </button>
        ))}
      </div>
      <div className="scroll">
        <table>
          <thead>
            <tr>
              <th>Received</th>
              <th>Type</th>
              <th>From</th>
              <th>Details</th>
              <th>Message</th>
              <th>
                <span className="sr">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {!rows.length ? (
              <tr>
                <td colSpan={6}>{items.length ? "Nothing here yet." : "No inquiries yet."}</td>
              </tr>
            ) : (
              rows.map((x) => {
                const product = x.product || "";
                return (
                  <tr key={x.id}>
                    <td>{fmtDate(x.created_at)}</td>
                    <td>
                      <span className={`tag ${x.type}`}>{INQUIRY_KINDS[x.type]?.short ?? "General"}</span>
                    </td>
                    <td>
                      {x.name}
                      <small>
                        <a href={`mailto:${x.email}`}>{x.email}</a>
                      </small>
                    </td>
                    <td>
                      {x.business}
                      {product && (
                        <small>
                          {safeUrl(product) ? (
                            <a href={product} target="_blank" rel="noopener noreferrer">
                              {product}
                            </a>
                          ) : (
                            product
                          )}
                        </small>
                      )}
                      {x.budget && <small>Budget: {x.budget}</small>}
                    </td>
                    <td style={{ whiteSpace: "pre-wrap" }}>{x.message}</td>
                    <td>
                      <ConfirmButton
                        label="Delete"
                        question="Delete?"
                        confirmLabel="Delete"
                        busyLabel="Deleting…"
                        onConfirm={async () => {
                          const { error, count } = await getBrowserClient()
                            .from("inquiries")
                            .delete({ count: "exact" })
                            .eq("id", x.id);
                          if (error || count === 0) throw new Error("Couldn't delete it.");
                          router.refresh();
                        }}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
