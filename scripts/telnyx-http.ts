const API = "https://api.telnyx.com/v2";
const KEY = process.env.TELNYX_API_KEY;
if (!KEY) throw new Error("TELNYX_API_KEY missing");

export async function telnyxRequest<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${KEY}`,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${method} ${path} ${res.status}: ${text}`);
  }
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

export const telnyx = {
  get: <T>(path: string) => telnyxRequest<T>("GET", path),
  post: <T>(path: string, body: unknown) => telnyxRequest<T>("POST", path, body),
  patch: <T>(path: string, body: unknown) => telnyxRequest<T>("PATCH", path, body),
  delete: <T>(path: string) => telnyxRequest<T>("DELETE", path),
};
