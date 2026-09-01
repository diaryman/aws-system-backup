"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getStrapiMedia } from "@/lib/api";

interface HeroSlide {
    id: number;
    title: string;
    subtitle: string;
    buttonText: string;
    buttonLink: string;
    image?: {
        url: string;
    };
}

interface HeroProps {
    headline?: string;
    subHeadline?: string;
    heroStats?: { value: string; label: string; sublabel: string }[];
    slides?: HeroSlide[];
}

export default function Hero({ headline, subHeadline, heroStats, slides = [] }: HeroProps) {
    const [currentSlide, setCurrentSlide] = useState(0);
    const hasSlides = slides && slides.length > 0;

    // Auto-slide logic
    useEffect(() => {
        if (!hasSlides) return;
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % slides.length);
        }, 8000);
        return () => clearInterval(timer);
    }, [hasSlides, slides.length]);

    const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
    const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);

    if (hasSlides) {
        return (
            <section className="relative h-[85vh] min-h-[600px] w-full overflow-hidden bg-primary">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentSlide}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1 }}
                        className="absolute inset-0"
                    >
                        {/* Background Image */}
                        <div className="absolute inset-0 z-0">
                            {slides[currentSlide].image && (
                                <Image
                                    src={getStrapiMedia(slides[currentSlide].image.url) || ""}
                                    alt={slides[currentSlide].title}
                                    fill
                                    priority={currentSlide === 0}
                                    sizes="100vw"
                                    className="object-cover"
                                />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/60 to-transparent z-10" />
                            <div className="absolute inset-0 bg-gradient-to-t from-primary via-transparent to-transparent z-10" />
                        </div>

                        {/* Content */}
                        <div className="relative z-20 h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center">
                            <div className="max-w-2xl">
                                <motion.div
                                    initial={{ opacity: 0, x: -30 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3, duration: 0.6 }}
                                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/20 backdrop-blur-md border border-primary/30 text-white text-xs font-bold mb-6 tracking-widest uppercase"
                                >
                                    <Sparkles size={14} className="text-accent" />
                                    <span>สำนักงานศาลปกครอง • Administrative Court</span>
                                </motion.div>

                                <motion.h1
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4, duration: 0.8 }}
                                    className="text-5xl md:text-7xl font-black text-white font-heading leading-[1.1] mb-6 tracking-tighter"
                                >
                                    {slides[currentSlide].title}
                                </motion.h1>

                                <motion.p
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5, duration: 0.8 }}
                                    className="text-lg md:text-xl text-slate-300 mb-10 leading-relaxed font-medium"
                                >
                                    {slides[currentSlide].subtitle}
                                </motion.p>

                                <motion.div
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.6, duration: 0.8 }}
                                    className="flex flex-wrap gap-4"
                                >
                                    <Link
                                        href={slides[currentSlide].buttonLink}
                                        className="group px-8 py-4 bg-primary text-white font-bold rounded-2xl shadow-xl shadow-primary/25 hover:bg-accent transition-all active:scale-95 flex items-center gap-2 premium-gradient"
                                    >
                                        {slides[currentSlide].buttonText} <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                    </Link>
                                </motion.div>
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>

                {/* Navigation Controls */}
                <div className="absolute bottom-12 right-12 z-30 flex items-center gap-4">
                    <div className="flex gap-2">
                        {slides.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentSlide(idx)}
                                className={`h-1.5 transition-all duration-300 rounded-full ${currentSlide === idx ? 'w-8 bg-primary' : 'w-2 bg-white/20 hover:bg-white/40'}`}
                            />
                        ))}
                    </div>
                    <div className="flex gap-2 ml-4">
                        <button
                            onClick={prevSlide}
                            className="w-12 h-12 rounded-full border border-white/20 bg-white/5 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/10 transition-all active:scale-90"
                        >
                            <ChevronLeft size={24} />
                        </button>
                        <button
                            onClick={nextSlide}
                            className="w-12 h-12 rounded-full border border-white/20 bg-white/5 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/10 transition-all active:scale-90"
                        >
                            <ChevronRight size={24} />
                        </button>
                    </div>
                </div>

                {/* Animated scroll indicator */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 opacity-40">
                    <motion.div
                        animate={{ y: [0, 10, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="w-5 h-8 rounded-full border-2 border-white flex justify-center p-1"
                    >
                        <div className="w-1 h-2 bg-white rounded-full" />
                    </motion.div>
                </div>
            </section>
        );
    }

    // Default static fallback (Original Design enhanced)
    return (
        <section className="relative pt-32 pb-24 lg:pt-48 lg:pb-40 overflow-hidden bg-white">
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <motion.div
                    animate={{ x: [0, 100, 0], y: [0, 50, 0], scale: [1, 1.1, 1] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full blur-[120px] bg-primary/5"
                />
                <motion.div
                    animate={{ x: [0, -80, 0], y: [0, 100, 0], scale: [1, 1.2, 1] }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                    className="absolute top-[20%] -right-[5%] w-[35%] h-[35%] rounded-full blur-[100px] bg-accent/5"
                />
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-50 border border-gray-100 text-sm font-semibold mb-8 shadow-sm text-primary"
                >
                    <Sparkles size={16} className="text-accent" />
                    <span>Data Governance Framework 2.0</span>
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="text-5xl md:text-7xl font-black font-heading tracking-tight mb-8 text-slate-900 leading-tight"
                >
                    {headline || <>ยกระดับ <span className="text-primary">ธรรมาภิบาลข้อมูล</span> <br />สู่มาตรฐานสากล</>}
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="text-xl text-slate-500 mb-10 leading-relaxed max-w-2xl mx-auto font-medium"
                >
                    {subHeadline || "ขับเคลื่อนองค์กรด้วยข้อมูลที่มีคุณภาพ โปร่งใส และปลอดภัย เพื่อการตัดสินใจที่แม่นยำและการบริการประชาชนที่มีประสิทธิภาพสูงสุด"}
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20"
                >
                    <Link
                        href="/news?site=main"
                        className="group relative px-8 py-4 bg-primary text-white font-bold rounded-2xl shadow-premium hover:bg-accent transition-all duration-300 active:scale-95 flex items-center gap-2 premium-gradient"
                    >
                        เริ่มต้นใช้งาน <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                    <Link
                        href="#policy"
                        className="px-8 py-4 bg-white border border-gray-200 text-slate-700 font-bold rounded-2xl hover:bg-gray-50 transition-all active:scale-95"
                    >
                        ศึกษาหลักเกณฑ์
                    </Link>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {(heroStats || [
                        { value: "1,200+", label: "DATA ASSETS", sublabel: "ชุดข้อมูลในระบบ" },
                        { value: "100%", label: "COMPLIANCE", sublabel: "ผ่านมาตรฐาน" },
                        { value: "99.9%", label: "DATA ACCURACY", sublabel: "ความแม่นยำข้อมูล" },
                        { value: "Level 4", label: "SECURITY", sublabel: "ISO 27001 Certified" }
                    ]).map((item, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.4 + (idx * 0.1) }}
                            whileHover={{ y: -8 }}
                            className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-premium flex flex-col items-center text-center group"
                        >
                            <div className="text-3xl font-black text-primary mb-1 group-hover:scale-110 transition-transform tracking-tighter">
                                {item.value}
                            </div>
                            <h3 className="text-[10px] font-black uppercase tracking-widest mb-2 text-slate-400">{item.label}</h3>
                            <p className="text-xs font-bold text-slate-600 uppercase tracking-tight line-clamp-1">{item.sublabel}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
