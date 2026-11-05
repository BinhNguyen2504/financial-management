import { describeMessage } from "./translate";

const unavailable =
  "Tính năng này tạm thời chưa sẵn sàng. Hãy thử lại sau; nội dung đang nhập được giữ.";

/** Keep diagnostic codes/statuses intact; only the message shown to people changes. */
export function userFacingError(
  message: string,
  code?: string,
  fallback = "Chưa thể hoàn tất thao tác. Hãy thử lại.",
) {
  if (code === "INVALID_RESPONSE")
    return "Chưa nhận được dữ liệu. Hãy thử lại.";
  if (
    message.startsWith("Bản sao lưu không hợp lệ:") ||
    message.startsWith("File không phải bản sao lưu toàn tài khoản")
  )
    return "Bản sao lưu chưa hợp lệ hoặc không tương thích. Hãy chọn file được tải từ Cài đặt.";
  if (message === "Chỉ hỗ trợ file JSON.")
    return "Hãy chọn bản sao lưu (.json) đã tải từ Cài đặt.";
  if (
    [
      "Yêu cầu phải là JSON.",
      "JSON không hợp lệ.",
      "File JSON hoặc yêu cầu không hợp lệ.",
    ].includes(message)
  )
    return fallback;
  if (code === "LABEL_VISUALS_MIGRATION_REQUIRED")
    return "Chưa thể lưu logo hoặc biểu tượng vì hệ thống cần được cập nhật. Nội dung bạn nhập vẫn được giữ.";
  if (
    [
      "FUNDS_MIGRATION_REQUIRED",
      "SCHEMA_NOT_READY",
      "NOT_CONFIGURED",
      "STORAGE_UNAVAILABLE",
    ].includes(code ?? "")
  )
    return unavailable;
  // Infrastructure instructions never belong in financial forms, even if translated.
  if (
    /\b(Supabase|PostgreSQL|migration|schema|SQLSTATE|DATABASE_NOT_CONFIGURED|PKCE)\b/i.test(
      message,
    ) &&
    !/\{\w+\}/.test(describeMessage(message)?.key ?? "")
  )
    return fallback;
  return message;
}
