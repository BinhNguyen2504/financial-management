import { BackupError, summarizeBackup } from "@/domain/backup/format";
import { validateBackup } from "@/domain/backup/validate";
import { ExpenseError } from "@/domain/expenses/engine";
import { profileFields } from "@/features/profile/fields";
import { authenticatedUser } from "@/server/auth";
import { backupMaxBytes, checkBackupSize } from "@/server/data-repository";
import { dataRepository } from "@/server/database";
import { jsonResponse } from "@/server/json-response";
import { sameOrigin } from "@/server/request-origin";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = {
  "Cache-Control": "private, no-store",
  Vary: "Cookie, Authorization",
  "X-Content-Type-Options": "nosniff",
};
type Context = { params: Promise<{ path?: string[] }> };
function failure(error: unknown) {
  if (error instanceof BackupError || error instanceof ExpenseError)
    return jsonResponse(
      { error: error.message, code: error.code },
      { status: error.status, headers },
    );
  if (error instanceof z.ZodError || error instanceof SyntaxError)
    return jsonResponse(
      { error: "File JSON hoặc yêu cầu không hợp lệ.", code: "INVALID_BACKUP" },
      { status: 422, headers },
    );
  // Do not log SQL errors: postgres diagnostics may contain uploaded financial values.
  return jsonResponse(
    {
      error: "Chưa truy cập được dữ liệu. Kiểm tra kết nối và thử lại.",
      code: "STORAGE_UNAVAILABLE",
    },
    { status: 503, headers },
  );
}
async function readBody(request: Request) {
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  )
    throw new BackupError("Chỉ hỗ trợ file JSON.", 415);
  const max = backupMaxBytes() + 1024;
  if (Number(request.headers.get("content-length") ?? 0) > max)
    throw new BackupError(
      "File vượt giới hạn dung lượng.",
      413,
      "BACKUP_TOO_LARGE",
    );
  const reader = request.body?.getReader();
  if (!reader) throw new BackupError("Chưa có file để nhập.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) {
        await reader.cancel();
        throw new BackupError(
          "File vượt giới hạn dung lượng.",
          413,
          "BACKUP_TOO_LARGE",
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
export async function GET(request: Request, context: Context) {
  try {
    const user = await authenticatedUser(request),
      path = ((await context.params).path ?? []).join("/");
    if (path === "status")
      return jsonResponse(await dataRepository().status(user.id), {
        headers,
      });
    if (path !== "backup")
      throw new BackupError("Đường dẫn không tồn tại.", 404);
    const backup = await dataRepository().backup(
      user.id,
      profileFields(user.user_metadata),
    );
    return new NextResponse(checkBackupSize(backup), {
      headers: {
        ...headers,
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="financial-manager-backup-${backup.exportedAt.replace(/[:.]/g, "-")}.json"`,
      },
    });
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request, context: Context) {
  try {
    const user = await authenticatedUser(request);
    if (!sameOrigin(request))
      throw new BackupError(
        "Yêu cầu không đúng nguồn ứng dụng.",
        403,
        "FORBIDDEN_ORIGIN",
      );
    const path = ((await context.params).path ?? []).join("/");
    if (!["import/preview", "import"].includes(path))
      throw new BackupError("Đường dẫn không tồn tại.", 404);
    const body = await readBody(request);
    if (path === "import/preview") {
      const backup = validateBackup(body);
      checkBackupSize(backup);
      const status = await dataRepository().status(user.id);
      return jsonResponse(
        {
          ...summarizeBackup(backup),
          canImport: status.empty && status.importReady,
        },
        { headers },
      );
    }
    const parsed = z
      .strictObject({
        requestId: z.uuid(),
        targetOwnerId: z.uuid(),
        backup: z.unknown(),
      })
      .parse(body);
    if (parsed.targetOwnerId !== user.id)
      throw new BackupError(
        "Phiên đăng nhập đã thay đổi. Hãy tải lại trang.",
        409,
        "ACCOUNT_CHANGED",
      );
    return jsonResponse(
      await dataRepository().import(user.id, parsed.requestId, parsed.backup),
      { headers },
    );
  } catch (error) {
    return failure(error);
  }
}
