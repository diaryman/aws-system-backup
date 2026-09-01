"use client";

import { useState, useTransition } from "react";
import { Bell, Info, AlertTriangle, CheckCircle, Clock, Trash2, Settings, User } from "lucide-react";
import { markAuditLogAsRead, markAllAuditLogsAsRead, deleteAuditLog } from "@/app/actions/auditLog";

function timeAgo(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "เมื่อสักครู่";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} นาทีที่แล้ว`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} ชั่วโมงที่แล้ว`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} วันที่แล้ว`;
    return date.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
}

export default function NotificationsClient({ initialNotifications, siteParam, domain }: { initialNotifications: any[], siteParam: string, domain: string }) {
    const siteName = siteParam === "pdpa" ? "PDPA Center" : "DataGOV";
    const [notifications, setNotifications] = useState(initialNotifications);
    const [isPending, startTransition] = useTransition();

    const handleMarkAsRead = (documentId: string) => {
        setNotifications(prev => prev.map(n => n.documentId === documentId ? { ...n, isRead: true } : n));
        startTransition(() => {
            markAuditLogAsRead(documentId, domain);
        });
    };

    const handleDelete = (documentId: string) => {
        setNotifications(prev => prev.filter(n => n.documentId !== documentId));
        startTransition(() => {
            deleteAuditLog(documentId, domain);
        });
    };

    const handleMarkAllRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        startTransition(() => {
            markAllAuditLogsAsRead(domain);
        });
    };

    // Map audit log to formatted display type
    const mappedNotifications = notifications.map(log => {
        let title = "การเปลี่ยนแปลงระบบ";
        let type = "info";
        let message = `มีการทำรายการ ${log.action} ในเนื้อหา ${log.contentType}`;

        switch (log.action) {
            case "CREATE":
                title = "สร้างเนื้อหาใหม่";
                type = "success";
                message = `สร้าง "${log.entityTitle || 'ไม่มีชื่อ'}" ในประเภท ${log.contentType}`;
                break;
            case "UPDATE":
                title = "อัปเดตข้อมูลสำเร็จ";
                type = "info";
                message = `ข้อมูล "${log.entityTitle || 'ไม่มีชื่อ'}" ถูกแก้ไขล่าสุดใน ${log.contentType}`;
                break;
            case "DELETE":
                title = "ลบข้อมูลออกจากระบบ";
                type = "warning";
                message = `"${log.entityTitle || 'ไม่มีชื่อ'}" ถูกลบออกไปจากประเภท ${log.contentType}`;
                break;
        }

        return {
            id: log.documentId,
            type,
            title,
            message,
            time: timeAgo(log.createdAt),
            read: log.isRead || false,
            rawLog: log
        };
    });

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-primary font-heading tracking-tight">การแจ้งเตือน</h1>
                    <p className="text-gray-400 font-medium">ศูนย์รวมข่าวสารและการแจ้งเตือนระบบสำหรับ {siteName}</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleMarkAllRead}
                        disabled={isPending}
                        className="px-4 py-2 bg-white border border-gray-200 rounded-xl font-bold text-xs text-primary hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50"
                    >
                        อ่านทั้งหมดแล้ว
                    </button>
                    <button className="px-4 py-2 bg-white border border-gray-200 rounded-xl font-bold text-xs text-gray-400 hover:text-primary hover:bg-gray-50 transition-all shadow-sm">
                        <Settings size={16} />
                    </button>
                </div>
            </div>

            {/* Notification List */}
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="divide-y divide-gray-50">
                    {mappedNotifications.length > 0 ? (
                        mappedNotifications.map((notif) => (
                            <div
                                key={notif.id}
                                className={`p-6 hover:bg-gray-50 transition-colors group relative ${notif.read ? 'opacity-70' : ''}`}
                                style={!notif.read ? { background: 'var(--accent-subtle)' } : {}}
                            >
                                <div className="flex items-start gap-4 pr-10">
                                    {/* Icon */}
                                    <div
                                        className="w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-sm"
                                        style={notif.type === 'info' ? { background: 'var(--accent-subtle)', color: 'var(--accent-color)' } :
                                            notif.type === 'success' ? { background: 'var(--accent-subtle)', color: 'var(--accent-color)' } :
                                                notif.type === 'warning' ? { background: 'rgba(245,158,11,0.08)', color: '#f59e0b' } :
                                                    { background: 'rgba(244,63,94,0.07)', color: '#f43f5e' }}
                                    >
                                        {notif.type === 'info' ? <Info size={24} /> :
                                            notif.type === 'warning' ? <AlertTriangle size={24} /> :
                                                notif.type === 'success' ? <CheckCircle size={24} /> :
                                                    <Bell size={24} />}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className={`font-bold text-primary text-base ${!notif.read && 'font-black'}`}>{notif.title}</h3>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1 whitespace-nowrap">
                                                <Clock size={12} /> {notif.time}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500 leading-relaxed max-w-3xl mb-2">{notif.message}</p>
                                        <div className="flex gap-4 items-center">
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-400">
                                                <User size={12} /> {notif.rawLog.userEmail || "Admin"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="absolute top-6 right-6 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 p-1 rounded-xl backdrop-blur-sm shadow-sm md:opacity-100 md:bg-transparent md:shadow-none">
                                    {!notif.read && (
                                        <button
                                            onClick={() => handleMarkAsRead(notif.id)}
                                            className="p-2 text-primary rounded-lg transition-colors hover:opacity-70"
                                            title="Mark as read"
                                        >
                                            <CheckCircle size={16} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(notif.id)}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                {!notif.read && (
                                    <div className="absolute top-1/2 -translate-y-1/2 left-2 w-1.5 h-1.5 bg-accent rounded-full"></div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="py-20 text-center">
                            <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-gray-300">
                                <Bell size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-400 font-heading">ไม่มีการแจ้งเตือน</h3>
                            <p className="text-sm text-gray-300 mt-2">คุณอ่านการแจ้งเตือนทั้งหมดแล้ว หรือยังไม่มีการเคลื่อนไหวใดๆ</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
