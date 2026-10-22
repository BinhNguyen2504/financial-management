import { withErrorMessages } from "@/i18n/error-messages";
import { NextResponse } from "next/server";

export function jsonResponse<T>(body: T, init?: ResponseInit) {
  return NextResponse.json(withErrorMessages(body), init);
}
