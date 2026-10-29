import { postgresOverviewDataRepository } from "./overview-data-repository";
import { postgresOverviewRepository } from "./overview-repository";
import { postgresFundRepository } from "./fund-repository";
import "server-only";
import postgres from "postgres";
import { postgresDataRepository } from "./data-repository";
import { postgresExpenseRepository } from "./expense-repository";
import { postgresIncomeRepository } from "./income-repository";
import { postgresSavingsRepository } from "./savings-repository";

import { postgresInvestmentRepository } from "./investment-repository";

let sql: postgres.Sql | undefined;
export function dataRepository() {
  return postgresDataRepository(databaseConnection());
}
function databaseConnection() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_NOT_CONFIGURED");
  sql ??= postgres(process.env.DATABASE_URL, {
    max: 4,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
    ssl: process.env.DATABASE_SSL === "disable" ? false : "require",
  });
  return sql;
}
export function expenseRepository(expectedGeneration?: number) {
  return postgresExpenseRepository(databaseConnection(), expectedGeneration);
}
export function incomeRepository(expectedGeneration?: number) {
  return postgresIncomeRepository(databaseConnection(), expectedGeneration);
}
export function savingsRepository(expectedGeneration?: number) {
  return postgresSavingsRepository(databaseConnection(), expectedGeneration);
}

export function investmentRepository(expectedGeneration?: number) {
  return postgresInvestmentRepository(databaseConnection(), expectedGeneration);
}

export function fundRepository(expectedGeneration?: number) {
  return postgresFundRepository(databaseConnection(), expectedGeneration);
}

export function overviewRepository() {
  return postgresOverviewRepository(databaseConnection());
}

export function overviewDataRepository() {
  return postgresOverviewDataRepository(databaseConnection());
}
