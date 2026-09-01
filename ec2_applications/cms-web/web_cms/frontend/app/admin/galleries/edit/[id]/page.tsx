"use client";

import Swal from "sweetalert2";
import { useState, useEffect, use, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { fetchAPI, getStrapiMedia } from "@/lib/api";
import { Save, ArrowLeft, Image as ImageIcon, X, Plus, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { uploadFile } from "@/app/actions/upload";

export default function EditGalleryPage({ params }: { params: Promise<{ id: string }> }) {
    const unwrappedParams = use(params);
    return (
        <Suspense fallback={<div className="flex justify-center p-20"><Loader2 className="animate-spin" /></div>}>
            <GalleryEditForm id={unwrappedParams.id} />
        </Suspense>
    );
}

function GalleryEditForm({ id }: { id: string }) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const siteParam = searchParams.get("site") || "main";

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [existingImages, setExistingImages] = useState<any[]>([]);
    const [newFiles, setNewFiles] = useState<File[]>([]);
    const [newPreviews, setNewPreviews] = useState<string[]>([]);

    useEffect(() => {
        const loadGallery = async () => {
            try {
                const res = await fetchAPI(`/galleries/${id}`, { populate: ["images"] });
                const gallery = res.data;
                setTitle(gallery.title || "");
                setDescription(gallery.description || "");
                setExistingImages(gallery.images || []);
            } catch (error) {
                console.error("Failed to load gallery", error);
                Swal.fire({ title: "แจ้งเตือน", text: "ไม่พบข้อมูลแกลเลอรี่" });
                router.push(`/admin/galleries?site=${siteParam}`);
            } finally {
                setLoading(false);
            }
        };
        loadGallery();
    }, [id]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setNewFiles(prev => [...prev, ...files]);
            const previews = files.map(file => URL.createObjectURL(file));
            setNewPreviews(prev => [...prev, ...previews]);
        }
    };

    const removeExistingImage = (imageId: number) => {
        setExistingImages(prev => prev.filter(img => img.id !== imageId));
    };

    const removeNewFile = (index: number) => {
        setNewFiles(prev => prev.filter((_, i) => i !== index));
        setNewPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            // 1. Upload new images
            const newImageIds = [];
            for (const file of newFiles) {
                const formData = new FormData();
                formData.append("files", file);
                const uploaded = await uploadFile(formData);
                if (uploaded && uploaded.length > 0) {
                    newImageIds.push(uploaded[0].id);
                }
            }

            // 2. Combine with remaining existing images
            const allImageIds = [...existingImages.map(img => img.id), ...newImageIds];

            // 3. Update Gallery
            await fetchAPI(`/galleries/${id}`, {}, {
                method: "PUT",
                body: JSON.stringify({
                    data: {
                        title,
                        description,
                        images: allImageIds
                    }
                })
            });

            Swal.fire({ icon: "success", title: "สำเร็จ", text: "บันทึกการแก้ไขแกลเลอรี่สำเร็จ", timer: 1500, showConfirmButton: false });
            router.push(`/admin/galleries?site=${siteParam}`);
        } catch (error) {
            console.error("Failed to update gallery", error);
            Swal.fire({ icon: "error", title: "แจ้งเตือน", text: "เกิดข้อผิดพลาดในการบันทึก" });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary" size={40} /></div>;

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
                <Link href={`/admin/galleries?site=${siteParam}`} className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-primary transition-all shadow-sm">
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-2xl font-black text-primary font-heading">แก้ไขแกลเลอรี่</h1>
                    <p className="text-xs text-gray-400 font-medium">จัดการชุดรูปภาพในอัลบั้มของคุณ</p>
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
                            className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary/20 outline-none font-bold text-lg transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-black text-primary uppercase tracking-widest mb-3">คำอธิบายเพิ่มเติม</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary/20 outline-none font-medium transition-all h-32 resize-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-black text-primary uppercase tracking-widest mb-3">รูปภาพในอัลบั้ม ({existingImages.length + newFiles.length} รูป)</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {/* Existing Images */}
                            {existingImages.map((img) => (
                                <div key={img.id} className="aspect-square rounded-2xl overflow-hidden relative group border-2 border-gray-50">
                                    <img src={getStrapiMedia(img.url) || ""} className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => removeExistingImage(img.id)}
                                        className="absolute top-2 right-2 w-8 h-8 bg-black/50 backdrop-blur text-white rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                            {/* New Previews */}
                            {newPreviews.map((url, index) => (
                                <div key={`new-${index}`} className="aspect-square rounded-2xl overflow-hidden relative group border-2 border-primary/20">
                                    <img src={url} className="w-full h-full object-cover" />
                                    <div className="absolute top-2 left-2 bg-primary text-white text-[8px] font-bold px-2 py-1 rounded-lg">NEW</div>
                                    <button
                                        type="button"
                                        onClick={() => removeNewFile(index)}
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
                        disabled={saving}
                        className="px-10 py-4 bg-primary text-white rounded-2xl font-black text-sm flex items-center gap-3 shadow-premium hover:bg-accent disabled:opacity-50 transition-all active:scale-95"
                    >
                        {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                        บันทึกการแก้ไข
                    </button>
                </div>
            </form>
        </div>
    );
}
