import { responseFieldErrors, responseMessage } from "@/i18n/error-messages";
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
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/v1/investments${path}`, {
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
    throw new InvestmentAPIError(
      "Mất kết nối. Nội dung đang nhập được giữ; hãy thử lại khi có mạng.",
      "NETWORK_ERROR",
      0,
    );
  }
  let data;
  try {
    data = await response.json();
  } catch {
    throw new InvestmentAPIError(
      "Phản hồi chưa hợp lệ. Hãy thử lại.",
      "INVALID_RESPONSE",
      response.status,
    );
  }
  if (!response.ok)
    throw new InvestmentAPIError(
      responseMessage(data, "Không thể tải dữ liệu."),
      data.code ?? "REQUEST_FAILED",
      response.status,
      responseFieldErrors(data),
    );
  return data as T;
}
export async function downloadInvestment(path: string, filename: string) {
  const response = await fetch(`/api/v1/investments${path}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    const v = await response.json();
    throw new Error(v.error ?? "Không thể xuất dữ liệu.");
  }
  const url = URL.createObjectURL(await response.blob()),
    a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
