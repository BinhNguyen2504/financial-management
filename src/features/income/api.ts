import { responseFieldErrors, responseMessage } from "@/i18n/error-messages";
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
export async function incomeJSON<T>(path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/v1/income${path}`, {
      cache: "no-store",
      ...(body === undefined
        ? {}
        : {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }),
    });
  } catch {
    throw new IncomeAPIError(
      "Mất kết nối. Nội dung đang nhập được giữ lại; hãy thử lại khi có mạng.",
      "NETWORK_ERROR",
      0,
    );
  }
  let value;
  try {
    value = await response.json();
  } catch {
    throw new IncomeAPIError(
      "Máy chủ chưa phản hồi dữ liệu hợp lệ. Vui lòng thử lại.",
      "INVALID_RESPONSE",
      response.status,
    );
  }
  if (!response.ok)
    throw new IncomeAPIError(
      responseMessage(value, "Không thể tải dữ liệu."),
      value.code ?? "REQUEST_FAILED",
      response.status,
      responseFieldErrors(value),
    );
  return value as T;
}
