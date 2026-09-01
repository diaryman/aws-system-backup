"use client";

import { Printer } from "lucide-react";

export default function PrintButton({ label = "พิมพ์เอกสาร" }: { label?: string }) {
    return (
        <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border font-bold text-sm transition-all hover:opacity-80 active:scale-95 print:hidden"
            style={{
                borderColor: "var(--accent-color)",
                color: "var(--accent-color)",
                background: "var(--accent-subtle)"
            }}
            aria-label={label}
        >
            <Printer size={16} />
            {label}
        </button>
    );
}
