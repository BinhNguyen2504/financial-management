import { requestJSON } from "@/lib/http-client";
export class ReportAPIError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
  ) {
    super(message);
  }
}
export function reportsJSON<T>(path: string, signal?: AbortSignal) {
  return requestJSON<T>(
    `/api/v1/reports${path}`,
    { signal },
    {
      network: "Mất kết nối. Hãy thử lại khi có mạng.",
      invalidResponse:
        "Máy chủ chưa phản hồi dữ liệu hợp lệ. Vui lòng thử lại.",
      fallback: "Chưa tải được Báo cáo. Hãy thử lại.",
      fallbackCode: "REQUEST_FAILED",
      error: (message, code, status) =>
        new ReportAPIError(message, code, status ?? 0),
    },
  );
}
