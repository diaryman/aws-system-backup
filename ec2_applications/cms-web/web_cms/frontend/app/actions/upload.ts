"use server";

export async function uploadFile(formData: FormData) {
    const strapiUrl = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL || "http://127.0.0.1:1337";
    const token = process.env.STRAPI_API_TOKEN;

    if (!token) {
        throw new Error("Server configuration error: Missing STRAPI_API_TOKEN");
    }

    try {
        const response = await fetch(`${strapiUrl}/api/upload`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                // Content-Type is set automatically by fetch when body is FormData
            },
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Strapi Upload Failed:", errorText);
            throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Server Action Error:", error);
        throw error;
    }
}
