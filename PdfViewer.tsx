"use client";
import { useEffect, useRef, useState } from "react";
import { fmtSize } from "@/lib/format";
import { downloadFileUrl, publicFileUrl } from "@/lib/storage";
import type { StoredFile } from "@/lib/types";

// PDF.js renders the pages onto canvases, so the preview works on every browser and phone.
const PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";

type PdfLib = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (src: { data: Uint8Array }) => { promise: Promise<PdfDoc> };
};
type PdfDoc = { numPages: number; getPage: (n: number) => Promise<PdfPage>; destroy: () => void };
type PdfPage = {
  getViewport: (o: { scale: number }) => { width: number; height: number };
  render: (o: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void> };
};
declare global {
  interface Window {
    pdfjsLib?: PdfLib;
  }
}

let pdfjsPromise: Promise<PdfLib> | null = null;
function loadPdfjs(): Promise<PdfLib> {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if (!pdfjsPromise)
    pdfjsPromise = new Promise((resolve, reject) => {
      const sc = document.createElement("script");
      sc.src = PDFJS + "pdf.min.js";
      sc.onload = () => {
        if (!window.pdfjsLib) return reject(new Error("pdf.js missing"));
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + "pdf.worker.min.js";
        resolve(window.pdfjsLib);
      };
      sc.onerror = () => {
        pdfjsPromise = null;
        reject(new Error("pdf.js failed to load"));
      };
      document.head.appendChild(sc);
    });
  return pdfjsPromise;
}

export function PdfViewer({ file, ownerSlot }: { file: StoredFile; ownerSlot?: React.ReactNode }) {
  const pagesRef = useRef<HTMLDivElement>(null); // hand-built page canvases live here
  const scrollRef = useRef<HTMLDivElement>(null); // the scrolling box around them
  const [meta, setMeta] = useState(fmtSize(file.size));
  const [status, setStatus] = useState<"loading" | "ready" | "failed" | "gone">("loading");

  useEffect(() => {
    let cancelled = false;
    let doc: PdfDoc | null = null;
    let io: IntersectionObserver | null = null;
    const host = pagesRef.current;
    const scroller = scrollRef.current;
    if (!host || !scroller) return;

    (async () => {
      try {
        const lib = await loadPdfjs();
        const resp = await fetch(publicFileUrl(file.path));
        if (!resp.ok) throw new Error(resp.status === 404 || resp.status === 400 ? "gone" : "fetch");
        const data = new Uint8Array(await resp.arrayBuffer());
        const sizeTxt = fmtSize(data.byteLength);
        doc = await lib.getDocument({ data }).promise;
        if (cancelled) return doc.destroy();
        setMeta(`${doc.numPages} ${doc.numPages === 1 ? "page" : "pages"}${sizeTxt ? " · " + sizeTxt : ""}`);
        const first = await doc.getPage(1);
        const vp1 = first.getViewport({ scale: 1 });
        host.replaceChildren();
        const slots: HTMLDivElement[] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          const d = document.createElement("div");
          d.className = "pdfv-page";
          d.dataset.page = String(i);
          d.style.aspectRatio = `${vp1.width} / ${vp1.height}`;
          d.setAttribute("aria-label", `Page ${i}`);
          host.appendChild(d);
          slots.push(d);
        }
        setStatus("ready");
        const draw = async (slot: HTMLDivElement) => {
          if (!doc || slot.dataset.done) return;
          slot.dataset.done = "1";
          const page = await doc.getPage(Number(slot.dataset.page));
          const base = page.getViewport({ scale: 1 });
          const cssW = slot.clientWidth || 600;
          const scale = (cssW / base.width) * Math.min(2, window.devicePixelRatio || 1);
          const vp = page.getViewport({ scale });
          const c = document.createElement("canvas");
          c.width = Math.floor(vp.width);
          c.height = Math.floor(vp.height);
          slot.style.aspectRatio = `${base.width} / ${base.height}`;
          slot.appendChild(c);
          const ctx = c.getContext("2d");
          if (ctx) await page.render({ canvasContext: ctx, viewport: vp }).promise;
        };
        io = new IntersectionObserver(
          (entries) =>
            entries.forEach((en) => {
              if (en.isIntersecting) {
                io?.unobserve(en.target);
                draw(en.target as HTMLDivElement).catch(() => {});
              }
            }),
          { root: scroller, rootMargin: "600px 0px" },
        );
        slots.forEach((s) => io?.observe(s));
      } catch (e) {
        if (!cancelled) setStatus(e instanceof Error && e.message === "gone" ? "gone" : "failed");
      }
    })();

    return () => {
      cancelled = true;
      io?.disconnect();
      doc?.destroy();
    };
  }, [file.path]);

  return (
    <section className="pdfv">
      <div className="pdfv-h">
        <div className="pdfv-name">
          <span className="pdfv-ic" aria-hidden="true">
            PDF
          </span>
          <div>
            <b>{file.name}</b>
            <small>{meta}</small>
          </div>
        </div>
        <div className="pdfv-act">
          {ownerSlot}
          <a className="btn small outline" href={publicFileUrl(file.path)} target="_blank" rel="noopener noreferrer">
            Open ↗
          </a>
          <a className="btn small" href={downloadFileUrl(file.path, file.name)}>
            Download
          </a>
        </div>
      </div>
      <div className="pdfv-pages" ref={scrollRef} tabIndex={0} aria-label={`Preview of ${file.name}`}>
        <div className="pdfv-stack" ref={pagesRef} />
        {status !== "ready" && (
          <p className="pdfv-msg">
            {status === "loading"
              ? "Loading preview…"
              : status === "gone"
                ? "This PDF was removed."
                : "The preview couldn't load. Use Open or Download to read the PDF."}
          </p>
        )}
      </div>
    </section>
  );
}
