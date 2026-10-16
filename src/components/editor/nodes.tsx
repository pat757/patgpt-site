"use client";
/* eslint-disable @next/next/no-img-element -- editor previews, including images still uploading */
import { mergeAttributes, textblockTypeInputRule, type NodeViewProps } from "@tiptap/core";
import { CodeBlock } from "@tiptap/extension-code-block";
import { Image } from "@tiptap/extension-image";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";

/** Prompt box: a code block with an optional label, saved as <pre data-label="…"><code>…</code></pre>. */
export const PromptBoxNode = CodeBlock.extend({
  addAttributes() {
    return {
      label: {
        default: "",
        parseHTML: (el: HTMLElement) => (el.getAttribute("data-label") || "").slice(0, 60),
        renderHTML: (attrs: { label?: string }) => (attrs.label ? { "data-label": attrs.label } : {}),
      },
    };
  },
  renderHTML({ HTMLAttributes }) {
    return ["pre", mergeAttributes(HTMLAttributes), ["code", {}, 0]];
  },
  addInputRules() {
    // Typing ``` (optionally followed by a label) and a space starts a prompt box.
    return [textblockTypeInputRule({ find: /^```([^\s`]*)[\s\n]$/, type: this.type, getAttributes: (m) => ({ label: m[1] || "" }) })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(PromptBoxView);
  },
});

// Enter in a label or caption box goes back to writing instead of submitting the form.
const backToText = (e: React.KeyboardEvent, go: () => void) => {
  if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
  e.preventDefault();
  go();
};

function PromptBoxView({ node, updateAttributes, editor, getPos }: NodeViewProps) {
  return (
    <NodeViewWrapper className="pbox ed-pbox">
      <div className="pbox-h" contentEditable={false}>
        <span>Prompt ·</span>
        <input
          className="ed-pbox-label"
          value={node.attrs.label || ""}
          placeholder="Copy & paste"
          maxLength={60}
          aria-label="Prompt box label"
          onChange={(e) => updateAttributes({ label: e.target.value })}
          onKeyDown={(e) => backToText(e, () => {
            const pos = getPos();
            if (typeof pos === "number") editor.commands.focus(pos + node.nodeSize - 1);
          })}
        />
      </div>
      <pre>
        <NodeViewContent<"code"> as="code" />
      </pre>
    </NodeViewWrapper>
  );
}

/** Image block. The caption is saved as the image's alt text. `uploadId` marks one still uploading (never saved). */
export const ImageNode = Image.extend({
  draggable: true,
  addAttributes() {
    return {
      ...this.parent?.(),
      uploadId: { default: null, rendered: false, parseHTML: () => null },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageView);
  },
}).configure({ inline: false, allowBase64: true });

function ImageView({ node, updateAttributes, deleteNode, selected, editor, getPos }: NodeViewProps) {
  const { src, alt, uploadId } = node.attrs as { src: string; alt: string | null; uploadId: string | null };
  return (
    <NodeViewWrapper className={`ed-img${selected ? " sel" : ""}`} data-drag-handle="">
      <div className="ed-img-frame" contentEditable={false}>
        <img src={src} alt={alt || ""} draggable={false} />
        {uploadId && <span className="ed-img-busy">Uploading…</span>}
        <button type="button" className="ed-img-x" aria-label="Remove image" title="Remove image" onClick={() => deleteNode()}>
          ×
        </button>
      </div>
      <input
        className="ed-img-cap"
        value={alt || ""}
        placeholder="Add a caption (optional)"
        maxLength={200}
        aria-label="Image caption"
        onChange={(e) => updateAttributes({ alt: e.target.value })}
        onKeyDown={(e) => backToText(e, () => {
          const pos = getPos();
          if (typeof pos === "number") editor.chain().focus(pos + node.nodeSize).run();
        })}
      />
    </NodeViewWrapper>
  );
}
