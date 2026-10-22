import { auth } from "./auth";
import { catalog } from "./catalog";
import { common } from "./common";
import { errors } from "./errors";
import { expenses } from "./expenses";
import { funds } from "./funds";
import { income } from "./income";
import { investments } from "./investments";
import { profile } from "./profile";
import { savings } from "./savings";
import { settings } from "./settings";
export const english = {
  ...common,
  ...expenses,
  ...income,
  ...savings,
  ...investments,
  ...funds,
  ...settings,
  ...profile,
  ...catalog,
  ...auth,
  ...errors,
} as const;
export type MessageKey = keyof typeof english;

export const namespaces = {
  common,
  expenses,
  income,
  savings,
  investments,
  funds,
  settings,
  profile,
  catalog,
  errors,
  auth,
} as const;
export type Namespace = keyof typeof namespaces;
