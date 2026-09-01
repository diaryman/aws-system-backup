"use client";

import Swal from "sweetalert2";
import { useState, useEffect, use, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { fetchAPI, getStrapiMedia } from "@/lib/api";
import { Save, Loader2, ArrowLeft, FileText, Upload, X, FileUp, ExternalLink } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { uploadFile } from "@/app/actions/upload";

const RichTextEditor = dynamic(() => import("@/components/RichTextEditor"), {
    ssr: false,
    loading: () => <div className="h-[300px] bg-gray-50 rounded-xl animate-pulse" />
});

export default function EditDocumentPage({ params }: { params: Promise<{ id: string }> }) {
    const unwrappedParams = use(params);
    return (
        <Suspense fallback={<div>กำลังโหลด...</div>}>
            <EditDocumentForm id={unwrappedParams.id} />
        </Suspense>
    );
}

function EditDocumentForm({ id }: { id: string }) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const siteParam = searchParams.get("site") || "main";
    const domain = siteParam === "pdpa" ? "pdpa.localhost" : "localhost";

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [dynamicCategories, setDynamicCategories] = useState<any[]>([]);
    const [docFile, setDocFile] = useState<File | null>(null);
    const [existingFile, setExistingFile] = useState<any>(null);
    const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
    const [existingCoverImage, setExistingCoverImage] = useState<any>(null);

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        publishedAt: "",
        domain: domain,
        category: "",
    });

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                // Fetch Categories
                const catsRes = await fetchAPI("/categories", {
                    filters: { domain, type: "document" }
                });
                setDynamicCategories(catsRes.data || []);

                // Fetch Document
                const res = await fetchAPI(`/policy-documents/${id}`, {
                    populate: "*"
                });
                const doc = res.data;

                setFormData({
                    title: doc.title || "",
                    description: doc.description || "",
                    publishedAt: doc.publishedAt ? new Date(doc.publishedAt).toISOString().slice(0, 16) : "",
                    category: doc.category || "",
                    domain: doc.domain || domain
                });

                if (doc.file) {
                    setExistingFile(doc.file);
                }
                if (doc.coverImage) {
                    setExistingCoverImage(doc.coverImage);
                }
            } catch (error) {
                console.error("Error loading document data", error);
            } finally {
                setLoading(false);
            }
        };
        loadInitialData();
    }, [id, domain]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setDocFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            let uploadedFileId = undefined;

            // 1. Upload File if new one selected
            if (docFile) {
                const fileFormData = new FormData();
                fileFormData.append("files", docFile);
                const uploadedFiles = await uploadFile(fileFormData);
                if (uploadedFiles && uploadedFiles.length > 0) {
                    uploadedFileId = uploadedFiles[0].id;
                }
            }

            // 2. Upload Cover Image if new one selected
            let uploadedCoverId = undefined;
            if (coverImageFile) {
                const coverFormData = new FormData();
                coverFormData.append("files", coverImageFile);
                const uploadedCovers = await uploadFile(coverFormData);
                if (uploadedCovers && uploadedCovers.length > 0) {
                    uploadedCoverId = uploadedCovers[0].id;
                }
            }

            // 3. Update Document
            const publishedYear = formData.publishedAt ? new Date(formData.publishedAt).getFullYear() + 543 : new Date().getFullYear() + 543;
            const payload: any = {
                title: formData.title,
                description: formData.description,
                category: formData.category,
                domain: formData.domain,
                year: publishedYear
            };

            if (uploadedFileId) {
                payload.file = uploadedFileId;
            }
            if (uploadedCoverId) {
                payload.coverImage = uploadedCoverId;
            }

            await fetchAPI(`/policy-documents/${id}`, {}, {
                method: "PUT",
                body: JSON.stringify({ data: payload })
            });

            Swal.fire({ icon: "success", title: "สำเร็จ", text: "บันทึกการแก้ไขเอกสารเรียบร้อย", timer: 1500, showConfirmButton: false });
            router.push(`/admin/documents?site=${siteParam}`);
        } catch (error: any) {
            console.error("Error updating document", error);
            Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: error.message || "บันทึกการแก้ไขไม่สำเร็จ" });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="max-w-4xl mx-auto pb-32">
            <div className="flex items-center gap-4 mb-8">
                <Link href={`/admin/documents?site=${siteParam}`} className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-500 hover:text-primary transition-colors shadow-sm">
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-3xl font-black text-primary font-heading">แก้ไขข้อมูลเอกสาร</h1>
                    <p className="text-gray-500 font-medium">ปรับปรุงรายละเอียดเอกสารสำหรับ {siteParam === "pdpa" ? "PDPA Center" : "DataGOV"}</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm space-y-8">
                    {/* File Upload/Status Area */}
                    <div className="space-y-4">
                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                            <FileUp size={16} className="text-primary" /> ไฟล์เอกสารปัจจุบัน
                        </label>

                        {existingFile && !docFile && (
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-slate-700 truncate max-w-xs">{existingFile.name}</p>
                                        <p className="text-[10px] text-slate-400">ขนาด: {(existingFile.size / 1024).toFixed(2)} KB</p>
                                    </div>
                                </div>
                                <a
                                    href={getStrapiMedia(existingFile.url) || undefined}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-500 hover:text-primary transition-colors"
                                >
                                    เปิดดูไฟล์ <ExternalLink size={12} />
                                </a>
                            </div>
                        )}

                        <div
                            className={`relative border-2 border-dashed rounded-2xl p-8 transition-all flex flex-col items-center justify-center ${docFile ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-200 hover:border-primary/40 bg-gray-50'}`}
                        >
                            {docFile ? (
                                <div className="flex items-center gap-4 pointer-events-none w-full">
                                    <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center text-white">
                                        <FileText size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-emerald-900 truncate max-w-xs">{docFile.name}</p>
                                        <p className="text-xs text-emerald-600">{(docFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setDocFile(null)}
                                        className="p-2 hover:bg-emerald-100 rounded-full text-emerald-600 transition-colors relative z-10 pointer-events-auto"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center pointer-events-none">
                                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-gray-400 mb-3">
                                        <Upload size={24} />
                                    </div>
                                    <p className="text-sm font-bold text-gray-500">คลิกหรือลากไฟล์ใหม่มาวางเพื่อเปลี่ยนเอกสาร</p>
                                    <p className="text-xs text-gray-400 mt-1">ไฟล์ใหม่จะถูกนำไปแทนที่ไฟล์เดิมทันทีที่บันทึก</p>
                                </div>
                            )}
                            <input
                                type="file"
                                onChange={handleFileChange}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                        </div>
                    </div>

                    {/* Cover Image Upload Area */}
                    <div className="space-y-4">
                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                            <Upload size={16} className="text-primary" /> เลือกรูปปกหนังสือ (แนวตั้ง, ตัวเลือกเสริม)
                        </label>

                        {existingCoverImage && !coverImageFile && (
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 mb-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-20 bg-gray-200 rounded-xl overflow-hidden shadow-sm">
                                        <img src={getStrapiMedia(existingCoverImage.url) || ""} alt="Current Cover" className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-slate-700 truncate max-w-xs">{existingCoverImage.name}</p>
                                        <p className="text-[10px] text-slate-400">ขนาด: {(existingCoverImage.size / 1024).toFixed(2)} KB</p>
                                    </div>
                                </div>
                                <a
                                    href={getStrapiMedia(existingCoverImage.url) || undefined}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-500 hover:text-primary transition-colors"
                                >
                                    เปิดดูรูป <ExternalLink size={12} />
                                </a>
                            </div>
                        )}

                        <div
                            className={`relative border-2 border-dashed rounded-2xl p-8 transition-all flex flex-col items-center justify-center ${coverImageFile ? 'border-primary/50 bg-primary/5' : 'border-gray-200 hover:border-primary/40 bg-gray-50'}`}
                        >
                            {coverImageFile ? (
                                <div className="flex items-center gap-4 pointer-events-none w-full">
                                    <div className="w-16 h-20 bg-gray-200 rounded-xl overflow-hidden shadow-sm">
                                        <img src={URL.createObjectURL(coverImageFile)} alt="Cover preview" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-gray-800 truncate max-w-xs">{coverImageFile.name}</p>
                                        <p className="text-xs text-gray-500">{(coverImageFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setCoverImageFile(null)}
                                        className="p-2 hover:bg-gray-200 rounded-full text-gray-600 transition-colors relative z-10 pointer-events-auto"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center pointer-events-none">
                                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-gray-400 mb-3">
                                        <Upload size={24} />
                                    </div>
                                    <p className="text-sm font-bold text-gray-500">คลิกหรือลากรูปภาพมาวางเพื่อตั้งเป็น/เปลี่ยนปกหน้า</p>
                                    <p className="text-xs text-gray-400 mt-1">รูปใหม่จะไปแทนที่รูปเดิมทันทีที่บันทึก (แนวตั้งสัดส่วนคล้าย A4)</p>
                                </div>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                        setCoverImageFile(e.target.files[0]);
                                    }
                                }}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">ชื่อเอกสาร (Title)</label>
                            <input
                                required
                                name="title"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none transition-all font-bold text-lg"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">หมวดหมู่</label>
                                <select
                                    name="category"
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                >
                                    {dynamicCategories.length === 0 && <option value="">เลือกหมวดหมู่</option>}
                                    {dynamicCategories.map(cat => (
                                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">วันที่เผยแพร่</label>
                                <input
                                    type="datetime-local"
                                    name="publishedAt"
                                    value={formData.publishedAt}
                                    onChange={e => setFormData({ ...formData, publishedAt: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">รายละเอียด (Description)</label>
                            <RichTextEditor
                                value={formData.description || ""}
                                onChange={(value) => setFormData({ ...formData, description: value })}
                                placeholder="รายละเอียดเกี่ยวกับเอกสาร..."
                            />
                        </div>
                    </div>
                </div>

                {/* Footer Action Bar */}
                <div className="fixed bottom-0 left-0 md:left-72 right-0 p-6 bg-white/80 backdrop-blur-md border-t border-gray-200 flex justify-end gap-4 z-40">
                    <Link href={`/admin/documents?site=${siteParam}`} className="px-6 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors">
                        ยกเลิก
                    </Link>
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-10 py-3 bg-primary text-white font-bold rounded-xl shadow-premium hover:bg-accent transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                        บันทึกการแก้ไข
                    </button>
                </div>
            </form >
        </div >
    );
}
