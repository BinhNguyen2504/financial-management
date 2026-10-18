import { z } from "zod";
import { profileSchema } from "../../domain/profile";
export { profileSchema } from "../../domain/profile";

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
