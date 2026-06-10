import { API_URL, TOKEN_KEY } from "@/lib/config";

export async function apiRequest<T = unknown>(
    endpoint: string,
    options: RequestInit = {},
): Promise<T> {
    const token =
        typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
    const url = `${API_URL}${endpoint}`;

    const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });

    const rawBody = await response.text();
    let data: unknown = null;
    if (rawBody) {
        try {
            data = JSON.parse(rawBody);
        } catch {
            data = rawBody;
        }
    }

    if (response.status === 401 && typeof window !== "undefined") {
        localStorage.removeItem(TOKEN_KEY);
        window.location.href = "/";
    }

    if (!response.ok) {
        const message =
            typeof data === "object" && data
                ? String(
                    (data as { message?: unknown }).message ||
                    (data as { error?: unknown }).error ||
                    `Request failed (${response.status})`,
                )
                : `Request failed (${response.status})`;
        throw new Error(message);
    }

    return data as T;
}
