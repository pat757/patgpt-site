import "server-only";
import { Fragment, type ReactNode } from "react";
import { parseDocument } from "htmlparser2";
import { isAllowedImageSrc } from "@/lib/body";
import { SITE } from "@/lib/site";
import { PostImage } from "./PostImage";
import { PromptBox } from "./PromptBox";

// Turns a post written in the visual editor (stored as HTML) into page content.
// Only the tags below are kept, links must be http(s) or mailto, and everything else
// (scripts, styles, event handlers, unknown tags and attributes) is dropped. React escapes all text.

type DomNode = { type: string; name?: string; data?: string; attribs?: Record<string, string>; children?: DomNode[] };

const textOf = (node: DomNode): string =>
  node.type === "text" ? node.data || "" : (node.children || []).map(textOf).join("");
const hasImage = (node: DomNode): boolean => node.name === "img" || (node.children || []).some(hasImage);

function safeHref(raw: string | undefined) {
  const href = (raw || "").trim();
  if (/^https?:\/\//i.test(href) || /^mailto:/i.test(href)) return href;
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  return null;
}

export function RichBody({ html }: { html: string }) {
  const doc = parseDocument(html) as unknown as DomNode;
  let prompts = 0;

  const kids = (node: DomNode, key: string) => (node.children || []).map((c, i) => one(c, `${key}-${i}`));

  function one(node: DomNode, k: string): ReactNode {
    if (node.type === "text") return node.data;
    if (node.type !== "tag") return null; // comments, scripts, styles
    const a = node.attribs || {};
    switch (node.name) {
      case "p":
        return hasImage(node) ? (
          <div key={k} className="p">
            {kids(node, k)}
          </div>
        ) : (
          <p key={k}>{kids(node, k)}</p>
        );
      case "h1":
      case "h2":
        return <h2 key={k}>{kids(node, k)}</h2>;
      case "h3":
      case "h4":
      case "h5":
      case "h6":
        return <h3 key={k}>{kids(node, k)}</h3>;
      case "strong":
      case "b":
        return <strong key={k}>{kids(node, k)}</strong>;
      case "em":
      case "i":
        return <em key={k}>{kids(node, k)}</em>;
      case "u":
        return <u key={k}>{kids(node, k)}</u>;
      case "s":
      case "strike":
      case "del":
        return <s key={k}>{kids(node, k)}</s>;
      case "code":
        return <code key={k}>{kids(node, k)}</code>;
      case "br":
        return <br key={k} />;
      case "hr":
        return <hr key={k} />;
      case "ul":
        return <ul key={k}>{kids(node, k)}</ul>;
      case "ol": {
        const start = parseInt(a.start || "", 10);
        return (
          <ol key={k} start={start > 1 ? start : undefined}>
            {kids(node, k)}
          </ol>
        );
      }
      case "li":
        return <li key={k}>{kids(node, k)}</li>;
      case "blockquote":
        return <blockquote key={k}>{kids(node, k)}</blockquote>;
      case "a": {
        const href = safeHref(a.href);
        if (!href) return <Fragment key={k}>{kids(node, k)}</Fragment>;
        const external = /^https?:/i.test(href) && !href.startsWith(SITE.url);
        return (
          <a key={k} href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer nofollow" } : {})}>
            {kids(node, k)}
          </a>
        );
      }
      case "img": {
        const src = (a.src || "").trim();
        if (!isAllowedImageSrc(src)) return null;
        return <PostImage key={k} src={src} caption={(a.alt || "").trim()} />;
      }
      case "pre": {
        prompts++;
        const text = textOf(node).replace(/^\n+|\n+$/g, "");
        return <PromptBox key={k} n={prompts} label={(a["data-label"] || "").trim().slice(0, 60)} text={text} />;
      }
      default:
        return <Fragment key={k}>{kids(node, k)}</Fragment>;
    }
  }

  return <>{kids(doc, "n")}</>;
}
