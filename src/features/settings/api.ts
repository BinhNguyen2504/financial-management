import { responseMessage } from "@/i18n/error-messages";
import { userFacingError } from "@/i18n/user-facing-errors";
export class DataRequestError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

export async function dataRequest(path: string, init?: RequestInit) {
  let response: Response;
  try {
    response = await fetch(`/api/v1/data${path}`, {
      ...init,
      cache: "no-store",
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new DataRequestError(
      "Chưa kết nối được dữ liệu. Kiểm tra mạng và thử lại.",
    );
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new DataRequestError(
      userFacingError(
        responseMessage(body, "Chưa kết nối được dữ liệu. Hãy thử lại."),
        body.code,
      ),
      response.status,
    );
  }
  return response;
}
export interface DataStatus {
  empty: boolean;
  ownerId: string;
  maxBytes: number;
  importReady: boolean;
}
