import React, { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { X, Check } from "lucide-react";

interface ImageCropperModalProps {
    imageUrl: string;
    aspectRatio?: number;
    onCropComplete: (croppedFile: File) => void;
    onClose: () => void;
}

export default function ImageCropperModal({
    imageUrl,
    aspectRatio = 16 / 9,
    onCropComplete,
    onClose,
}: ImageCropperModalProps) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

    const onCropCompleteEvent = useCallback((croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const createImage = (url: string) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image();
            image.addEventListener("load", () => resolve(image));
            image.addEventListener("error", (error) => reject(error));
            image.setAttribute("crossOrigin", "anonymous"); // needed to avoid CORS issues
            image.src = url;
        });

    const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<File | null> => {
        const image = await createImage(imageSrc);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
            return null;
        }

        // set canvas size to match the bounding box
        canvas.width = image.width;
        canvas.height = image.height;

        // draw rotated image
        ctx.drawImage(image, 0, 0);

        const data = ctx.getImageData(
            pixelCrop.x,
            pixelCrop.y,
            pixelCrop.width,
            pixelCrop.height
        );

        // set canvas block to the cropped size and fill
        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;
        ctx.putImageData(data, 0, 0);

        return new Promise((resolve, reject) => {
            canvas.toBlob((file) => {
                if (file) {
                    const croppedFile = new File([file], "cropped_image.jpg", { type: "image/jpeg" });
                    resolve(croppedFile);
                } else {
                    reject(new Error("Canvas is empty"));
                }
            }, "image/jpeg", 0.9);
        });
    };

    const handleConfirm = async () => {
        try {
            const croppedImage = await getCroppedImg(imageUrl, croppedAreaPixels);
            if (croppedImage) {
                onCropComplete(croppedImage);
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl relative z-10 flex flex-col overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white z-20">
                    <div>
                        <h3 className="text-xl font-black text-primary font-heading tracking-tight">ตัดรูปภาพ (Crop Image)</h3>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">ปรับตำแหน่งการแสดงผลรูปภาพให้เหมาะสม</p>
                    </div>
                    <button onClick={onClose} className="p-3 bg-gray-50 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="relative w-full h-[50vh] bg-gray-900 overflow-hidden">
                    <Cropper
                        image={imageUrl}
                        crop={crop}
                        zoom={zoom}
                        aspect={aspectRatio}
                        onCropChange={setCrop}
                        onCropComplete={onCropCompleteEvent}
                        onZoomChange={setZoom}
                    />
                </div>

                <div className="p-6 bg-white flex flex-col items-center gap-6 z-20">
                    <div className="w-full max-w-md flex flex-col items-center gap-2">
                        <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest text-center">ซูมรูปภาพ (Zoom)</p>
                        <input
                            type="range"
                            value={zoom}
                            min={1}
                            max={3}
                            step={0.1}
                            aria-labelledby="Zoom"
                            onChange={(e) => {
                                setZoom(Number(e.target.value))
                            }}
                            className="w-full accent-primary"
                        />
                    </div>

                    <div className="flex gap-4 w-full justify-center">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-8 py-3 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all flex items-center gap-2"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirm}
                            className="px-8 py-3 bg-primary text-white font-bold rounded-2xl hover:bg-accent hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
                        >
                            <Check size={18} /> ยืนยันการตัดขอบ
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
