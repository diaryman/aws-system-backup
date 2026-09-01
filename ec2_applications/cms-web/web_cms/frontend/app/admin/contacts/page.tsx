"use client";

import Swal from "sweetalert2";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { fetchAPI } from "@/lib/api";
import { Loader2, Mail, CheckCircle, AlertCircle, Archive, Clock } from "lucide-react";

export default function AdminContactsPage() {
    const searchParams = useSearchParams();
    const siteParam = searchParams.get("site") || "main";
    const domain = siteParam === "pdpa" ? "pdpa.localhost" : "localhost";

    const [submissions, setSubmissions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchSubmissions = async () => {
        setLoading(true);
        try {
            const res = await fetchAPI("/contact-submissions", {
                filters: { domain },
                sort: ["createdAt:desc"]
            });
            setSubmissions(res.data || []);
        } catch (error) {
            console.error("Error fetching submissions", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubmissions();
    }, [domain]);

    const updateStatus = async (id: string, newStatus: string) => {
        try {
            await fetchAPI(`/contact-submissions/${id}`, {}, {
                method: "PUT",
                body: JSON.stringify({ data: { status: newStatus } })
            });
            fetchSubmissions();
        } catch (error) {
            console.error("Error updating status", error);
            Swal.fire({ icon: "error", title: "แจ้งเตือน", text: "อัปเดตสถานะไม่สำเร็จ" });
        }
    };

    const statusColors: any = {
        "New": "bg-blue-50 text-blue-600 border-blue-100",
        "In Progress": "bg-yellow-50 text-yellow-600 border-yellow-100",
        "Resolved": "bg-emerald-50 text-emerald-600 border-emerald-100",
        "Archive": "bg-gray-50 text-gray-500 border-gray-100"
    };

    return (
        <div className="max-w-6xl mx-auto pb-20">
            <div className="mb-8">
                <h1 className="text-3xl font-black font-heading text-primary mb-2">ข้อความติดต่อ</h1>
                <p className="text-gray-500">จัดการข้อความร้องเรียนและสอบถามจากผู้ใช้งาน</p>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={40} /></div>
            ) : (
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">ผู้ติดต่อ</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">หัวข้อ</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">หมวดหมู่</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">สถานะ</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-widest">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {submissions.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-6 align-top">
                                            <div className="font-bold text-gray-800">{item.name}</div>
                                            <div className="text-xs text-gray-400 mt-1">{item.email}</div>
                                            <div className="text-[10px] text-gray-300 mt-1">{new Date(item.createdAt).toLocaleString('th-TH')}</div>
                                        </td>
                                        <td className="px-6 py-6 align-top max-w-xs">
                                            <div className="font-bold text-primary mb-1">{item.subject}</div>
                                            <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 hover:line-clamp-none transition-all cursor-pointer">
                                                {item.message}
                                            </p>
                                        </td>
                                        <td className="px-6 py-6 align-top">
                                            <span className="px-3 py-1 bg-gray-100 rounded-lg text-xs font-bold text-gray-500 border border-gray-200">
                                                {item.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-6 align-top">
                                            <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${statusColors[item.status] || statusColors["New"]}`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-6 align-top text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => updateStatus(item.documentId, "Resolved")}
                                                    title="Mark as Resolved"
                                                    className="p-2 hover:bg-emerald-50 text-gray-400 hover:text-emerald-500 rounded-lg transition-colors"
                                                >
                                                    <CheckCircle size={18} />
                                                </button>
                                                <button
                                                    onClick={() => updateStatus(item.documentId, "In Progress")}
                                                    title="Mark as In Progress"
                                                    className="p-2 hover:bg-yellow-50 text-gray-400 hover:text-yellow-500 rounded-lg transition-colors"
                                                >
                                                    <Clock size={18} />
                                                </button>
                                                <button
                                                    onClick={() => updateStatus(item.documentId, "Archive")}
                                                    title="Archive"
                                                    className="p-2 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                                                >
                                                    <Archive size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {submissions.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center text-gray-400 font-medium">ไม่พบข้อมูลการติดต่อ</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
