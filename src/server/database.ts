import "server-only";
import postgres from "postgres";
import { postgresExpenseRepository } from "./expense-repository";
import { postgresIncomeRepository } from "./income-repository";
import { postgresSavingsRepository } from "./savings-repository";

let sql: postgres.Sql | undefined;
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
export function expenseRepository() {
  return postgresExpenseRepository(databaseConnection());
}
export function incomeRepository() {
  return postgresIncomeRepository(databaseConnection());
}
export function savingsRepository() {
  return postgresSavingsRepository(databaseConnection());
}
