import { z } from "zod";

export const monthSchema = z
  .string()
  .regex(/^20\d{2}-(0[1-9]|1[0-2])$/, "Tháng không hợp lệ.");

export const yearSchema = z.number().int().min(2000).max(2099);

export const moneySchema = z
  .string()
  .regex(
    /^(0|[1-9][0-9]{0,23})$/,
    "Nhập số tiền VND nguyên không âm, tối đa 24 chữ số.",
  );

export const expenseMoneySchema = z
  .string()
  .regex(
    /^(0|[1-9][0-9]{0,23})$/,
    "Nhập số tiền VND nguyên, không âm, tối đa 24 chữ số.",
  );

export const expenseMonthSchema = z
  .string()
  .regex(/^(20[0-9]{2})-(0[1-9]|1[0-2])$/, "Tháng không hợp lệ.");

export const expenseDateSchema = z
  .string()
  .regex(/^20[0-9]{2}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/)
  .refine(
    (v) => new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v,
    "Ngày không hợp lệ.",
  );

export const dateSchema = z
  .string()
  .regex(/^20\d{2}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(`${v}T00:00:00Z`);
    return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === v;
  }, "Ngày không hợp lệ.");
