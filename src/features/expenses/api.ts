export class RequestError extends Error {
  constructor(
    message: string,
    public code: string,
    public fieldErrors?: Record<string, string>,
  ) {
    super(message);
  }
}
export async function apiJSON<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/v1/expenses${path}`, {
      ...init,
      cache: "no-store",
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new RequestError(
      "Mất kết nối. Nội dung đang nhập được giữ lại; hãy thử lại khi có mạng.",
      "NETWORK_ERROR",
    );
  }
  let result;
  try {
    result = await response.json();
  } catch {
    throw new RequestError(
      "Máy chủ chưa phản hồi dữ liệu hợp lệ. Vui lòng thử lại.",
      "INVALID_RESPONSE",
    );
  }
  if (!response.ok)
    throw new RequestError(
      result.error ?? "Không thể tải dữ liệu.",
      result.code ?? "UNKNOWN",
      result.fieldErrors,
    );
  return result as T;
}
