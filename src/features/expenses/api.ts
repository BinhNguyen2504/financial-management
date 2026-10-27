import { requestJSON } from "@/lib/http-client";
export class RequestError extends Error {
  constructor(
    message: string,
    public code: string,
    public fieldErrors?: Record<string, string>,
    public status?: number,
  ) {
    super(message);
  }
}
export async function apiJSON<T>(path: string, init?: RequestInit): Promise<T> {
  return requestJSON<T>(
    `/api/v1/expenses${path}`,
    {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    },
    {
      network:
        "Mất kết nối. Nội dung đang nhập được giữ lại; hãy thử lại khi có mạng.",
      invalidResponse:
        "Máy chủ chưa phản hồi dữ liệu hợp lệ. Vui lòng thử lại.",
      fallback: "Không thể tải dữ liệu.",
      fallbackCode: "UNKNOWN",
      omitInvalidResponseStatus: true,
      error: (message, code, status, fields) =>
        new RequestError(message, code, fields, status),
    },
  );
}
