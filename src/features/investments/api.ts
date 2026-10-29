import { jsonBody, requestJSON, downloadFile } from "@/lib/http-client";
export class InvestmentAPIError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
    public fieldErrors?: Record<string, string>,
  ) {
    super(message);
  }
}
export async function investmentsJSON<T>(
  path: string,
  body?: unknown,
  dataGeneration = 0,
): Promise<T> {
  return requestJSON<T>(
    `/api/v1/investments${path}`,
    () => jsonBody(body, dataGeneration),
    {
      network:
        "Mất kết nối. Nội dung đang nhập được giữ; hãy thử lại khi có mạng.",
      invalidResponse: "Phản hồi chưa hợp lệ. Hãy thử lại.",
      fallback: "Không thể tải dữ liệu.",
      fallbackCode: "REQUEST_FAILED",
      error: (message, code, status, fields) =>
        new InvestmentAPIError(message, code, status ?? 0, fields),
    },
  );
}

export async function downloadInvestment(path: string, filename: string) {
  return downloadFile(`/api/v1/investments${path}`, filename);
}
