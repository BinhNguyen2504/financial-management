import { jsonBody, requestJSON, downloadFile } from "@/lib/http-client";
export class SavingsAPIError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
    public fieldErrors?: Record<string, string>,
  ) {
    super(message);
  }
}
export async function savingsJSON<T>(path: string, body?: unknown): Promise<T> {
  return requestJSON<T>(`/api/v1/savings${path}`, () => jsonBody(body), {
    network:
      "Mất kết nối. Nội dung đang nhập được giữ; hãy thử lại khi có mạng.",
    invalidResponse: "Phản hồi chưa hợp lệ. Hãy thử lại.",
    fallback: "Không thể tải dữ liệu.",
    fallbackCode: "REQUEST_FAILED",
    error: (message, code, status, fields) =>
      new SavingsAPIError(message, code, status ?? 0, fields),
  });
}

export async function downloadSavings(path: string, filename: string) {
  return downloadFile(`/api/v1/savings${path}`, filename);
}
