"use client";

import { LayoutDashboard, FileText, ShieldCheck, Settings, Bell, BarChart3, MessageSquare, History, User, LogOut, Search, ChevronRight, Menu, X, LayoutTemplate, Plus, HelpCircle, FolderTree, Mail, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { checkAuthAction, logoutAction } from "@/app/actions/auth";
import AdminNotificationBell from "@/components/AdminNotificationBell";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <AdminLayoutContent>{children}</AdminLayoutContent>
        </Suspense>
    );
}

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
    const searchParams = useSearchParams();
    const siteParam = searchParams.get("site") || "main";
    const siteName = siteParam === "pdpa" ? "PDPA Center" : "DataGOV";
    const isPDPA = siteParam === "pdpa";
    const siteUrl = isPDPA
        ? process.env.NEXT_PUBLIC_PDPA_URL || "http://localhost:3004"
        : process.env.NEXT_PUBLIC_DATAGOV_URL || "http://localhost:3002";
    const [authData, setAuthData] = useState<{ isAuthorized: boolean; role: string | null; username: string | null } | null>(null);
    const router = useRouter();

    useEffect(() => {
        const checkAuth = async () => {
            const data = await checkAuthAction(siteParam);
            setAuthData(data);
        };

        checkAuth();

        const handleAuthChange = () => {
            checkAuth();
        };

        window.addEventListener('admin-auth-change', handleAuthChange);
        return () => {
            window.removeEventListener('admin-auth-change', handleAuthChange);
        };
    }, [siteParam]);

    const pathname = usePathname();

    const menuGroups = [
        {
            label: "ภาพรวม",
            roles: ["SUPER_ADMIN", "EDITOR"],
            items: [
                { icon: <LayoutDashboard size={18} />, label: "แดชบอร์ด", href: `/admin`, path: `/admin`, exact: true },
            ],
        },
        {
            label: "จัดการเนื้อหา",
            roles: ["SUPER_ADMIN", "EDITOR"],
            items: [
                { icon: <FileText size={18} />, label: "ข่าวสาร/กิจกรรม", href: `/admin/news`, path: `/admin/news` },
                { icon: <ShieldCheck size={18} />, label: "นโยบายและมาตรฐาน", href: `/admin/policies`, path: `/admin/policies` },
                { icon: <FileText size={18} />, label: "บริการและดาวน์โหลด", href: `/admin/services`, path: `/admin/services` },
                { icon: <FileText size={18} />, label: "เอกสารเผยแพร่", href: `/admin/documents`, path: `/admin/documents` },
                { icon: <ShieldCheck size={18} />, label: "จุดเด่น/หลักการ", href: `/admin/features`, path: `/admin/features` },
                { icon: <LayoutTemplate size={18} />, label: "สไลด์หน้าแรก", href: `/admin/hero-slides`, path: `/admin/hero-slides` },
            ],
        },
        {
            label: "จัดการไซต์",
            roles: ["SUPER_ADMIN"],
            items: [
                { icon: <Settings size={18} />, label: "ตั้งค่าเว็บไซต์", href: `/admin/site-config`, path: `/admin/site-config` },
                { icon: <FolderTree size={18} />, label: "หมวดหมู่", href: `/admin/categories`, path: `/admin/categories` },
                { icon: <ImageIcon size={18} />, label: "แกลเลอรี่", href: `/admin/galleries`, path: `/admin/galleries` },
            ],
        },
        {
            label: "การสื่อสาร",
            roles: ["SUPER_ADMIN"],
            items: [
                { icon: <Bell size={18} />, label: "ข้อความติดต่อ", href: `/admin/contacts`, path: `/admin/contacts` },
                { icon: <Mail size={18} />, label: "Newsletter", href: `/admin/newsletter`, path: `/admin/newsletter` },
                { icon: <Bell size={18} />, label: "การแจ้งเตือน", href: `/admin/notifications`, path: `/admin/notifications` },
                { icon: <MessageSquare size={18} />, label: "ตั้งค่าแชทบอท", href: `/admin/chatbot`, path: `/admin/chatbot` },
            ],
        },
        {
            label: "ระบบ",
            roles: ["SUPER_ADMIN"],
            items: [
                { icon: <BarChart3 size={18} />, label: "สถิติการใช้งาน", href: `/admin/stats`, path: `/admin/stats` },
                { icon: <History size={18} />, label: "ประวัติการใช้งาน", href: `/admin/logs`, path: `/admin/logs` },
            ],
        },
    ];

    if (authData === null) {
        return <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center"><p className="text-gray-400 font-bold">กำลังตรวจสอบสิทธิ์...</p></div>;
    }

    if (authData.isAuthorized === false) {
        return <div className="min-h-screen bg-[#f8fafc]">{children}</div>;
    }

    const currentRole = authData.role || "SUPER_ADMIN";
    const currentUsername = authData.username || "System Admin";
    const filteredMenuGroups = menuGroups.filter(g => g.roles.includes(currentRole));

    return (
        <div className="min-h-screen bg-[#f8fafc] flex">
            {/* Sidebar */}
            <aside className="w-72 bg-white border-r border-gray-100 flex flex-col fixed h-full z-50">
                {/* Accent top strip — reflects the active site theme */}
                <div className="h-1 w-full shrink-0" style={{ background: "linear-gradient(to right, var(--primary-color), var(--accent-color))" }} />
                <div className="p-8 shrink-0">
                    <Link href={isPDPA ? siteUrl : "/"} className="flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-lg" style={{ background: "var(--primary-color)" }}>
                            <ShieldCheck size={24} />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-heading font-black text-xl tracking-tighter leading-none" style={{ color: "var(--primary-color)" }}>{siteName}</span>
                            <span className="text-[8px] uppercase font-bold tracking-[0.2em]" style={{ color: "var(--accent-color)" }}>ระบบจัดการเนื้อหา</span>
                        </div>
                    </Link>
                </div>

                <nav data-lenis-prevent="true" className="flex-1 min-h-0 px-4 overflow-y-auto pb-6 custom-scrollbar space-y-5">
                    {filteredMenuGroups.map((group) => (
                        <div key={group.label}>
                            {/* Group label */}
                            <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.2em] px-4 mb-1.5">
                                {group.label}
                            </p>
                            <div className="space-y-0.5">
                                {group.items.map((item) => {
                                    const isActive = (item as any).exact
                                        ? pathname === item.path
                                        : pathname.startsWith(item.path);

                                    return (
                                        <Link
                                            key={item.label}
                                            href={`${item.href}?site=${siteParam}`}
                                            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-sm transition-all group ${isActive
                                                ? "text-white shadow-md shadow-primary/20"
                                                : "text-gray-500 hover:bg-gray-50 hover:text-primary"
                                                }`}
                                            style={isActive ? { background: "var(--primary-color)" } : {}}
                                        >
                                            <span className={`flex-shrink-0 ${isActive ? "text-white" : "text-gray-350 group-hover:text-primary transition-colors"}`}
                                                style={isActive ? { color: "var(--accent-color)" } : {}}>
                                                {item.icon}
                                            </span>
                                            <span className="truncate">{item.label}</span>
                                            {isActive && (
                                                <ChevronRight size={14} className="ml-auto flex-shrink-0 opacity-60" />
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                <div className="p-6 border-t border-gray-50 space-y-4 shrink-0">
                    <div className="p-4 rounded-2xl border" style={{ background: "var(--accent-subtle)", borderColor: "var(--accent-glow)" }}>
                        <div className="flex items-center gap-2 mb-2">
                            <HelpCircle size={16} style={{ color: "var(--accent-color)" }} />
                            <p className="text-xs font-bold" style={{ color: "var(--primary-color)" }}>ศูนย์ช่วยเหลือและคู่มือ</p>
                        </div>
                        <p className="text-[10px] text-gray-500 leading-relaxed mb-3">ตรวจสอบคู่มือการใช้งานระบบจัดการข้อมูลธรรมาภิบาล</p>
                        <button
                            className="w-full py-2 bg-white text-[10px] font-bold rounded-xl border transition-colors"
                            style={{ color: "var(--primary-color)", borderColor: "var(--accent-glow)" }}
                        >
                            ดูคู่มือการใช้งาน
                        </button>
                    </div>

                    <button
                        onClick={async () => {
                            await logoutAction(siteParam);
                            window.dispatchEvent(new Event('admin-auth-change'));
                            window.location.href = `${pathname}?site=${siteParam}`;
                        }}
                        className="w-full flex items-center gap-4 px-4 py-3 text-red-500 font-bold text-sm hover:bg-red-50 rounded-2xl transition-all"
                    >
                        <LogOut size={20} />
                        ออกจากระบบ
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 ml-72">
                {/* Top Header */}
                <header className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-10 sticky top-0 z-40">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-100">
                            <button
                                onClick={() => {
                                    const params = new URLSearchParams(searchParams.toString());
                                    params.set("site", "main");
                                    window.location.href = `${pathname}?${params.toString()}`;
                                }}
                                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${siteParam === "main"
                                    ? "bg-white text-primary shadow-sm border border-gray-100"
                                    : "text-gray-400 hover:text-primary"
                                    }`}
                            >
                                DataGOV
                            </button>
                            <button
                                onClick={() => {
                                    const params = new URLSearchParams(searchParams.toString());
                                    params.set("site", "pdpa");
                                    window.location.href = `${pathname}?${params.toString()}`;
                                }}
                                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${siteParam === "pdpa"
                                    ? "bg-white text-primary shadow-sm border border-gray-100"
                                    : "text-gray-400 hover:text-primary"
                                    }`}
                            >
                                PDPA
                            </button>
                        </div>
                        <div className="h-4 w-px bg-gray-200 mx-2"></div>
                        <h2 className="text-sm font-bold text-primary font-heading uppercase tracking-widest">
                            {siteName} แดชบอร์ด
                        </h2>
                    </div>

                    <div className="flex items-center gap-6">
                        <AdminNotificationBell siteParam={siteParam} />

                        <div className="h-8 w-px bg-gray-100"></div>

                        <div className="flex items-center gap-3 cursor-pointer group">
                            <div className="text-right flex flex-col">
                                <span className="text-sm font-bold text-primary group-hover:text-accent transition-colors leading-none">{currentRole === "SUPER_ADMIN" ? "ผู้ดูแลระบบ(สูงสุด)" : "บรรณาธิการ(Editor)"}</span>
                                <span className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">{currentUsername}</span>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-primary group-hover:border-accent transition-all overflow-hidden flex-shrink-0">
                                <User size={20} />
                            </div>
                        </div>
                    </div>
                </header>

                <div className="p-10">
                    {children}
                </div>
            </main>
        </div>
    );
}
