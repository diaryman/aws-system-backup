"use client";

import React, { useEffect, useState } from "react";
import { motion, useSpring } from "motion/react";

export default function CustomCursor() {
    const [mounted, setMounted] = useState(false);
    const [isHovering, setIsHovering] = useState(false);

    // Smooth trailing effect
    const cursorX = useSpring(0, { damping: 25, stiffness: 350 });
    const cursorY = useSpring(0, { damping: 25, stiffness: 350 });

    useEffect(() => {
        setMounted(true);
        const moveCursor = (e: MouseEvent) => {
            cursorX.set(e.clientX);
            cursorY.set(e.clientY);
        };

        const handleMouseOver = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            // Magnetic scale triggers on links, buttons, inputs, and anything with .magnetic class
            if (target.closest('a') || target.closest('button') || target.closest('input') || target.closest('.magnetic') || target.closest('[role="button"]')) {
                setIsHovering(true);
            } else {
                setIsHovering(false);
            }
        };

        window.addEventListener("mousemove", moveCursor);
        document.addEventListener("mouseover", handleMouseOver);
        return () => {
            window.removeEventListener("mousemove", moveCursor);
            document.removeEventListener("mouseover", handleMouseOver);
        };
    }, [cursorX, cursorY]);

    if (!mounted) return null;

    return (
        <motion.div
            className="fixed top-0 left-0 rounded-full pointer-events-none z-[99999] hidden lg:flex items-center justify-center transition-all duration-300"
            style={{
                x: cursorX,
                y: cursorY,
                translateX: "-50%",
                translateY: "-50%",
                width: isHovering ? 50 : 10,
                height: isHovering ? 50 : 10,
                backgroundColor: isHovering ? 'var(--accent-glow)' : 'var(--accent-color)',
                border: isHovering ? '1px solid var(--accent-color)' : 'none',
                opacity: isHovering ? 0.3 : 0.6,
            }}
        >
            {isHovering ? null : (
                <div className="w-1 h-1 bg-white rounded-full opacity-50" />
            )}
        </motion.div>
    );
}
