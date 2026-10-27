import { jsonBody, requestJSON } from "@/lib/http-client";
export class FundAPIError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
    public fieldErrors?: Record<string, string>,
  ) {
    super(message);
  }
}
export async function fundsJSON<T>(path = "", body?: unknown): Promise<T> {
  return requestJSON<T>(`/api/v1/funds${path}`, () => jsonBody(body), {
    network:
      "Mất kết nối. Nội dung đang nhập được giữ; hãy thử lại khi có mạng.",
    invalidResponse: "Phản hồi chưa hợp lệ. Hãy thử lại.",
    fallback: "Không thể truy cập Quỹ an toàn.",
    fallbackCode: "REQUEST_FAILED",
    error: (message, code, status, fields) =>
      new FundAPIError(message, code, status ?? 0, fields),
  });
}
