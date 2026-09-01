"use client";

import Swal from "sweetalert2";
import { useState, useEffect, use, Suspense } from "react";
import { uploadFile } from "@/app/actions/upload";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchAPI, getStrapiMedia } from "@/lib/api";
import { Save, Loader2, ArrowLeft, Image as ImageIcon, Link as LinkIcon, Type, AlignLeft, Plus, Crop } from "lucide-react";
import Link from "next/link";
import ImageCropperModal from "@/components/ImageCropperModal";

export default function EditHeroSlidePage({ params }: { params: Promise<{ id: string }> }) {
    const unwrappedParams = use(params);
    return (
        <Suspense fallback={<div className="flex justify-center p-20"><Loader2 className="animate-spin" /></div>}>
            <EditHeroSlideForm id={unwrappedParams.id} />
        </Suspense>
    );
}

function EditHeroSlideForm({ id }: { id: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const siteParam = searchParams.get("site") || "main";
    const targetDomain = siteParam === "pdpa" ? "pdpa.localhost" : "localhost";

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [existingImage, setExistingImage] = useState<string | null>(null);
    const [uploadMode, setUploadMode] = useState<"file" | "url">("file");
    const [imageUrlInput, setImageUrlInput] = useState("");
    const [fetchingUrl, setFetchingUrl] = useState(false);

    // Cropper State
    const [cropSourceUrl, setCropSourceUrl] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        title: "",
        subtitle: "",
        buttonText: "อ่านเพิ่มเติม",
        buttonLink: "/",
        isActive: true,
        displayOrder: 1,
    });

    useEffect(() => {
        const loadSlide = async () => {
            try {
                const res = await fetchAPI(`/hero-slides/${id}`, {
                    populate: ["image"],
                    _t: Date.now()
                });

                const slide = res.data;
                setFormData({
                    title: slide.title || "",
                    subtitle: slide.subtitle || "",
                    buttonText: slide.buttonText || "อ่านเพิ่มเติม",
                    buttonLink: slide.buttonLink || "/",
                    isActive: slide.isActive ?? true,
                    displayOrder: slide.displayOrder ?? 1,
                });

                if (slide.image?.url) {
                    setExistingImage(getStrapiMedia(slide.image.url));
                }
            } catch (error: any) {
                console.error("Error loading slide", error);
                Swal.fire({
                    icon: "error",
                    title: "ไม่พบข้อมูล",
                    text: "ไม่พบแบนเนอร์นี้ในระบบ อาจถูกลบไปแล้ว"
                }).then(() => {
                    router.push(`/admin/hero-slides?site=${siteParam}`);
                });
            } finally {
                setLoading(false);
            }
        };
        loadSlide();
    }, [id, siteParam, router]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const url = URL.createObjectURL(file);
            setCropSourceUrl(url); // Trigger crop modal
        }
    };

    const handleCropComplete = (croppedFile: File) => {
        setImageFile(croppedFile);
        setPreviewUrl(URL.createObjectURL(croppedFile));
        setCropSourceUrl(null); // Close crop modal
    };

    const handleUrlFetch = async () => {
        if (!imageUrlInput) return;
        setFetchingUrl(true);
        try {
            const response = await fetch(imageUrlInput);
            if (!response.ok) throw new Error("ไม่สามารถดาวน์โหลดรูปภาพจาก URL นี้ได้");
            const blob = await response.blob();
            // get filename from url or use default
            const urlObj = new URL(imageUrlInput);
            const pathname = urlObj.pathname;
            const filename = pathname.substring(pathname.lastIndexOf('/') + 1) || 'image.jpg';

            const file = new File([blob], filename, { type: blob.type });
            const url = URL.createObjectURL(file);
            setCropSourceUrl(url); // Trigger crop modal via URL

            setUploadMode("file"); // switch back to preview mode
            setImageUrlInput(""); // clear input
        } catch (error: any) {
            console.error("URL fetch error", error);
            Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: error.message || "เกิดข้อผิดพลาดในการดึงรูปภาพ" });
        } finally {
            setFetchingUrl(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setSaving(true);
        try {
            let imageId = undefined;
            // 1. Upload image using Server Action if a new file is selected
            if (imageFile) {
                const imageFormData = new FormData();
                imageFormData.append("files", imageFile);

                const uploadedFiles = await uploadFile(imageFormData);

                if (!Array.isArray(uploadedFiles) || uploadedFiles.length === 0) {
                    throw new Error("No file returned from upload");
                }

                imageId = uploadedFiles[0].id;
            }

            // 2. Update Hero Slide
            const payload: any = {
                data: {
                    ...formData,
                    domain: targetDomain,
                }
            };
            if (imageId) {
                payload.data.image = imageId;
            }

            await fetchAPI(`/hero-slides/${id}`, {}, {
                method: "PUT",
                body: JSON.stringify(payload)
            });

            Swal.fire({ icon: "success", title: "สำเร็จ", text: "บันทึกการแก้ไขแล้ว", timer: 1500, showConfirmButton: false });
            router.push(`/admin/hero-slides?site=${siteParam}`);
        } catch (error: any) {
            console.error("Save failed", error);
            Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: error.message || "เกิดข้อผิดพลาดในการบันทึก" });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-32">
            <div className="flex items-center gap-4">
                <Link
                    href={`/admin/hero-slides?site=${siteParam}`}
                    className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-500 hover:text-primary transition-colors shadow-sm"
                >
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-3xl font-black text-primary font-heading">แก้ไขสไลด์</h1>
                    <p className="text-gray-500">ปรับปรุงข้อมูลแบนเนอร์</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-sans">
                {/* Left: Metadata Form */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm space-y-6">
                        <div className="space-y-4">
                            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                <Type size={16} className="text-gray-400" /> หัวข้อหลัก (Title)
                            </label>
                            <input
                                required
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary/20 outline-none font-bold text-lg"
                                placeholder="หัวข้อที่จะปรากฏบนสไลด์..."
                            />
                        </div>

                        <div className="space-y-4">
                            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                <AlignLeft size={16} className="text-gray-400" /> คำอธิบายสั้นๆ (Subtitle)
                            </label>
                            <textarea
                                value={formData.subtitle}
                                onChange={e => setFormData({ ...formData, subtitle: e.target.value })}
                                rows={3}
                                className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary/20 outline-none"
                                placeholder="รายละเอียดเพิ่มเติม..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                    <ImageIcon size={16} className="text-gray-400" /> ข้อความบนปุ่ม
                                </label>
                                <input
                                    value={formData.buttonText}
                                    onChange={e => setFormData({ ...formData, buttonText: e.target.value })}
                                    className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                                />
                            </div>
                            <div className="space-y-4">
                                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                    <LinkIcon size={16} className="text-gray-400" /> ลิงก์ปลายทาง
                                </label>
                                <input
                                    value={formData.buttonLink}
                                    onChange={e => setFormData({ ...formData, buttonLink: e.target.value })}
                                    className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Media & Status */}
                <div className="space-y-6">
                    <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h4 className="text-sm font-bold text-primary uppercase tracking-widest">รูปภาพสไลด์</h4>
                            <div className="flex bg-gray-100 p-1 rounded-xl">
                                <button
                                    type="button"
                                    onClick={() => setUploadMode("file")}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${uploadMode === "file" ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-primary"}`}
                                >
                                    อัปโหลดไฟล์
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setUploadMode("url")}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${uploadMode === "url" ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-primary"}`}
                                >
                                    ใช้ URL
                                </button>
                            </div>
                        </div>

                        {uploadMode === "url" ? (
                            <div className="space-y-4">
                                <div className="flex gap-2">
                                    <input
                                        type="url"
                                        placeholder="วาง URL ของรูปภาพที่นี่..."
                                        value={imageUrlInput}
                                        onChange={e => setImageUrlInput(e.target.value)}
                                        className="flex-1 px-4 py-3 bg-gray-50 rounded-xl border-none outline-none text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleUrlFetch}
                                        disabled={fetchingUrl || !imageUrlInput}
                                        className="px-6 py-3 bg-primary text-white text-sm font-bold rounded-xl hover:bg-accent transition-all disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {fetchingUrl ? <Loader2 size={16} className="animate-spin" /> : "ดึงรูป"}
                                    </button>
                                </div>
                                {(previewUrl || existingImage) && (
                                    <div className="text-center">
                                        <p className="text-xs text-gray-500 mb-2">รูปที่เลือกปัจจุบัน:</p>
                                        <img src={previewUrl || existingImage || ""} className="w-full h-32 object-cover rounded-xl" alt="Current" />
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div
                                className={`relative aspect-[21/9] rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center overflow-hidden bg-gray-50 ${(previewUrl || existingImage) ? 'border-transparent' : 'border-gray-200 hover:border-primary/40'}`}
                            >
                                {(previewUrl || existingImage) ? (
                                    <>
                                        <img src={previewUrl || existingImage || ""} className="w-full h-full object-cover" alt="Preview" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none text-white font-bold text-xs">
                                            คลิกเพื่อเปลี่ยนรูป
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center p-6">
                                        <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-gray-400 mx-auto mb-3">
                                            <Plus size={24} />
                                        </div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed">ลากวาง หรือ<br />คลิกอัปโหลด</p>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                            </div>
                        )}
                    </div>

                    <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm space-y-6">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-gray-700">สถานะการแสดงผล</span>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                                className={`w-12 h-6 rounded-full transition-all relative ${formData.isActive ? 'bg-primary' : 'bg-gray-200'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.isActive ? 'right-1' : 'left-1'}`}></div>
                            </button>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">ลำดับการแสดง</label>
                            <input
                                type="number"
                                value={formData.displayOrder}
                                onChange={e => setFormData({ ...formData, displayOrder: parseInt(e.target.value) })}
                                className="w-full px-4 py-3 bg-gray-50 rounded-xl border-none outline-none font-bold text-center"
                            />
                        </div>
                    </div>
                </div>

                {/* Footer Action Bar */}
                <div className="fixed bottom-0 left-0 md:left-72 right-0 p-6 bg-white/80 backdrop-blur-md border-t border-gray-200 flex justify-end gap-4 z-40">
                    <Link
                        href={`/admin/hero-slides?site=${siteParam}`}
                        className="px-6 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                    >
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
            </form>

            {cropSourceUrl && (
                <ImageCropperModal
                    imageUrl={cropSourceUrl}
                    aspectRatio={21 / 9} // Hero banner is usually ultra-wide, e.g., 21:9 or 16:6
                    onCropComplete={handleCropComplete}
                    onClose={() => setCropSourceUrl(null)}
                />
            )}
        </div>
    );
}
