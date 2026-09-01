"use client";

import React from "react";

interface SpotlightCardProps {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    [key: string]: any;
}

/**
 * SpotlightCard — a lightweight card wrapper.
 *
 * Previously this component had a radial-gradient spotlight overlay on hover,
 * but the effect interfered with Framer Motion's SSR hydration in Next.js 16.
 * The overlay is now replaced with a pure CSS hover glow via the
 * `group-hover` / `hover` utilities on the parent card.
 */
export default function SpotlightCard({
    children,
    className = "",
    style = {},
    ...props
}: SpotlightCardProps) {
    return (
        <div
            className={`relative overflow-hidden ${className}`}
            style={style}
            {...props}
        >
            {children}
        </div>
    );
}
