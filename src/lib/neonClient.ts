type ApiResponse<T = unknown> = { data: T };

type ApiClient = {
  get: <T = unknown>(url: string) => Promise<ApiResponse<T>>;
  post: <T = unknown>(url: string, body?: unknown) => Promise<ApiResponse<T>>;
  put: <T = unknown>(url: string, body?: unknown) => Promise<ApiResponse<T>>;
  delete: <T = unknown>(url: string) => Promise<ApiResponse<T>>;
};

const SESSION_KEY = "kgga-lms-session";

async function request<T>(method: "GET" | "POST" | "PUT" | "DELETE", url: string, body?: unknown): Promise<ApiResponse<T>> {
  const token = window.localStorage.getItem(SESSION_KEY);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error: any = new Error(data.error || "Request failed.");
    error.response = { data };
    throw error;
  }
  return { data: data as T };
}

export const auth = {
  isSignedIn: () => Boolean(window.localStorage.getItem(SESSION_KEY)),
  async signIn(identifier?: string, password?: string) {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      window.localStorage.removeItem(SESSION_KEY);
      const error: any = new Error(result.error || "Invalid email or password.");
      error.response = { data: result };
      throw error;
    }
    window.localStorage.setItem(SESSION_KEY, result.token);
    return { profile: result.profile };
  },
  async signOut() {
    window.localStorage.removeItem(SESSION_KEY);
  },
};

export const api: ApiClient = {
  get: <T = unknown>(url: string) => request<T>("GET", url),
  post: <T = unknown>(url: string, body?: unknown) => request<T>("POST", url === "/api/me/role" ? "/api/auth/register" : url, body),
  put: <T = unknown>(url: string, body?: unknown) => request<T>(url.endsWith("/suspend") ? "POST" : "PUT", url, body),
  delete: <T = unknown>(url: string) => request<T>("DELETE", url),
};