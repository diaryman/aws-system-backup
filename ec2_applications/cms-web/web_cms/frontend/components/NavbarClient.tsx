"use client";

import { Menu, X, Search, ShieldCheck, Languages } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import SearchModal from "./SearchModal";
import ThemeToggle from "./ThemeToggle";
import { useRouter } from "next/navigation";
import FontSizeResizer from "./FontSizeResizer";
import { getSiteParam, getCrossSiteURL } from "@/lib/siteConfig";

interface NavbarClientProps {
    siteName: string;
    navItems?: { name: string; href: string }[];
    domain?: string;
    headerStyle?: string;
    navbarMenuStyle?: string;
}

export default function NavbarClient({ siteName, navItems: customNavItems, domain = "localhost", headerStyle = "style-1", navbarMenuStyle = "pill" }: NavbarClientProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Keyboard shortcuts: Ctrl+K / Cmd+K to open search, ESC to close
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "k") {
                e.preventDefault();
                setIsSearchOpen((prev) => !prev);
            }
            if (e.key === "Escape") {
                setIsSearchOpen(false);
                setIsOpen(false);
            }
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, []);

    const defaultNavItems = [
        { name: "หน้าแรก", href: "/" },
        { name: "ข่าวกิจกรรม", href: "/news?site=main" },
        { name: "PDPA", href: getCrossSiteURL("pdpa") },
        { name: "นโยบาย/มาตรฐาน", href: "/#policy" },
        { name: "เอกสารเผยแพร่", href: "/documents" },
        { name: "ดาวน์โหลด", href: "/#downloads" },
        { name: "ติดต่อเรา", href: "/contact" },
    ];

    const rawNavItems = customNavItems || defaultNavItems;

    // Sanitize nav items: replace hardcoded localhost with dynamic host if on production IP
    const [navItems, setNavItems] = useState<{ name: string, href: string }[]>(rawNavItems);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const sanitized = rawNavItems.map(item => {
                // If the link points to localhost but we are on a real IP/domain, fix it
                if (item.href.includes("localhost:3004")) {
                    return { ...item, href: getCrossSiteURL("pdpa") };
                }
                if (item.href.includes("localhost:3002")) {
                    return { ...item, href: getCrossSiteURL("main") };
                }
                return item;
            });
            setNavItems(sanitized);
        }
    }, [customNavItems]);

    const renderNavItem = (item: { name: string; href: string }) => {
        switch (navbarMenuStyle) {
            case "underline":
                return (
                    <Link key={item.name} href={item.href} className="text-[14px] lg:text-[15px] px-2 font-bold text-gray-700 hover:text-[var(--accent-color)] dark:text-gray-200 relative group transition-colors">
                        {item.name}
                        <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-[var(--accent-color)] group-hover:w-full transition-all duration-300"></span>
                    </Link>
                );
            case "outline":
                return (
                    <Link key={item.name} href={item.href} className="px-5 py-2 text-[14px] lg:text-[15px] font-bold text-gray-700 dark:text-gray-200 relative group transition-all rounded-full border border-transparent hover:border-[var(--accent-color)] hover:text-[var(--accent-color)] hover:bg-[var(--accent-color)]/5">
                        <span className="relative z-10 transition-colors">{item.name}</span>
                    </Link>
                );
            case "glow":
                return (
                    <Link key={item.name} href={item.href} className="px-5 py-2 rounded-full text-[14px] lg:text-[15px] font-bold relative group transition-all hover:scale-105" style={{ color: 'var(--foreground)' }}>
                        <span className="relative z-10 group-hover:text-white transition-colors">{item.name}</span>
                        <span className="absolute inset-0 bg-[var(--accent-color)] opacity-0 group-hover:opacity-100 blur-sm rounded-full transition-all duration-300"></span>
                    </Link>
                );
            case "minimal":
                return (
                    <Link key={item.name} href={item.href} className="px-3 py-2 text-[14px] lg:text-[15px] font-bold text-gray-700 dark:text-gray-200 transition-colors hover:text-[var(--accent-color)]">
                        {item.name}
                    </Link>
                );
            case "pill":
            default:
                return (
                    <Link key={item.name} href={item.href} className="px-5 py-2 font-bold text-[14px] lg:text-[15px] transition-all relative rounded-2xl hover:scale-105 group whitespace-nowrap" style={{ color: 'var(--foreground)' }}>
                        <span className="relative z-10 group-hover:text-white transition-colors">{item.name}</span>
                        <span className="absolute inset-0 bg-[var(--accent-color)] opacity-0 group-hover:opacity-100 rounded-2xl transition-all duration-300 shadow-md shadow-accent/20"></span>
                    </Link>
                );
        }
    };

    return (
        <>
            <nav
                aria-label="เมนูหลัก"
                className={`fixed w-full z-[140] transition-all duration-500 top-[44px] ${scrolled
                    ? "py-3 shadow-premium border-b"
                    : "py-6 bg-transparent"
                    }`}
                style={{
                    backgroundColor: scrolled ? 'var(--glass-bg)' : 'transparent',
                    backdropFilter: scrolled ? 'blur(20px)' : 'none',
                    borderColor: 'var(--glass-border)'
                }}
            >
                <div className="max-w-[1440px] mx-auto px-4 lg:px-8">
                    <div className="flex justify-between items-center py-2 lg:py-0 lg:h-24">
                        {/* Logo Section */}
                        <Link href="/" className="flex-shrink-0 flex items-center gap-3 group" aria-label={`${siteName} - กลับหน้าแรก`}>
                            <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg group-hover:rotate-12 transition-transform duration-300" style={{ backgroundColor: 'var(--accent-color)' }}>
                                <ShieldCheck size={32} />
                            </div>
                            <div className="flex flex-col">
                                <span className={`font-heading font-black text-2xl lg:text-3xl tracking-tighter leading-none text-primary`}>
                                    {siteName}
                                </span>
                                <span className="text-[10px] uppercase font-bold tracking-widest mt-1" style={{ color: 'var(--accent-color)' }}>Admin Court TH</span>
                            </div>
                        </Link>

                        {/* Desktop Menu - Conditionally Rendered by Style */}
                        {headerStyle === "style-3" ? (
                            <div className="hidden xl:flex flex-1 items-center justify-end h-full">
                                <div className="flex items-center gap-1 bg-white/40 dark:bg-white/5 backdrop-blur-xl p-1.5 rounded-[1.5rem] border border-white/60 dark:border-white/10 shadow-lg transition-all duration-500 ring-1 ring-black/5">
                                    {navItems.map((item) => renderNavItem(item))}
                                    <div className="w-px h-6 bg-gray-200/50 dark:bg-white/10 mx-2"></div>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => setIsSearchOpen(true)} className="p-2 hover:bg-white/50 dark:hover:bg-white/10 rounded-xl transition-colors text-gray-600 dark:text-gray-300"><Search size={18} /></button>
                                        <ThemeToggle />
                                    </div>
                                    <div className="w-px h-6 bg-gray-200/50 dark:bg-white/10 mx-2"></div>
                                    <Link
                                        href={`/admin?site=${getSiteParam(domain)}`}
                                        className="px-5 py-2 text-primary font-bold hover:text-accent transition-colors text-sm hover:scale-105"
                                    >
                                        เข้าสู่ระบบ
                                    </Link>
                                </div>
                            </div>
                        ) : headerStyle === "style-2" ? (
                            <div className="hidden xl:flex flex-col h-full flex-1 items-end justify-center">
                                {/* Utility Tier */}
                                <div className="flex items-center gap-4 mb-3">
                                    <button onClick={() => setIsSearchOpen(true)} className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-accent"><Search size={14} /> ค้นหา</button>
                                    <div className="w-px h-3 bg-gray-200 dark:bg-white/10"></div>
                                    <div className="flex items-center gap-2"><FontSizeResizer /><ThemeToggle /></div>
                                    <div className="w-px h-3 bg-gray-200 dark:bg-white/10"></div>
                                    <button className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-accent"><Languages size={14} /> TH</button>
                                    <div className="w-px h-3 bg-gray-200 dark:bg-white/10"></div>
                                    <Link href={`/admin?site=${getSiteParam(domain)}`} className="text-xs font-black text-primary hover:text-accent">Portal</Link>
                                </div>
                                {/* Navigation Tier without pill shadow */}
                                <div className="flex items-center gap-6">
                                    {navItems.map((item) => renderNavItem(item))}
                                    <Link href={`/admin?site=${getSiteParam(domain)}`} className="ml-2 px-5 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-accent transition-colors">
                                        เข้าสู่ระบบ
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="hidden xl:flex flex-col h-full flex-1">
                                {/* Tier 1: Utility Bar (Top Right) */}
                                <div className="flex items-center gap-4 border-b border-gray-100/50 dark:border-white/10 py-2 w-full justify-end px-4">
                                    <button onClick={() => setIsSearchOpen(true)} className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-accent transition-colors" aria-label="เปิดช่องค้นหา (Ctrl+K)">
                                        <Search size={14} /> ค้นหา
                                        <kbd className="hidden lg:flex items-center px-1 text-[8px] rounded border bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 ml-1">⌘K</kbd>
                                    </button>
                                    <div className="w-px h-3 bg-gray-200 dark:bg-white/10"></div>
                                    <div className="flex items-center gap-2"><FontSizeResizer /><ThemeToggle /></div>
                                    <div className="w-px h-3 bg-gray-200 dark:bg-white/10"></div>
                                    <button className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-accent transition-colors"><Languages size={14} /> TH</button>
                                    <div className="w-px h-3 bg-gray-200 dark:bg-white/10"></div>
                                    <Link href={`/admin?site=${getSiteParam(domain)}`} className="text-xs font-black text-primary hover:text-accent transition-colors">Portal</Link>
                                </div>
                                {/* Tier 2: Main Nav Items (Centered Pill) */}
                                <div className="flex-1 flex items-center justify-center relative py-2">
                                    <div className="flex items-center gap-1 bg-white/40 dark:bg-white/5 backdrop-blur-xl p-1.5 rounded-[1.5rem] border border-white/60 dark:border-white/10 shadow-2xl shadow-primary/10 hover:shadow-primary/20 transition-all duration-500 ring-1 ring-black/5">
                                        {navItems.map((item) => renderNavItem(item))}
                                        <div className="w-px h-6 bg-gray-200/50 dark:bg-white/10 mx-2"></div>
                                        <Link href={`/admin?site=${getSiteParam(domain)}`} className="px-6 py-2.5 bg-primary text-sm font-bold rounded-2xl shadow-xl hover:shadow-primary/30 hover:scale-[1.02] transition-all active:scale-95 whitespace-nowrap premium-gradient" style={{ color: 'var(--primary-foreground)' }}>เข้าสู่ระบบ</Link>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Mobile Menu Button */}
                        <div className="xl:hidden flex items-center gap-2">
                            <button
                                onClick={() => setIsSearchOpen(true)}
                                className="p-3 glass rounded-2xl border border-gray-100 dark:border-white/10 text-blue-500"
                            >
                                <Search size={20} />
                            </button>
                            <div className="flex items-center gap-1">
                                <FontSizeResizer />
                                <ThemeToggle />
                            </div>
                            <button
                                onClick={() => setIsOpen(!isOpen)}
                                className="p-3 glass rounded-2xl border border-gray-100 dark:border-white/10"
                                style={{ color: 'var(--foreground)' }}
                                aria-label={isOpen ? "ปิดเมนู" : "เปิดเมนู"}
                                aria-expanded={isOpen}
                                aria-controls="mobile-menu"
                            >
                                {isOpen ? <X size={24} /> : <Menu size={24} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu */}
                {isOpen && (
                    <motion.div
                        id="mobile-menu"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="xl:hidden glass absolute w-full left-0 shadow-2xl overflow-y-auto max-h-[calc(100vh-100px)] custom-scrollbar"
                        aria-live="polite"
                        role="dialog"
                        aria-label="เมนูมือถือ"
                    >
                        <div className="px-4 pt-4 pb-8 space-y-2">
                            {navItems.map((item) => (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className="block px-6 py-4 rounded-2xl text-lg font-bold transition-all relative group overflow-hidden"
                                    style={{ color: 'var(--foreground)' }}
                                    onClick={() => setIsOpen(false)}
                                >
                                    <span className="relative z-10 group-hover:text-white transition-colors">{item.name}</span>
                                    <span className="absolute inset-0 bg-[var(--accent-color)] opacity-0 group-hover:opacity-100 transition-all duration-300"></span>
                                </Link>
                            ))}
                            <div className="pt-4 border-t border-gray-100 dark:border-white/10 flex flex-col gap-4">
                                <div className="flex gap-4">
                                    <ThemeToggle />
                                    <button
                                        className="flex-1 flex items-center justify-center gap-3 py-4 glass rounded-2xl font-bold"
                                        style={{ color: 'var(--foreground)' }}
                                    >
                                        <Languages size={20} className="text-accent" />
                                        <span>Thai / English</span>
                                    </button>
                                </div>
                                <Link
                                    href={`/admin?site=${getSiteParam(domain)}`}
                                    className="w-full flex justify-center py-4 bg-primary rounded-2xl font-bold shadow-lg"
                                    style={{ color: 'var(--primary-foreground)' }}
                                    onClick={() => setIsOpen(false)}
                                >
                                    เข้าสู่ระบบจัดการข้อมูล
                                </Link>
                            </div>
                        </div>
                    </motion.div>
                )}
            </nav>

            <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} domain={domain} />
        </>
    );
}
