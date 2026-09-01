"use client";

import React, { useEffect } from 'react';
import Lenis from 'lenis';
import { usePathname } from 'next/navigation';

export default function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isAdmin = pathname?.startsWith('/admin');

    useEffect(() => {
        if (isAdmin) {
            document.documentElement.classList.remove('lenis-smooth');
            document.documentElement.style.scrollBehavior = 'auto';
            return;
        }

        const lenis = new Lenis({
            lerp: 0.1, // Fixed value for smoother and more consistent results
            smoothWheel: true,
            wheelMultiplier: 1.1,
            touchMultiplier: 2,
        });

        const raf = (time: number) => {
            lenis.raf(time);
            requestAnimationFrame(raf);
        };

        const rafId = requestAnimationFrame(raf);

        // Add a class to html for hiding native scrollbars styling via CSS if desired
        document.documentElement.classList.add('lenis-smooth');
        document.documentElement.style.scrollBehavior = 'auto';

        return () => {
            lenis.destroy();
            cancelAnimationFrame(rafId);
            document.documentElement.classList.remove('lenis-smooth');
        };
    }, [isAdmin]);

    return <>{children}</>;
}
