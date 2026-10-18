export async function dataRequest(path: string, init?: RequestInit) {
  let response: Response;
  try {
    response = await fetch(`/api/v1/data${path}`, {
      ...init,
      cache: "no-store",
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new Error("Chưa kết nối được dữ liệu. Kiểm tra mạng và thử lại.");
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? "Chưa kết nối được dữ liệu. Hãy thử lại.");
  }
  return response;
}
export interface DataStatus {
  empty: boolean;
  ownerId: string;
  maxBytes: number;
  importReady: boolean;
}
