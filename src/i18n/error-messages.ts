import { english } from "./messages";
import {
  describeMessage,
  translate,
  type MessageDescriptor,
} from "./translate";

export type ErrorMessages = {
  error?: string;
  fieldErrors?: Record<string, string>;
  messageKey?: MessageDescriptor["key"];
  messageParams?: MessageDescriptor["params"];
  fieldErrorMessages?: Record<string, MessageDescriptor>;
};

/** Existing error/code/fieldErrors remain intact for API consumers. */
export function withErrorMessages<T>(body: T): T {
  if (
    !body ||
    typeof body !== "object" ||
    !("error" in body) ||
    typeof body.error !== "string"
  )
    return body;
  const payload = body as T & ErrorMessages;
  const message = describeMessage(payload.error!);
  const fields = Object.fromEntries(
    Object.entries(payload.fieldErrors ?? {}).flatMap(([field, value]) => {
      const descriptor = describeMessage(value);
      return descriptor ? [[field, descriptor]] : [];
    }),
  );
  return {
    ...body,
    ...(message
      ? { messageKey: message.key, messageParams: message.params }
      : {}),
    ...(Object.keys(fields).length ? { fieldErrorMessages: fields } : {}),
  };
}

export function responseMessage(body: ErrorMessages, fallback: string) {
  return body.messageKey &&
    Object.prototype.hasOwnProperty.call(english, body.messageKey)
    ? translate("vi", body.messageKey, body.messageParams)
    : (body.error ?? fallback);
}
export function responseFieldErrors(body: ErrorMessages) {
  if (!body.fieldErrorMessages) return body.fieldErrors;
  return {
    ...body.fieldErrors,
    ...Object.fromEntries(
      Object.entries(body.fieldErrorMessages).map(([field, descriptor]) => [
        field,
        Object.prototype.hasOwnProperty.call(english, descriptor.key)
          ? translate("vi", descriptor.key, descriptor.params)
          : (body.fieldErrors?.[field] ?? ""),
      ]),
    ),
  };
}
