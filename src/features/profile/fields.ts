import { z } from "zod";

export const profileSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập họ và tên.")
    .max(100, "Họ và tên tối đa 100 ký tự."),
  birth_date: z.string().refine((value) => {
    if (!value) return true;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    return (
      Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === value &&
      value >= "1900-01-01" &&
      value <= today
    );
  }, "Ngày sinh phải hợp lệ, từ năm 1900 đến hôm nay."),
  gender: z.enum(["", "female", "male", "other", "prefer_not_to_say"]),
});
export type ProfileFields = z.infer<typeof profileSchema>;
export function profileFields(
  metadata: Record<string, unknown>,
): ProfileFields {
  return {
    full_name:
      typeof metadata.full_name === "string"
        ? metadata.full_name
        : typeof metadata.name === "string"
          ? metadata.name
          : "",
    birth_date:
      typeof metadata.birth_date === "string" ? metadata.birth_date : "",
    gender: profileSchema.shape.gender.safeParse(metadata.gender).success
      ? (metadata.gender as ProfileFields["gender"])
      : "",
  };
}
export function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(-2)
      .map((word) => Array.from(word)[0])
      .join("")
      .toLocaleUpperCase("vi") || "B"
  );
}
