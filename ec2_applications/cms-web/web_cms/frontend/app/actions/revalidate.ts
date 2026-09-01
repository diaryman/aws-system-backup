"use server";

import { revalidatePath, revalidateTag } from "next/cache";

export async function revalidateSiteConfig() {
    revalidatePath("/", "layout"); // Revalidate all paths
    // @ts-ignore
    revalidateTag("strapi-data"); // Clear explicit API fetch cache
    return { success: true };
}
