"use server";

import { cookies } from "next/headers";

const SITE_SECRETS = {
    main: "Admin1234",
    pdpa: "PDPA1234"
};

const EDITOR_SECRETS = {
    main: "Editor1234",
    pdpa: "PDPAEditor"
};

export async function loginAction(site: string, username: string, password: string) {
    const cookieStore = await cookies();
    const expectedAdminPass = SITE_SECRETS[site as keyof typeof SITE_SECRETS] || "Admin1234";
    const expectedEditorPass = EDITOR_SECRETS[site as keyof typeof EDITOR_SECRETS] || "Editor1234";

    let role = null;

    if (username === "admin" && password === expectedAdminPass) {
        role = "SUPER_ADMIN";
    } else if (username === "editor" && password === expectedEditorPass) {
        role = "EDITOR";
    }

    if (role) {
        // Store auth and role together as JSON
        const sessionData = { auth: true, role, username };
        cookieStore.set(`admin_session_${site}`, JSON.stringify(sessionData), {
            httpOnly: true,
            secure: false, // Set to false to allow login over HTTP. Enable when HTTPS is ready config.
            path: "/admin",
            maxAge: 60 * 60 * 24 // 1 day
        });
        return { success: true, role };
    }

    return { success: false, error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" };
}

export async function checkAuthAction(site: string) {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(`admin_session_${site}`)?.value;

    if (!sessionCookie) {
        // Fallback for previous authentication method just in case
        const auth = cookieStore.get(`admin_auth_${site}`)?.value;
        if (auth === "true") {
            return { isAuthorized: true, role: "SUPER_ADMIN", username: "admin" };
        }
        return { isAuthorized: false, role: null, username: null };
    }

    try {
        const session = JSON.parse(sessionCookie);
        return {
            isAuthorized: session.auth === true,
            role: session.role,
            username: session.username
        };
    } catch {
        return { isAuthorized: false, role: null, username: null };
    }
}

export async function logoutAction(site: string) {
    const cookieStore = await cookies();
    cookieStore.delete({
        name: `admin_session_${site}`,
        path: "/admin"
    });
    // Clean up old cookie format as well
    cookieStore.delete({
        name: `admin_auth_${site}`,
        path: "/admin"
    });
    return { success: true };
}
