import { modules, moduleStatusLabels } from "@/features/catalog";
import type { HelpPageId } from "./types";

export const helpPages = [
  ...modules.map((module) => ({
    id: module.slug as HelpPageId,
    title: module.title,
    status: moduleStatusLabels[module.status],
  })),
  {
    id: "profile" as const,
    title: "Thông tin cá nhân",
    status: "Có trong bản hiện tại",
  },
];

export function helpPageForPath(pathname: string) {
  return helpPages.find((page) => pathname === `/${page.id}`);
}
