"use client";

import Swal from "sweetalert2";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { fetchAPI } from "@/lib/api";
import { Save, ArrowLeft, Image as ImageIcon, X, Plus, Loader2 } from "lucide-react";
import Link from "next/link";
import { uploadFile } from "@/app/actions/upload";

export default function CreateGalleryPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <GalleryForm />
        </Suspense>
    );
}

function GalleryForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const siteParam = searchParams.get("site") || "main";
    const domain = siteParam === "pdpa" ? "pdpa.localhost" : "localhost";

    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setFiles(prev => [...prev, ...newFiles]);

            const newPreviews = newFiles.map(file => URL.createObjectURL(file));
            setPreviews(prev => [...prev, ...newPreviews]);
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
        setPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (files.length === 0) {
            Swal.fire({ title: "แจ้งเตือน", text: "กรุณาเลือกรูปภาพอย่างน้อย 1 รูป" });
            return;
        }

        setLoading(true);
        try {
            // 1. Upload all images
            const imageIds = [];
            for (const file of files) {
                const formData = new FormData();
                formData.append("files", file);
                const uploaded = await uploadFile(formData);
                if (uploaded && uploaded.length > 0) {
                    imageIds.push(uploaded[0].id);
                }
            }

            // 2. Create Gallery entry
            await fetchAPI("/galleries", {}, {
                method: "POST",
                body: JSON.stringify({
                    data: {
                        title,
                        description,
                        domain,
                        images: imageIds,
                        publishedAt: new Date().toISOString()
                    }
                })
            });

            Swal.fire({ icon: "success", title: "สำเร็จ", text: "สร้างแกลเลอรี่สำเร็จ", timer: 1500, showConfirmButton: false });
            router.push(`/admin/galleries?site=${siteParam}`);
        } catch (error) {
            console.error("Failed to create gallery", error);
            Swal.fire({ icon: "error", title: "แจ้งเตือน", text: "เกิดข้อผิดพลาดในการสร้างแกลเลอรี่" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
                <Link href={`/admin/galleries?site=${siteParam}`} className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-primary transition-all shadow-sm">
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-2xl font-black text-primary font-heading">สร้างแกลเลอรี่ใหม่</h1>
                    <p className="text-xs text-gray-400 font-medium">เพิ่มชุดรูปภาพสำหรับใช้ในข่าวสาร</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-premium space-y-6">
                    <div>
                        <label className="block text-xs font-black text-primary uppercase tracking-widest mb-3">ชื่อแกลเลอรี่ / อัลบั้ม</label>
                        <input
                            type="text"
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="ระบุชื่ออัลบั้มภาพ..."
                            className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary/20 outline-none font-bold placeholder:text-gray-300 transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-black text-primary uppercase tracking-widest mb-3">คำอธิบายเพิ่มเติม</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="รายละเอียดเกี่ยวกับชุดภาพนี้ (ถ้ามี)..."
                            className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary/20 outline-none font-medium placeholder:text-gray-300 transition-all h-32 resize-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-black text-primary uppercase tracking-widest mb-3">จัดการรูปภาพในอัลบั้ม</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {previews.map((url, index) => (
                                <div key={index} className="aspect-square rounded-2xl overflow-hidden relative group border-2 border-gray-50">
                                    <img src={url} className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => removeFile(index)}
                                        className="absolute top-2 right-2 w-8 h-8 bg-black/50 backdrop-blur text-white rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                            <label className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-300 hover:border-primary hover:text-primary transition-all cursor-pointer group bg-gray-50/50">
                                <Plus size={32} className="group-hover:scale-110 transition-transform" />
                                <span className="text-[10px] font-black uppercase mt-2">เพิ่มรูปภาพ</span>
                                <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} />
                            </label>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-10 py-4 bg-primary text-white rounded-2xl font-black text-sm flex items-center gap-3 shadow-premium hover:bg-accent disabled:opacity-50 transition-all active:scale-95"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                        บันทึกแกลเลอรี่
                    </button>
                </div>
            </form>
        </div>
    );
}
