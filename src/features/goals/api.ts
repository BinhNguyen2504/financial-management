import { jsonBody, requestJSON } from "@/lib/http-client";
export class GoalAPIError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
    public fieldErrors?: Record<string, string>,
  ) {
    super(message);
  }
}
export function goalsJSON<T>(path = "", body?: unknown, generation = 0) {
  return requestJSON<T>(
    `/api/v1/goals${path}`,
    () => jsonBody(body, generation),
    {
      network:
        "Mất kết nối. Nội dung đang nhập được giữ; hãy thử lại khi có mạng.",
      invalidResponse: "Phản hồi chưa hợp lệ. Hãy thử lại.",
      fallback:
        "Không thể tải Mục tiêu. Hãy thử lại; nội dung đang nhập được giữ.",
      fallbackCode: "REQUEST_FAILED",
      error: (message, code, status, fields) =>
        new GoalAPIError(message, code, status ?? 0, fields),
    },
  );
}
