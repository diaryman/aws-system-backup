import { Loader2 } from "lucide-react";

export default function Loading() {
    return (
        <div className="min-h-screen flex flex-col pt-32 pb-16">
            {/* Hero Skeleton */}
            <div className="w-full max-w-[1440px] mx-auto px-4 lg:px-8 mb-16">
                <div className="w-full h-[400px] lg:h-[500px] rounded-[2.5rem] bg-gray-100 dark:bg-gray-800 animate-pulse flex flex-col items-center justify-center p-8">
                    <Loader2 size={48} className="text-gray-300 dark:text-gray-600 animate-spin mb-6" />
                    <div className="h-10 w-3/4 max-w-2xl bg-gray-200 dark:bg-gray-700 rounded-full mb-4"></div>
                    <div className="h-6 w-1/2 max-w-md bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                </div>
            </div>

            {/* Content Section Skeleton */}
            <div className="w-full max-w-[1440px] mx-auto px-4 lg:px-8">
                <div className="flex items-center justify-between mb-8">
                    <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse"></div>
                    <div className="h-8 w-24 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Card Skeletons */}
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="rounded-3xl border border-gray-100 dark:border-white/10 overflow-hidden bg-white dark:bg-gray-900/50 flex flex-col animate-pulse shadow-sm">
                            <div className="h-48 bg-gray-100 dark:bg-gray-800 w-full"></div>
                            <div className="p-6 flex flex-col gap-3">
                                <div className="h-4 w-1/3 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                                <div className="h-6 w-full bg-gray-200 dark:bg-gray-700 rounded-full mt-2"></div>
                                <div className="h-6 w-5/6 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                                <div className="h-4 w-full bg-gray-100 dark:bg-gray-800 rounded-full mt-4"></div>
                                <div className="h-4 w-2/3 bg-gray-100 dark:bg-gray-800 rounded-full"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
