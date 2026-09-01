"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import { getStrapiMedia } from "@/lib/api";

interface GalleryProps {
    images: any[];
    layout?: "grid" | "slider";
}

const Gallery = ({ images: rawImages, layout = "grid" }: GalleryProps) => {
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    // Normalize images: Strapi 5 can return media in several formats depending on population
    const images = Array.isArray(rawImages)
        ? rawImages.map((img: any) => img.attributes ? { id: img.id, ...img.attributes } : img)
        : (rawImages as any)?.data
            ? (rawImages as any).data.map((img: any) => img.attributes ? { id: img.id, ...img.attributes } : img)
            : [];

    if (!images || images.length === 0) return null;

    const openLightbox = (index: number) => setSelectedIndex(index);
    const closeLightbox = () => setSelectedIndex(null);
    const nextImage = () => setSelectedIndex((prev) => (prev === null ? null : (prev + 1) % images.length));
    const prevImage = () => setSelectedIndex((prev) => (prev === null ? null : (prev - 1 + images.length) % images.length));

    return (
        <div className="my-10">
            {/* Grid Layout */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {images.map((img: any, index: number) => (
                    <motion.div
                        key={img.id || index}
                        layoutId={`img-${img.id || index}`}
                        onClick={() => openLightbox(index)}
                        whileHover={{ scale: 1.02, y: -5 }}
                        whileTap={{ scale: 0.98 }}
                        className="relative aspect-square cursor-pointer rounded-2xl overflow-hidden shadow-md group"
                        role="button"
                        aria-label={`ดูรูปที่ ${index + 1}: ${img.name || 'Gallery image'}`}
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && openLightbox(index)}
                    >
                        <img
                            src={getStrapiMedia(img.url) || ""}
                            alt={img.name || `Gallery image ${index + 1}`}
                            loading="lazy"
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <div className="bg-white/20 backdrop-blur-md p-3 rounded-full text-white">
                                <Maximize2 size={24} />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Lightbox */}
            <AnimatePresence>
                {selectedIndex !== null && (
                    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 md:p-10">
                        <motion.button
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={closeLightbox}
                            className="absolute top-6 right-6 z-50 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-all"
                        >
                            <X size={28} />
                        </motion.button>

                        <button
                            onClick={prevImage}
                            className="absolute left-4 md:left-10 z-50 p-4 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-all"
                            aria-label="รูปก่อนหน้า"
                        >
                            <ChevronLeft size={32} />
                        </button>

                        <button
                            onClick={nextImage}
                            className="absolute right-4 md:right-10 z-50 p-4 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-all"
                            aria-label="รูปถัดไป"
                        >
                            <ChevronRight size={32} />
                        </button>

                        <motion.div
                            layoutId={`img-${images[selectedIndex].id || selectedIndex}`}
                            className="relative max-w-5xl w-full rounded-3xl overflow-hidden shadow-2xl"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        >
                            <div className="relative aspect-video max-h-[80vh]">
                                <img
                                    src={getStrapiMedia(images[selectedIndex].url) || ""}
                                    alt={images[selectedIndex].name || `รูปที่ ${selectedIndex + 1}`}
                                    className="w-full h-full object-contain"
                                />
                            </div>
                            <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/60 to-transparent text-white">
                                <p className="text-center font-medium">รูปที่ {selectedIndex + 1} จาก {images.length}</p>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Gallery;
