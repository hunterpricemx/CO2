"use client";

import { useEffect, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, List, ListOrdered, Heading2 } from "lucide-react";

type Props = {
  value?: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
};

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Escribe aqui...",
}: Props) {
  const [mode, setMode] = useState<"visual" | "html">("visual");
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || "",
    editorProps: {
      attributes: {
        class:
          "min-h-[180px] px-3 py-2 text-sm text-white focus:outline-none prose prose-invert max-w-none",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!editor) return;
    const incoming = value || "";
    const current = editor.getHTML();
    if (incoming !== current) {
      editor.commands.setContent(incoming, { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) {
    return (
      <div className="bg-[#0f0503] border border-[rgba(255,215,0,0.15)] rounded-lg min-h-55" />
    );
  }

  return (
    <div className="bg-[#0f0503] border border-[rgba(255,215,0,0.15)] rounded-lg overflow-hidden">
      <div className="border-b border-[rgba(255,215,0,0.1)] p-2 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1 rounded-md bg-black/20 p-1">
          <button
            type="button"
            onClick={() => setMode("visual")}
            className={`px-2.5 py-1 text-xs font-medium rounded ${mode === "visual" ? "bg-[#f39c12] text-black" : "text-gray-400 hover:text-white"}`}
          >
            Visual
          </button>
          <button
            type="button"
            onClick={() => setMode("html")}
            className={`px-2.5 py-1 text-xs font-medium rounded ${mode === "html" ? "bg-[#f39c12] text-black" : "text-gray-400 hover:text-white"}`}
          >
            HTML
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={mode === "html"}
            className={`p-1.5 rounded ${editor.isActive("bold") ? "bg-[#f39c12] text-black" : "text-gray-400 hover:text-white hover:bg-white/5"} disabled:opacity-40 disabled:hover:text-gray-400 disabled:hover:bg-transparent`}
          >
            <Bold className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={mode === "html"}
            className={`p-1.5 rounded ${editor.isActive("italic") ? "bg-[#f39c12] text-black" : "text-gray-400 hover:text-white hover:bg-white/5"} disabled:opacity-40 disabled:hover:text-gray-400 disabled:hover:bg-transparent`}
          >
            <Italic className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            disabled={mode === "html"}
            className={`p-1.5 rounded ${editor.isActive("heading", { level: 2 }) ? "bg-[#f39c12] text-black" : "text-gray-400 hover:text-white hover:bg-white/5"} disabled:opacity-40 disabled:hover:text-gray-400 disabled:hover:bg-transparent`}
          >
            <Heading2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            disabled={mode === "html"}
            className={`p-1.5 rounded ${editor.isActive("bulletList") ? "bg-[#f39c12] text-black" : "text-gray-400 hover:text-white hover:bg-white/5"} disabled:opacity-40 disabled:hover:text-gray-400 disabled:hover:bg-transparent`}
          >
            <List className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            disabled={mode === "html"}
            className={`p-1.5 rounded ${editor.isActive("orderedList") ? "bg-[#f39c12] text-black" : "text-gray-400 hover:text-white hover:bg-white/5"} disabled:opacity-40 disabled:hover:text-gray-400 disabled:hover:bg-transparent`}
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {mode === "html" ? (
        <div className="flex flex-col gap-2 p-3">
          <textarea
            value={value || ""}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            spellCheck={false}
            className="min-h-55 w-full resize-y rounded-md border border-[rgba(255,215,0,0.08)] bg-black/20 px-3 py-2 font-mono text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f39c12]"
          />
          <p className="text-[11px] text-gray-500">
            En modo HTML se guarda el marcado tal como lo escribas y se renderiza en la guía pública.
          </p>
        </div>
      ) : (
        <div className="relative min-h-45">
          {!value && (
            <span className="absolute left-3 top-2 text-sm text-gray-600 pointer-events-none">
              {placeholder}
            </span>
          )}
          <EditorContent editor={editor} />
        </div>
      )}
    </div>
  );
}
