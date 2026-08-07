// Falls back to a relative path (same-origin) when unset.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

// Used by client components to build a URL to *this* app's own /api routes.
export const apiUrl = (path: string) => {
  // Local dev: NEXT_PUBLIC_API_URL points at the dev server directly
  if (API_BASE_URL) return `${API_BASE_URL}${path}`;
  // Production with basePath: prepend basePath for internal routes
  return path.startsWith("/") ? `${basePath}${path}` : path;
};

interface ApiRequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

// TODO: this shape (flat, keyed straight off the parsed JSON body) is
// inferred from how the otp route handlers use it — it has not been
// confirmed against the real merchant backend's response envelope.
export interface ApiResponse {
  status?: string;
  statusCode?: number;
  message?: string;
  data?: unknown;
  [key: string]: unknown;
}

// Used by /api route handlers (server-side) to call the merchant backend
// (MERCHANT_BACKEND). Never throws on a non-2xx response — callers should
// check `statusCode`/`status` on the returned value, same as a network
// error is reported through that same shape instead of a rejected promise.
export const api = async (
  url: string,
  { method = "GET", body, headers }: ApiRequestOptions = {}
): Promise<ApiResponse> => {
  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const data = await response.json().catch(() => ({}));
    return { ...data, statusCode: data?.statusCode ?? response.status };
  } catch (error) {
    return {
      status: "error",
      statusCode: 500,
      message: error instanceof Error ? error.message : "Network error",
    };
  }
};
