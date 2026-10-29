import { jsonBody, requestJSON } from "@/lib/http-client";
export class IncomeAPIError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
    public fieldErrors?: Record<string, string>,
  ) {
    super(message);
  }
}
export async function incomeJSON<T>(
  path: string,
  body?: unknown,
  dataGeneration = 0,
): Promise<T> {
  return requestJSON<T>(
    `/api/v1/income${path}`,
    () => jsonBody(body, dataGeneration),
    {
      network:
        "Mất kết nối. Nội dung đang nhập được giữ lại; hãy thử lại khi có mạng.",
      invalidResponse:
        "Máy chủ chưa phản hồi dữ liệu hợp lệ. Vui lòng thử lại.",
      fallback: "Không thể tải dữ liệu.",
      fallbackCode: "REQUEST_FAILED",
      error: (message, code, status, fields) =>
        new IncomeAPIError(message, code, status ?? 0, fields),
    },
  );
}
