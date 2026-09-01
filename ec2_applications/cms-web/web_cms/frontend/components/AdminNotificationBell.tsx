"use client";

import { useEffect, useState } from "react";
import { Bell, UserPlus } from "lucide-react";
import { getNotificationCounts, getRecentNotifications } from "@/app/actions/notifications";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSiteParam } from "@/lib/siteConfig";

export default function AdminNotificationBell({ siteParam }: { siteParam: string }) {
    // Map siteParam back to Strapi domain value
    const domain = siteParam === "pdpa" ? "pdpa.localhost" : "localhost";
    const [counts, setCounts] = useState({ unreadAuditLogs: 0, newContacts: 0, newSubscribers: 0, total: 0 });
    const [recent, setRecent] = useState<{ auditLogs: any[], contacts: any[], subscribers: any[] }>({ auditLogs: [], contacts: [], subscribers: [] });
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();

    const fetchNotifications = async () => {
        try {
            const dataCounts = await getNotificationCounts(domain);
            setCounts(dataCounts);

            if (isOpen) {
                const recentData = await getRecentNotifications(domain);
                setRecent(recentData);
            }
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchNotifications();
        // Polling every 30 seconds
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [domain, isOpen]);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative w-10 h-10 flex items-center justify-center text-gray-400 hover:text-primary transition-colors focus:outline-none"
            >
                <Bell size={20} />
                {counts.total > 0 && (
                    <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center bg-red-500 rounded-full border-2 border-white text-[9px] font-black text-white">
                        {counts.total > 9 ? '9+' : counts.total}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                        <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                            <h3 className="font-bold text-sm text-primary">การแจ้งเตือน ({counts.total})</h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-xs text-gray-400 hover:text-primary transition-colors"
                            >
                                ปิด
                            </button>
                        </div>

                        <div className="max-h-80 overflow-y-auto custom-scrollbar">
                            {counts.total === 0 ? (
                                <div className="p-6 text-center text-gray-400 text-xs gap-2 flex flex-col items-center">
                                    <Bell size={24} className="opacity-50" />
                                    ไม่มีการแจ้งเตือนใหม่
                                </div>
                            ) : (
                                <div className="py-2">
                                    {recent.contacts.length > 0 && (
                                        <div className="px-4 py-2">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex justify-between">
                                                <span>ข้อความใหม่</span>
                                                <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded-md leading-none">{counts.newContacts}</span>
                                            </p>
                                            {recent.contacts.map((contact: any) => (
                                                <Link
                                                    href={`/admin/contacts?site=${siteParam}`}
                                                    key={contact.id}
                                                    onClick={() => setIsOpen(false)}
                                                    className="block p-3 hover:bg-gray-50 rounded-xl transition-colors mb-1"
                                                >
                                                    <p className="text-xs font-bold text-gray-800 line-clamp-1">{contact.subject || 'ไม่มีหัวข้อ'}</p>
                                                    <p className="text-[10px] text-gray-500 line-clamp-1 mt-0.5 flex gap-1 items-center">จาก {contact.name}</p>
                                                </Link>
                                            ))}
                                        </div>
                                    )}

                                    {recent.subscribers?.length > 0 && (
                                        <div className="px-4 py-2">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex justify-between">
                                                <span>ผู้สมัครรับข่าวสารใหม่</span>
                                                <span className="bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-md leading-none">{counts.newSubscribers}</span>
                                            </p>
                                            {recent.subscribers.map((sub: any) => (
                                                <Link
                                                    href={`/admin/newsletter?site=${siteParam}`}
                                                    key={sub.id}
                                                    onClick={() => setIsOpen(false)}
                                                    className="block p-3 hover:bg-gray-50 rounded-xl transition-colors mb-1"
                                                >
                                                    <p className="text-xs font-bold text-gray-800 line-clamp-1 flex items-center gap-1.5"><UserPlus size={12} className="text-primary" /> {sub.email}</p>
                                                </Link>
                                            ))}
                                        </div>
                                    )}

                                    {recent.auditLogs.length > 0 && (
                                        <div className="px-4 py-2">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex justify-between">
                                                <span>ประวัติระบบ</span>
                                                <span className="bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-md leading-none">{counts.unreadAuditLogs}</span>
                                            </p>
                                            {recent.auditLogs.map((log: any) => (
                                                <Link
                                                    href={`/admin/notifications?site=${siteParam}`}
                                                    key={log.id}
                                                    onClick={() => setIsOpen(false)}
                                                    className="block p-3 hover:bg-gray-50 rounded-xl transition-colors mb-1"
                                                >
                                                    <p className="text-xs font-bold text-gray-800 line-clamp-1">{log.action}: {log.contentType}</p>
                                                    <p className="text-[10px] text-gray-500 line-clamp-1 mt-0.5">{log.entityTitle}</p>
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="p-3 border-t border-gray-50 bg-gray-50/50">
                            <Link
                                href={`/admin/notifications?site=${siteParam}`}
                                onClick={() => setIsOpen(false)}
                                className="block w-full text-center text-xs font-bold text-primary hover:text-accent transition-colors"
                            >
                                ดูตัวจัดการประวัติการใช้งาน
                            </Link>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
