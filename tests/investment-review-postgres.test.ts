import { it, expect, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import {
  buildInvestmentReviewData,
  buildInvestmentReviewSQL,
} from "../scripts/lib/investment-review-data.mjs";
import { postgresInvestmentRepository } from "../src/server/investment-repository";
import { readInvestmentView } from "../src/application/investments";
import { replay } from "../src/domain/investments/engine";
const admin = postgres(process.env.TEST_DATABASE_ADMIN_URL!, { max: 1 }),
  sql = postgres(process.env.TEST_DATABASE_URL!, { max: 1, prepare: false });
afterAll(async () => {
  await sql.end();
  await admin.end();
});
it("local preview SQL reads back the same investment amounts and full history through runtime RLS", async () => {
  const owner = randomUUID(),
    sample = buildInvestmentReviewData({ ownerId: owner, today: "2026-10-18" });
  await admin`insert into auth.users(id) values(${owner})`;
  await admin.unsafe(buildInvestmentReviewSQL(sample).seed);
  const v = await readInvestmentView(
      postgresInvestmentRepository(sql),
      owner,
      sample.today,
      { today: sample.today, now: `${sample.today}T00:00:00Z` },
    ),
    expected = replay(sample.book, sample.today);
  expect(v.state.total).toBe(expected.total);
  expect(v.state.positions.sort((a, b) => a.id.localeCompare(b.id))).toEqual(
    expected.positions.sort((a, b) => a.id.localeCompare(b.id)),
  );
  expect(v.book?.revisions).toEqual(sample.book.revisions);
  expect(v.book?.audit).toEqual(sample.book.audit);
});
