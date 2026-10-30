import { goals } from "./goals";
import { overview } from "./overview";
import { landing } from "./landing";
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
  ...overview,
  ...common,
  ...expenses,
  ...income,
  ...savings,
  ...investments,
  ...funds,
  ...goals,
  ...settings,
  ...profile,
  ...catalog,
  ...auth,
  ...landing,
  ...errors,
} as const;
export type MessageKey = keyof typeof english;

export const namespaces = {
  overview,
  common,
  expenses,
  income,
  savings,
  investments,
  funds,
  goals,
  settings,
  profile,
  catalog,
  errors,
  auth,
  landing,
} as const;
export type Namespace = keyof typeof namespaces;
