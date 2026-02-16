"use client";

import { useState } from "react";

type Props = {
  value: string;
  label?: string;
  variant?: "default" | "outline";
};

export default function CopyPromo({
  value,
  label = "📋 Kopiraj kod",
  variant = "outline",
}: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const base =
    "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition";

  const styles =
  variant === "default"
    ? "bg-zinc-900 text-white hover:bg-zinc-800"
    : "bg-white/10 text-white border border-white/20 hover:bg-white/20";


  const successStyle = copied
    ? "bg-green-50 text-green-700 border border-green-200"
    : styles;

  return (
    <button
      type="button"
      onClick={copy}
      className={`${base} ${successStyle}`}
    >
      {copied ? "✅ Kopirano" : label}
    </button>
  );
}
