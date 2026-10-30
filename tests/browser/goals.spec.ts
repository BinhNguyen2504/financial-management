import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { vietnamClock } from "../../src/domain/shared/clock";
import type { GoalView } from "../../src/domain/goals/engine";
import { visualThemeKeys } from "../../src/components/visual-theme";
const clock = vietnamClock();
async function login(page: Page) {
  await page.goto("/login?next=/goals");
  await page
    .getByLabel("Email", { exact: true })
    .fill(`${randomUUID()}@example.test`);
  await page
    .getByRole("button", { name: "Gửi mã đăng nhập", exact: true })
    .click();
  await page.getByLabel("Mã xác nhận", { exact: true }).fill("12345678");
  await expect(page).toHaveURL(/\/goals$/);
  await expect(
    page.getByRole("button", { name: "Tạo mục tiêu đầu tiên" }),
  ).toBeVisible();
}
async function view(page: Page): Promise<GoalView> {
  const r = await page.request.get("/api/v1/goals");
  expect(r.ok(), await r.text()).toBe(true);
  return r.json();
}
async function command(page: Page, action: unknown) {
  const v = await view(page),
    r = await page.request.post("/api/v1/goals/commands", {
      headers: {
        origin: process.env.TEST_BASE_URL!,
        "X-Data-Generation": String(v.dataGeneration ?? 0),
      },
      data: {
        id: randomUUID(),
        expectedVersion: v.book?.version ?? 0,
        expectedSources: v.sources.versions,
        action,
      },
    });
  expect(r.ok(), await r.text()).toBe(true);
  return r.json();
}
async function save(page: Page) {
  const titleId = await page
    .getByRole("dialog")
    .last()
    .getAttribute("aria-labelledby");
  const d = page.locator(
    "dialog[aria-labelledby=" + JSON.stringify(titleId) + "]",
  );
  await d
    .getByRole("button", { name: "Xem trước thay đổi", exact: true })
    .click();
  await expect(
    d.getByRole("region", { name: "Xem trước thay đổi", exact: true }),
  ).toBeVisible();
  await d.getByRole("button", { name: "Xác nhận lưu", exact: true }).click();
  await expect(d).toBeHidden();
}
async function create(page: Page, name = "Mua xe") {
  await page.getByRole("button", { name: "Tạo mục tiêu", exact: true }).click();
  const d = page.getByRole("dialog").last();
  await d.getByLabel("Tên mục tiêu", { exact: true }).fill(name);
  await d.getByLabel("Số tiền đích (VND)", { exact: true }).fill("100000000");
  return d;
}
async function savings(page: Page, action: unknown) {
  const v = await (await page.request.get("/api/v1/savings")).json(),
    r = await page.request.post("/api/v1/savings/commands", {
      headers: { origin: process.env.TEST_BASE_URL! },
      data: { id: randomUUID(), expectedVersion: v.book?.version ?? 0, action },
    });
  expect(r.ok(), await r.text()).toBe(true);
}
test("creates a ledger only after confirmation and records exact contributions", async ({
  page,
}) => {
  await login(page);
  const d = await create(page);
  await d
    .getByRole("button", { name: "Xem trước thay đổi", exact: true })
    .click();
  expect((await view(page)).book).toBeNull();
  await d.getByRole("button", { name: "Xác nhận lưu", exact: true }).click();
  await expect(d).toBeHidden();
  await page
    .getByRole("button", { name: "Xem mục tiêu Mua xe", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Ghi giao dịch", exact: true })
    .click();
  const editor = page.getByRole("dialog").last();
  await editor.getByLabel("Số tiền (VND)", { exact: true }).fill("40000000");
  await save(page);
  expect((await view(page)).states[0].balance).toBe("40000000");
  await expect(page.getByRole("dialog").first()).toContainText("40.000.000");
  await page
    .getByRole("dialog")
    .first()
    .getByRole("button", { name: "Đóng", exact: true })
    .last()
    .click();
  await expect(page.locator(".goal-card")).toContainText("40%");
});
test("links a source with a share and retains draft when the source changes after preview", async ({
  page,
}) => {
  await login(page);
  const source = randomUUID();
  await savings(page, {
    type: "createCategory",
    id: source,
    start: clock.today.slice(0, 7),
    kind: "cash",
    name: "Tiền mua xe",
    unit: null,
  });
  await savings(page, {
    type: "postTransaction",
    transaction: {
      id: randomUUID(),
      kind: "deposit",
      categoryId: source,
      date: clock.today,
      amount: "100000000",
    },
  });
  await page.reload();
  const d = await create(page);
  await d
    .getByRole("combobox", { name: "Cách ghi nhận", exact: true })
    .selectOption("linked");
  await d.getByRole("checkbox", { name: /Tiền mua xe/ }).check();
  await d.getByLabel("Tỷ lệ (%)", { exact: true }).fill("40");
  await d
    .getByRole("button", { name: "Xem trước thay đổi", exact: true })
    .click();
  await savings(page, {
    type: "postTransaction",
    transaction: {
      id: randomUUID(),
      kind: "deposit",
      categoryId: source,
      date: clock.today,
      amount: "100",
    },
  });
  await d.getByRole("button", { name: "Xác nhận lưu", exact: true }).click();
  await expect(d.getByRole("alert")).toContainText("Nguồn tiền đã thay đổi");
  await d.getByRole("button", { name: "Tải dữ liệu mới", exact: true }).click();
  await expect(d.getByLabel("Tên mục tiêu", { exact: true })).toHaveValue(
    "Mua xe",
  );
  await save(page);
  expect((await view(page)).states[0].current).toBe("40000040");
});
test("retains a completion milestone while withdrawing the separate balance, then archives", async ({
  page,
}) => {
  await login(page);
  const d = await create(page);
  await d.getByLabel("Số tiền đích (VND)", { exact: true }).fill("100");
  await save(page);
  const g = (await view(page)).book!.goals[0];
  await command(page, {
    type: "postTransaction",
    transaction: {
      id: randomUUID(),
      goalId: g.id,
      kind: "deposit",
      amount: "100",
      toGoalId: null,
      occurredAt: new Date().toISOString(),
      note: "",
    },
  });
  await page.reload();
  await page
    .getByRole("button", { name: "Xem mục tiêu Mua xe", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Xác nhận hoàn thành", exact: true })
    .click();
  await save(page);
  await expect(
    page
      .getByRole("dialog")
      .first()
      .getByRole("button", { name: "Lưu trữ", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Ghi giao dịch", exact: true })
    .click();
  const editor = page.getByRole("dialog").last();
  await editor
    .getByRole("combobox", { name: "Loại giao dịch", exact: true })
    .selectOption("withdraw");
  await editor.getByLabel("Số tiền (VND)", { exact: true }).fill("100");
  await editor
    .getByLabel("Ghi chú / lý do", { exact: true })
    .fill("Đã dùng cho mục tiêu");
  await save(page);
  expect((await view(page)).states[0]).toMatchObject({
    current: "100",
    balance: "0",
  });
  await page.getByRole("button", { name: "Lưu trữ", exact: true }).click();
  await save(page);
  expect((await view(page)).book!.goals[0].status).toBe("archived");
});
test("handles a lost save response by retrying the same command once", async ({
  page,
}) => {
  await login(page);
  const d = await create(page);
  await d
    .getByRole("button", { name: "Xem trước thay đổi", exact: true })
    .click();
  let dropped = false;
  await page.route("**/api/v1/goals/commands", async (route) => {
    if (!dropped) {
      dropped = true;
      await route.fetch();
      await route.abort("failed");
    } else await route.continue();
  });
  await d.getByRole("button", { name: "Xác nhận lưu", exact: true }).click();
  await expect(d.getByRole("alert")).toBeVisible();
  await d.getByRole("button", { name: "Xác nhận lưu", exact: true }).click();
  await expect(d).toBeHidden();
  expect((await view(page)).book!.version).toBe(1);
});
test("keeps narrow forms accessible, confirms discarded drafts, and renders English and privacy", async ({
  page,
}) => {
  await login(page);
  await page.setViewportSize({ width: 320, height: 740 });
  const d = await create(
    page,
    "Du lịch gia đình có tên dài để kiểm tra bố cục",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await d.getByRole("button", { name: "Đóng", exact: true }).click();
  await expect(page.getByRole("dialog").last()).toHaveAccessibleName(
    "Bỏ thay đổi?",
  );
  await page
    .getByRole("button", { name: "Tiếp tục nhập", exact: true })
    .click();
  await save(page);
  await page.getByRole("button", { name: "Ẩn số tiền", exact: true }).click();
  await expect(page.locator(".goal-card")).toContainText("••••••");
  await page
    .context()
    .addCookies([
      { name: "fm-locale", value: "en", url: process.env.TEST_BASE_URL! },
    ]);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Create goal", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".goal-card")).toContainText("No deadline");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `artifacts/goals-${test.info().project.name}-320.png`,
    fullPage: true,
  });
});

test("transfers, corrects and cancels without losing the parent transaction tab", async ({
  page,
}) => {
  await login(page);
  for (const name of ["Mua xe", "Du lịch"]) {
    const d = await create(page, name);
    await save(page);
    await expect(d).toBeHidden();
  }
  const a = (await view(page)).book!.goals.find((g) => g.name === "Mua xe")!,
    b = (await view(page)).book!.goals.find((g) => g.name === "Du lịch")!;
  await command(page, {
    type: "postTransaction",
    transaction: {
      id: randomUUID(),
      goalId: a.id,
      kind: "opening",
      toGoalId: null,
      amount: "10000000",
      occurredAt: new Date().toISOString(),
      note: "Tiền ban đầu",
    },
  });
  await page.reload();
  await page
    .getByRole("button", { name: "Xem mục tiêu Mua xe", exact: true })
    .click();
  const parent = page.getByRole("dialog", { name: "Mua xe", exact: true });
  await parent.getByRole("button", { name: "Giao dịch", exact: true }).click();
  await parent
    .getByRole("button", { name: "Ghi giao dịch", exact: true })
    .click();
  let editor = page.getByRole("dialog").last();
  await editor
    .getByRole("combobox", { name: "Loại giao dịch", exact: true })
    .selectOption("transfer");
  await editor
    .getByRole("combobox", { name: "Mục tiêu nhận", exact: true })
    .selectOption(b.id);
  await editor.getByLabel("Số tiền (VND)", { exact: true }).fill("2000000");
  await editor
    .getByLabel("Ghi chú / lý do", { exact: true })
    .fill("Chia cho chuyến đi");
  await save(page);
  await expect(
    parent.getByRole("button", { name: "Giao dịch", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  expect((await view(page)).states.find((g) => g.id === b.id)?.balance).toBe(
    "2000000",
  );
  await parent
    .getByRole("button", { name: "Sửa", exact: true })
    .first()
    .click();
  editor = page.getByRole("dialog").last();
  await editor.getByLabel("Số tiền (VND)", { exact: true }).fill("1000000");
  await editor
    .getByLabel("Lý do sửa hoặc hủy", { exact: true })
    .fill("Điều chỉnh khoản chuyển");
  await save(page);
  expect((await view(page)).states.find((g) => g.id === b.id)?.balance).toBe(
    "1000000",
  );
  await parent
    .getByRole("button", { name: "Hủy giao dịch", exact: true })
    .first()
    .click();
  editor = page.getByRole("dialog").last();
  await editor
    .getByLabel("Lý do sửa hoặc hủy", { exact: true })
    .fill("Không chuyển nữa");
  await save(page);
  expect((await view(page)).states.find((g) => g.id === a.id)?.balance).toBe(
    "10000000",
  );
  expect((await view(page)).states.find((g) => g.id === b.id)?.balance).toBe(
    "0",
  );
  await parent.getByRole("button", { name: "Lịch sử", exact: true }).click();
  await expect(parent).toContainText("Hủy giao dịch");
});

test("reorders goals and keeps all themes readable within the viewport", async ({
  page,
}) => {
  await login(page);
  await create(page, "Mua xe");
  await save(page);
  await create(page, "Du lịch gia đình");
  await save(page);
  await page
    .getByRole("button", { name: "Ưu tiên Du lịch gia đình lên", exact: true })
    .click();
  await save(page);
  await expect(page.locator(".goal-card h2").first()).toHaveText(
    "Du lịch gia đình",
  );
  const funded = (await view(page)).book!.goals.find(
    (g) => g.name === "Mua xe",
  )!;
  await command(page, {
    type: "saveGoal",
    goal: {
      id: funded.id,
      name: funded.name,
      note: "",
      purpose: "spending",
      mode: "ledger",
      basis: "value",
      target: "100000000",
      deadline: "2027-12-31",
      monthly: "5000000",
      links: [],
    },
  });
  await command(page, {
    type: "postTransaction",
    transaction: {
      id: randomUUID(),
      goalId: funded.id,
      kind: "deposit",
      toGoalId: null,
      amount: "40000000",
      occurredAt: new Date().toISOString(),
      note: "Chuẩn bị mua xe",
    },
  });
  for (const theme of visualThemeKeys)
    for (const mode of ["light", "dark"]) {
      await page.evaluate(
        ({ theme, mode }) => {
          localStorage.setItem("fm-visual-theme", theme);
          localStorage.setItem("fm-theme", mode);
        },
        { theme, mode },
      );
      await page.reload();
      await expect(page.locator(".goal-card")).toHaveCount(2);
      for (const width of [1440, 768, 320]) {
        await page.setViewportSize({ width, height: 900 });
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await page.screenshot({
          path:
            "artifacts/goals-" +
            test.info().project.name +
            "-" +
            theme +
            "-" +
            mode +
            "-" +
            width +
            ".png",
          fullPage: true,
        });
      }
    }
});
