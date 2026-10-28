import { requestJSON } from "@/lib/http-client";
export class OverviewRequestError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status?: number,
  ) {
    super(message);
  }
}
export function overviewRequest<T>(path: string, init: RequestInit = {}) {
  return requestJSON<T>(`/api/v1/overview${path}`, init, {
    network: "Chưa kết nối được Tổng quan. Hãy thử lại.",
    invalidResponse: "Phản hồi Tổng quan không hợp lệ. Hãy thử lại.",
    fallback: "Chưa tải được Tổng quan. Hãy thử lại.",
    fallbackCode: "OVERVIEW_UNAVAILABLE",
    error: (message, code, status) =>
      new OverviewRequestError(message, code, status),
  });
}
