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
  let response: Response;
  try {
    response = await fetch(`/api/v1/funds${path}`, {
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
    throw new FundAPIError(
      "Mất kết nối. Nội dung đang nhập được giữ; hãy thử lại khi có mạng.",
      "NETWORK_ERROR",
      0,
    );
  }
  let data;
  try {
    data = await response.json();
  } catch {
    throw new FundAPIError(
      "Phản hồi chưa hợp lệ. Hãy thử lại.",
      "INVALID_RESPONSE",
      response.status,
    );
  }
  if (!response.ok)
    throw new FundAPIError(
      data.error ?? "Không thể truy cập Quỹ an toàn.",
      data.code ?? "REQUEST_FAILED",
      response.status,
      data.fieldErrors,
    );
  return data as T;
}
