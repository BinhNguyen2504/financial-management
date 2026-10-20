import type { Module } from "@/features/catalog";

export type HelpPageId = Module["slug"] | "profile";
export type HelpItem = {
  id: string;
  title: string;
  paragraphs: string[];
  steps?: string[];
  result?: string;
};
export type HelpSection = {
  id: string;
  title: string;
  paragraphs?: string[];
  items?: HelpItem[];
};
export type HelpArticle = { sections: HelpSection[] };
export type HelpArticles = Record<HelpPageId, HelpArticle>;
