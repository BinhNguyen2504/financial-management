import { responseFieldErrors, responseMessage } from "@/i18n/error-messages";
import { userFacingError } from "@/i18n/user-facing-errors";

interface RequestFailure {
  network: string;
  invalidResponse: string;
  fallback: string;
  fallbackCode: string;
  omitInvalidResponseStatus?: boolean;
  error: (
    message: string,
    code: string,
    status: number | undefined,
    fields?: Record<string, string>,
  ) => Error;
}

/** Transport only; each module retains its error class and messages. */
export async function requestJSON<T>(
  url: string,
  init: RequestInit | (() => RequestInit),
  failure: RequestFailure,
): Promise<T> {
  let response: Response;
  try {
    const options = typeof init === "function" ? init() : init;
    response = await fetch(url, { ...options, cache: "no-store" });
  } catch {
    throw failure.error(failure.network, "NETWORK_ERROR", undefined);
  }
  let value;
  try {
    value = await response.json();
  } catch {
    throw failure.error(
      userFacingError(failure.invalidResponse, "INVALID_RESPONSE"),
      "INVALID_RESPONSE",
      failure.omitInvalidResponseStatus ? undefined : response.status,
    );
  }
  if (!response.ok) {
    const fields = responseFieldErrors(value);
    throw failure.error(
      userFacingError(
        responseMessage(value, failure.fallback),
        value.code,
        failure.fallback,
      ),
      value.code ?? failure.fallbackCode,
      response.status,
      fields &&
        Object.fromEntries(
          Object.entries(fields).map(([field, message]) => [
            field,
            userFacingError(message),
          ]),
        ),
    );
  }
  return value as T;
}

export function jsonBody(body: unknown, dataGeneration = 0): RequestInit {
  return body === undefined
    ? {}
    : {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(dataGeneration
            ? { "X-Data-Generation": String(dataGeneration) }
            : {}),
        },
        body: JSON.stringify(body),
      };
}

export async function downloadFile(url: string, filename: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const value = await response.json();
    throw new Error(
      userFacingError(
        responseMessage(value, "Không thể xuất dữ liệu."),
        value.code,
        "Không thể xuất dữ liệu.",
      ),
    );
  }
  const objectURL = URL.createObjectURL(await response.blob());
  const anchor = document.createElement("a");
  anchor.href = objectURL;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(objectURL), 1000);
}
