// Falls back to a relative path (same-origin) when unset.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

// Next.js auto-prefixes basePath for things it renders itself, like <Link>
// — but NOT for next/image's `src`, and obviously not for raw fetch() URLs
// either (both need it prepended by hand). Confirmed live (2026-08-10):
// next/image without this returned 400 "isn't a valid image" in production,
// because the optimizer's `url` param pointed at a path that only exists
// under the basePath. See https://nextjs.org/docs/app/api-reference/config/next-config-js/basePath#images
export const withBasePath = (path: string) =>
  path.startsWith("/") ? `${basePath}${path}` : path;

// Used by client components to build a URL to *this* app's own /api routes
// — NOT the merchant backend (that's MERCHANT_BACKEND, called server-side
// only by api() below). Only set NEXT_PUBLIC_API_URL if the frontend and
// this app's own /api/* routes are deployed to different origins; leave it
// unset (the common case, including local dev) to call them same-origin.
export const apiUrl = (path: string) => {
  if (API_BASE_URL) return `${API_BASE_URL}${path}`;
  return withBasePath(path);
};

interface ApiRequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

// Confirmed (2026-08-10, against a live backend) envelope:
// { statusCode, status: "success" | "error", message, data: {...} }.
// `statusCode`/`status`/`message` are always top-level; the actual payload
// on success is nested under `data` — callers must reach into `.data` for
// individual fields (see app/api/otp/request/route.ts), not read them off
// the top level directly.
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
