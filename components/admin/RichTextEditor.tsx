"use client";

import { useEffect } from "react";
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
      <div className="border-b border-[rgba(255,215,0,0.1)] p-2 flex items-center gap-1">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded ${editor.isActive("bold") ? "bg-[#f39c12] text-black" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
        >
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded ${editor.isActive("italic") ? "bg-[#f39c12] text-black" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
        >
          <Italic className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-1.5 rounded ${editor.isActive("heading", { level: 2 }) ? "bg-[#f39c12] text-black" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
        >
          <Heading2 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded ${editor.isActive("bulletList") ? "bg-[#f39c12] text-black" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
        >
          <List className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1.5 rounded ${editor.isActive("orderedList") ? "bg-[#f39c12] text-black" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="relative min-h-45">
        {!value && (
          <span className="absolute left-3 top-2 text-sm text-gray-600 pointer-events-none">
            {placeholder}
          </span>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
