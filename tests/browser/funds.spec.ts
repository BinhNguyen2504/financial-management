import { expect, test, type Locator, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { vietnamClock } from "../../src/domain/expenses/engine";
import type { FundView } from "../../src/domain/funds/types";
const clock = vietnamClock(),
  month = clock.today.slice(0, 7),
  stamp = new Date(Date.now() - 86400000).toISOString();
const origin = () => process.env.TEST_BASE_URL!;
async function login(page: Page) {
  await page.goto("/login?next=/funds");
  await page
    .getByLabel("Email", { exact: true })
    .fill(`${randomUUID()}@example.test`);
  await page
    .getByRole("button", { name: "Gửi mã đăng nhập", exact: true })
    .click();
  await page.getByLabel("Mã xác nhận", { exact: true }).fill("12345678");
  await expect(page).toHaveURL(/\/funds$/);
  await expect(
    page.getByRole("button", { name: "Bắt đầu xây quỹ" }),
  ).toBeVisible();
}
async function view(page: Page): Promise<FundView> {
  const r = await page.request.get("/api/v1/funds");
  expect(r.ok(), await r.text()).toBe(true);
  return r.json();
}
async function expense(page: Page, action: unknown) {
  const v = await (await page.request.get("/api/v1/expenses")).json();
  const r = await page.request.post("/api/v1/expenses/commands", {
    headers: { origin: origin() },
    data: { id: randomUUID(), expectedVersion: v.book?.version ?? 0, action },
  });
  expect(r.ok(), await r.text()).toBe(true);
}
async function command(page: Page, action: unknown) {
  const v = await view(page);
  const r = await page.request.post("/api/v1/funds/commands", {
    headers: { origin: origin() },
    data: { id: randomUUID(), expectedVersion: v.book?.version ?? 0, action },
  });
  expect(r.ok(), await r.text()).toBe(true);
  return r.json();
}
async function source(page: Page) {
  const jar = randomUUID();
  await expense(page, { type: "initialize", start: month });
  await expense(page, {
    type: "createJar",
    id: jar,
    kind: "monthly",
    start: month,
    opening: "0",
    name: "Sinh hoạt thiết yếu",
    description: "",
    method: "Tiền mặt",
    group: "",
    amount: "9000000",
  });
  return jar;
}
async function setup(page: Page) {
  await login(page);
  const jar = await source(page);
  await command(page, {
    type: "configure",
    id: randomUUID(),
    jarIds: [jar],
    multipliers: { emergency: "6", rainy_day: "1", sinking: "2" },
    priority: ["rainy_day", "emergency", "sinking"],
    applyLiving: true,
    expectedExpenseVersion: 2,
    sourceMonth: month,
  });
  const bank = randomUUID(),
    cash = randomUUID();
  for (const [id, name] of [
    [bank, "Ngân hàng"],
    [cash, "Tiền mặt"],
  ])
    await command(page, { type: "saveLocation", id, name, active: true });
  await page.reload();
  await expect(page.locator('[data-fund="emergency"]')).toBeVisible();
  return { jar, bank, cash };
}
async function save(page: Page) {
  const titleId = await page
    .getByRole("dialog")
    .getAttribute("aria-labelledby");
  const d = page.locator(`dialog[aria-labelledby="${titleId}"]`);
  await d
    .getByRole("button", { name: "Xem trước thay đổi", exact: true })
    .click();
  await expect(
    d.getByRole("region", { name: "Xem trước thay đổi", exact: true }),
  ).toBeVisible();
  await d.getByRole("button", { name: "Xác nhận lưu", exact: true }).click();
  await expect(d).toBeHidden();
}
async function post(
  page: Page,
  bank: string,
  amount: string,
  extra: Record<string, unknown> = {},
) {
  return command(page, {
    type: "postTransaction",
    transaction: {
      id: randomUUID(),
      kind: "deposit",
      fundId: "emergency",
      locationId: bank,
      amount,
      occurredAt: stamp,
      note: "Khoản góp tổng hợp",
      ...extra,
    },
  });
}

async function expectLedgerLayout(ledger: Locator) {
  const rows = ledger.locator(".fund-transaction");
  await expect(rows.first()).toBeVisible();
  const measurements = await ledger.evaluate((element) => {
    const width = element.getBoundingClientRect().width;
    return Array.from(element.querySelectorAll(".fund-transaction")).map(
      (row) => {
        const info = row.querySelector(".fund-transaction-info")!;
        const amount = row.querySelector(".fund-transaction-amount")!;
        const actions = row.querySelector(".fund-actions")!;
        const center = (el: Element) => {
          const rect = el.getBoundingClientRect();
          return rect.top + rect.height / 2;
        };
        const buttons = Array.from(actions.querySelectorAll("button"));
        const [edit, cancel] = buttons.map((button) =>
          button.getBoundingClientRect(),
        );
        return {
          width,
          overflow: row.scrollWidth - row.clientWidth,
          amountOverflow: amount.scrollWidth - amount.clientWidth,
          amountRight: amount.getBoundingClientRect().right,
          amountCenterOffset: Math.abs(center(amount) - center(info)),
          actionCenterOffset: Math.abs(center(actions) - center(info)),
          buttonWidths: buttons.map(
            (button) => button.getBoundingClientRect().width,
          ),
          buttonHeights: buttons.map(
            (button) => button.getBoundingClientRect().height,
          ),
          actionTopOffset: Math.abs(edit.top - cancel.top),
          actionGap: cancel.left - edit.right,
          iconOnly: buttons.every(
            (button) =>
              !button.textContent?.trim() && button.querySelector("svg"),
          ),
        };
      },
    );
  });
  for (const row of measurements) {
    expect(row.overflow).toBeLessThanOrEqual(1);
    expect(row.amountOverflow).toBeLessThanOrEqual(1);
    expect(row.iconOnly).toBe(true);
    expect(row.actionTopOffset).toBeLessThan(1);
    expect(row.actionGap).toBeGreaterThanOrEqual(8);
    for (const size of [...row.buttonWidths, ...row.buttonHeights]) {
      expect(size).toBeGreaterThanOrEqual(44);
    }
    if (row.width > 480) expect(row.amountCenterOffset).toBeLessThan(2);
    if (row.width > 700) expect(row.actionCenterOffset).toBeLessThan(2);
  }
  const edges = measurements.map((row) => row.amountRight);
  expect(Math.max(...edges) - Math.min(...edges)).toBeLessThan(2);
}

for (const locale of ["vi", "en"] as const) {
  test(`fund transaction validation keeps empty and invalid amounts readable (${locale})`, async ({
    page,
  }, info) => {
    const { bank } = await setup(page);
    await page
      .context()
      .addCookies([{ name: "fm-locale", value: locale, url: origin() }]);
    await page.reload();
    const english = locale === "en";
    await page
      .getByRole("button", {
        name: english ? "Record transaction" : "Ghi giao dịch",
        exact: true,
      })
      .click();
    const dialog = page.getByRole("dialog");
    const amount = dialog.getByLabel(
      english ? "Amount (VND)" : "Số tiền (VND)",
      { exact: true },
    );
    const note = dialog.getByLabel(english ? "Note" : "Ghi chú", {
      exact: true,
    });
    await dialog
      .getByRole("combobox", {
        name: english ? "Holding locations" : "Nơi giữ tiền",
        exact: true,
      })
      .selectOption(bank);
    await note.fill("Giữ bản nháp khi thiếu số tiền");
    const submit = dialog.getByRole("button", {
      name: english ? "Preview changes" : "Xem trước thay đổi",
      exact: true,
    });
    const requests: string[] = [];
    page.on("request", (request) => {
      if (
        request.method() === "POST" &&
        /\/api\/v1\/funds\//.test(request.url())
      )
        requests.push(request.url());
    });
    for (const [value, message] of [
      [
        "",
        english ? "Enter the transaction amount." : "Nhập số tiền giao dịch.",
      ],
      [
        "0",
        english ? "Amount must be greater than 0." : "Số tiền phải lớn hơn 0.",
      ],
      [
        "1234567890123456789012345",
        english
          ? "Enter a non-negative whole VND amount, up to 24 digits."
          : "Nhập số tiền VND nguyên, không âm, tối đa 24 chữ số.",
      ],
      [
        "",
        english ? "Enter the transaction amount." : "Nhập số tiền giao dịch.",
      ],
    ]) {
      await amount.fill(value);
      await submit.click();
      await expect(amount).toHaveAttribute("aria-invalid", "true");
      await expect(amount).toBeFocused();
      await expect(amount).toHaveAccessibleDescription(
        new RegExp(message.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      );
      await expect(dialog.locator(".fund-field-error")).toHaveText(message);
      const toast = dialog.locator('[data-toast-kind="error"]');
      await expect(toast).toContainText(
        english
          ? "Check the highlighted fields."
          : "Kiểm tra các trường được đánh dấu.",
      );
      await expect(dialog).not.toContainText(
        /invalid_format|"pattern"|"origin"|"path"/,
      );
      await expect(note).toHaveValue("Giữ bản nháp khi thiếu số tiền");
      expect(requests).toHaveLength(0);
    }
    await page.screenshot({
      path: info.outputPath(`fund-empty-amount-${locale}.png`),
    });
    await amount.fill("1000000");
    await expect(amount).not.toHaveAttribute("aria-invalid", "true");
    await expect(dialog.locator(".fund-field-error")).toHaveCount(0);
    await submit.click();
    await expect(
      dialog.getByRole("region", {
        name: english ? "Preview changes" : "Xem trước thay đổi",
        exact: true,
      }),
    ).toBeVisible();
    expect(requests).toHaveLength(1);
    expect((await view(page)).book?.revisions).toHaveLength(0);
    await dialog
      .getByRole("button", {
        name: english ? "Confirm save" : "Xác nhận lưu",
        exact: true,
      })
      .click();
    await expect(dialog).toBeHidden();
    const saved = await view(page);
    expect(saved.book?.revisions).toHaveLength(1);
    expect(saved.book?.revisions[0].transaction).toMatchObject({
      amount: "1000000",
      note: "Giữ bản nháp khi thiếu số tiền",
    });
  });
}

for (const locale of ["vi", "en"] as const) {
  test(`transaction columns and icon actions stay aligned in page and all fund dialogs (${locale})`, async ({
    page,
  }, info) => {
    const s = await setup(page);
    await post(page, s.bank, "123456789012345678901234", {
      note:
        "Đối soát khoản dự phòng dài hạn. ".repeat(4) + "ghi_chú_".repeat(12),
    });
    await post(page, s.bank, "1200000", { fundId: "rainy_day" });
    await post(page, s.bank, "8000000", { fundId: "sinking" });
    await post(page, s.bank, "250000", {
      kind: "transfer",
      toFundId: "rainy_day",
      toLocationId: s.cash,
      note: "Chuyển dự phòng phát sinh sang nơi giữ tiền mặt",
    });
    await page
      .context()
      .addCookies([{ name: "fm-locale", value: locale, url: origin() }]);
    await page.reload();
    const english = locale === "en";
    const editName = english ? "Edit transaction" : "Sửa giao dịch";
    const voidName = english ? "Void transaction" : "Hủy giao dịch";
    const closeName = english ? "Close" : "Đóng";
    const ledger = page.locator(".fund-workspace > .panel .fund-ledger");
    await expect(ledger.locator(".fund-transaction")).toHaveCount(4);

    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await expectLedgerLayout(ledger);
      await ledger.screenshot({
        path: `artifacts/fund-transactions-2026-11-02/after/${locale}-${info.project.name}-page-${width}.png`,
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    for (const width of [479, 480, 481, 699, 700, 701]) {
      await ledger.evaluate((element, size) => {
        element.style.width = `${size}px`;
      }, width);
      await expectLedgerLayout(ledger);
    }
    await ledger.evaluate((element) => {
      element.style.removeProperty("width");
    });

    for (const fund of ["Emergency Fund", "Rainy Day Fund", "Sinking Fund"]) {
      await page
        .getByRole("button", {
          name: new RegExp(fund),
        })
        .click();
      const dialog = page.getByRole("dialog");
      await dialog
        .getByRole("tab", {
          name: english ? "Transactions" : "Giao dịch",
          exact: true,
        })
        .click();
      const detailLedger = dialog.locator(".fund-ledger");
      const edit = detailLedger
        .getByRole("button", { name: editName, exact: true })
        .first();
      const cancel = detailLedger
        .getByRole("button", { name: voidName, exact: true })
        .first();
      await expect(edit).toHaveAttribute("title", editName);
      await expect(cancel).toHaveAttribute("title", voidName);
      for (const width of [1440, 768, 390, 320]) {
        await page.setViewportSize({ width, height: 1000 });
        await expectLedgerLayout(detailLedger);
      }
      await detailLedger.screenshot({
        path: `artifacts/fund-transactions-2026-11-02/after/${locale}-${info.project.name}-${fund}-320.png`,
      });
      await edit.focus();
      await expect(edit).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("dialog").last()).toContainText(editName);
      await page
        .getByRole("dialog")
        .last()
        .getByRole("button", { name: closeName, exact: true })
        .click();
      await cancel.focus();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("dialog").last()).toContainText(voidName);
      await page
        .getByRole("dialog")
        .last()
        .getByRole("button", { name: closeName, exact: true })
        .click();
      await dialog
        .getByRole("button", { name: closeName, exact: true })
        .click();
      await page.setViewportSize({ width: 1440, height: 1000 });
    }

    await page
      .getByRole("button", {
        name: english ? "Hide amounts" : "Ẩn số tiền",
        exact: true,
      })
      .click();
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await page.setViewportSize({ width: 320, height: 1000 });
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "125%";
    });
    await expectLedgerLayout(ledger);
    await expect(ledger).not.toContainText("123.456.789");
    await expect(ledger).not.toContainText("123,456,789");
    await ledger.screenshot({
      path: `artifacts/fund-transactions-2026-11-02/after/${locale}-${info.project.name}-page-320-dark-private-large-text.png`,
    });
    await page
      .getByRole("button", {
        name: english ? "Show amounts" : "Hiện số tiền",
        exact: true,
      })
      .click();
    await expectLedgerLayout(ledger);
    await ledger.screenshot({
      path: `artifacts/fund-transactions-2026-11-02/after/${locale}-${info.project.name}-page-320-dark-large-text.png`,
    });
  });
}

test("onboarding links living expense, requires user x, previews without writing and saves priorities", async ({
  page,
}) => {
  await login(page);
  expect((await view(page)).book).toBeNull();
  await source(page);
  await page.reload();
  await page.getByRole("button", { name: "Bắt đầu xây quỹ" }).click();
  await page.getByLabel(/Sinh hoạt thiết yếu/).check();
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  const emergency = page.getByLabel("Emergency Fund — hệ số x", {
    exact: true,
  });
  await expect(emergency).toHaveValue("");
  await emergency.fill("6");
  await page.getByLabel("Rainy Day Fund — hệ số x", { exact: true }).fill("1");
  await page.getByLabel("Sinking Fund — hệ số x", { exact: true }).fill("2,5");
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await page
    .getByRole("button", { name: "Ưu tiên Rainy Day Fund lên", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Xem trước thay đổi", exact: true })
    .click();
  expect((await view(page)).book).toBeNull();
  await expect(
    page.getByRole("region", { name: "Xem trước thay đổi" }),
  ).toContainText("54.000.000");
  await expect(
    page.getByRole("table", { name: "Các giá trị thay đổi" }),
  ).toContainText("Trước");
  await expect(
    page.getByRole("table", { name: "Các giá trị thay đổi" }),
  ).toContainText("Chênh lệch");
  await page.getByRole("button", { name: "Xác nhận lưu", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.locator('[data-toast-kind="success"]')).toContainText(
    "Đã lưu thay đổi",
  );
  await expect(page.locator(".fund-next")).toContainText("Rainy Day Fund");
  expect((await view(page)).book?.configurations[0].priority[0]).toBe(
    "rainy_day",
  );
});
test("nested transactions, atomic transfers, corrections and filters retain parent state", async ({
  page,
}) => {
  const s = await setup(page);
  await page
    .getByRole("button", { name: "Xem Emergency Fund", exact: true })
    .click();
  await page.getByRole("tab", { name: "Giao dịch", exact: true }).click();
  const parent = page.locator("dialog").first();
  await parent.getByLabel("Tìm giao dịch", { exact: true }).fill("bổ sung");
  await parent
    .getByRole("button", { name: "Ghi giao dịch", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Nơi giữ tiền", exact: true })
    .selectOption(s.bank);
  await page.getByLabel("Số tiền (VND)", { exact: true }).fill("1000000");
  await page.getByLabel("Ghi chú", { exact: true }).fill("bổ sung dự phòng");
  await save(page);
  await expect(parent).toBeVisible();
  await expect(parent.getByLabel("Tìm giao dịch")).toHaveValue("bổ sung");
  await expect(parent.locator(".fund-transaction")).toHaveCount(1);
  await parent
    .getByRole("button", { name: "Sửa giao dịch", exact: true })
    .click();
  await page.getByLabel("Số tiền (VND)", { exact: true }).fill("1200000");
  await page.getByLabel("Lý do sửa hoặc hủy").fill("Đối soát lại");
  await save(page);
  await expect(parent).toContainText("1.200.000");
  await parent.getByRole("button", { name: "Đóng", exact: true }).click();
  await page
    .locator(".fund-ledger")
    .getByRole("button", { name: "Ghi giao dịch", exact: true })
    .click();
  await page
    .getByLabel("Loại giao dịch", { exact: true })
    .selectOption("transfer");
  await page.getByLabel("Quỹ nguồn", { exact: true }).selectOption("emergency");
  await page.getByLabel("Nơi nguồn", { exact: true }).selectOption(s.bank);
  await page.getByLabel("Quỹ nhận", { exact: true }).selectOption("rainy_day");
  await page.getByLabel("Nơi nhận", { exact: true }).selectOption(s.cash);
  await page.getByLabel("Số tiền (VND)", { exact: true }).fill("200000");
  await expect(page.locator(".money-input-hint")).toContainText("200.000 ₫");
  await page.getByLabel("Lý do giao dịch", { exact: true }).fill("Phân bổ lại");
  const transferDialog = page.getByRole("dialog");
  await transferDialog
    .getByRole("button", { name: "Xem trước thay đổi" })
    .click();
  const changes = transferDialog.getByRole("table", {
    name: "Các giá trị thay đổi",
  });
  await expect(
    changes.locator(".fund-change-row:not(.fund-change-header)"),
  ).toHaveCount(2);
  await expect(changes).toContainText("−200.000 ₫");
  await expect(changes).toContainText("+200.000 ₫");
  await transferDialog.getByRole("button", { name: "Xác nhận lưu" }).click();
  await expect(transferDialog).toBeHidden();
  await expect
    .poll(async () => (await view(page)).state.funds.map((f) => f.balance))
    .toEqual(["1000000", "200000", "0"]);
  expect((await view(page)).state.contributed).toBe("1200000");
  await page.getByLabel("Quỹ lọc", { exact: true }).selectOption("rainy_day");
  await expect(page.locator(".fund-transaction")).toHaveCount(1);
  await expect(page.locator(".fund-transaction")).toContainText("Phân bổ lại");
});
test("changed living source stays pending until preview and explicit acceptance", async ({
  page,
}) => {
  const s = await setup(page);
  await expense(page, {
    type: "configureJar",
    jarId: s.jar,
    month,
    name: "Sinh hoạt thiết yếu",
    description: "",
    method: "Tiền mặt",
    group: "",
    amount: "10000000",
  });
  await page.reload();
  await expect(page.locator(".fund-source-change")).toBeVisible();
  await expect(page.locator('[data-fund="emergency"]')).toContainText(
    "54.000.000",
  );
  await page
    .getByRole("button", { name: "Xem lại mức sinh hoạt", exact: true })
    .click();
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await page
    .getByRole("button", { name: "Xem trước thay đổi", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Xem trước thay đổi" }),
  ).toContainText("60.000.000");
  expect((await view(page)).state.funds[0].target).toBe("54000000");
  await page.getByRole("button", { name: "Xác nhận lưu", exact: true }).click();
  await expect(page.locator(".fund-source-change")).toHaveCount(0);
  await expect(page.locator('[data-fund="emergency"]')).toContainText(
    "60.000.000",
  );
});
test("version conflicts preserve drafts and lost save responses retry once", async ({
  page,
}) => {
  const s = await setup(page);
  await page
    .locator('[data-fund="emergency"]')
    .getByRole("button", { name: "Thêm tiền", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Nơi giữ tiền", exact: true })
    .selectOption(s.bank);
  await page.getByLabel("Số tiền (VND)", { exact: true }).fill("100");
  await page
    .getByRole("button", { name: "Xem trước thay đổi", exact: true })
    .click();
  await post(page, s.bank, "5");
  await page.getByRole("button", { name: "Xác nhận lưu", exact: true }).click();
  await expect(
    page.getByRole("dialog").locator(".expense-error"),
  ).toContainText("Dữ liệu đã đổi");
  await page
    .getByRole("button", {
      name: "Tải dữ liệu mới, giữ nội dung nhập",
      exact: true,
    })
    .click();
  await expect(page.getByLabel("Số tiền (VND)", { exact: true })).toHaveValue(
    "100",
  );
  await page
    .getByRole("button", { name: "Xem trước thay đổi", exact: true })
    .click();
  await page.route(
    "**/api/v1/funds/commands",
    async (route) => {
      await route.fetch();
      await route.abort();
    },
    { times: 1 },
  );
  await page.getByRole("button", { name: "Xác nhận lưu", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Chưa xác nhận kết quả lưu",
  );
  await expect(
    page.getByLabel("Số tiền (VND)", { exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Xác nhận lưu", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  expect((await view(page)).state.total).toBe("105");
  expect((await view(page)).book?.revisions).toHaveLength(2);
});
for (const progressTheme of ["gold", "fire", "earth"] as const)
  test(`real progress scenes, privacy, reduced motion, keyboard and responsive ${progressTheme} theme`, async ({
    page,
  }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(
      (theme) => localStorage.setItem("fm-visual-theme", theme),
      progressTheme,
    );
    const s = await setup(page);
    await expect(
      page.locator('[data-fund="emergency"] .fund-scene'),
    ).toHaveAttribute("data-progress", "0");
    await post(page, s.bank, "13500000");
    await page.reload();
    await expect(
      page.locator('[data-fund="emergency"] .fund-scene'),
    ).toHaveAttribute("data-progress", "0.25");
    await expect(
      page.locator(
        `[data-fund="emergency"] .fund-scene > [data-visual-only="${progressTheme}"]`,
      ),
    ).toBeVisible();
    await post(page, s.bank, "13500000");
    await post(page, s.bank, "6750000", { fundId: "rainy_day" });
    await post(page, s.bank, "9000000", { fundId: "sinking" });
    await page.reload();
    await expect(
      page.locator('[data-fund="emergency"] .fund-scene'),
    ).toHaveAttribute("data-progress", "0.5");
    await expect(
      page.locator('[data-fund="rainy_day"] .fund-scene'),
    ).toHaveAttribute("data-progress", "0.75");
    await page.screenshot({
      path: `artifacts/funds-${progressTheme}-light-${info.project.name}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Ẩn số tiền", exact: true }).click();
    await expect(page.locator(".fund-workspace")).not.toContainText(
      "27.000.000",
    );
    await expect(page.locator('[data-fund="emergency"]')).toContainText(
      "50,00%",
    );
    await page
      .locator('[data-fund="emergency"]')
      .getByRole("button", { name: "Thêm tiền", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Xem trước thay đổi", exact: true }),
    ).toBeDisabled();
    await page
      .getByRole("button", { name: "Hiện tiền trong cửa sổ này", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Xem trước thay đổi", exact: true }),
    ).toBeEnabled();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Đóng", exact: true })
      .click();
    await expect(page.locator(".fund-workspace")).not.toContainText(
      "27.000.000",
    );
    await page
      .getByRole("button", { name: "Hiện số tiền", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Xem Emergency Fund", exact: true })
      .click();
    await page.getByRole("tab", { name: "Hướng dẫn", exact: true }).focus();
    await page.keyboard.press("End");
    await expect(
      page.getByRole("tab", { name: "Lịch sử", exact: true }),
    ).toBeFocused();
    await expect(
      page.getByRole("tab", { name: "Lịch sử", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Đóng", exact: true })
      .click();
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `artifacts/funds-${progressTheme}-dark-${info.project.name}.png`,
      fullPage: true,
    });
    expect(
      await page
        .locator(".fund-scene")
        .first()
        .evaluate(
          (el) => getComputedStyle(el.querySelector("g")!).animationName,
        ),
    ).toBe("none");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
    await post(page, s.bank, "81000000");
    await page.reload();
    await expect(
      page.locator('[data-fund="emergency"] .fund-scene'),
    ).toHaveAttribute("data-progress", "1");
    await expect(page.locator('[data-fund="emergency"]')).toContainText(
      "200,00%",
    );
    await expect(page.locator('[data-fund="emergency"]')).toContainText(
      "Vượt mục tiêu",
    );
  });
test("fund pages and APIs enforce auth and cookie origin, landing stays illustrative", async ({
  page,
}) => {
  await page.goto("/funds");
  await expect(page).toHaveURL(/\/login\?next=%2Ffunds$/);
  expect((await page.request.get("/api/v1/funds")).status()).toBe(401);
  await login(page);
  expect(
    (
      await page.request.post("/api/v1/funds/commands", {
        headers: { origin: "https://other.example" },
        data: {},
      })
    ).status(),
  ).toBe(403);
  expect(
    (await page.request.get("/api/v1/funds")).headers()["cache-control"],
  ).toBe("private, no-store");
  const calls: string[] = [];
  page.on("request", (r) => {
    if (/\/api\/v1\/(expenses|income|savings|investments|funds)/.test(r.url()))
      calls.push(r.url());
  });
  await page.goto("/");
  const preview = page.locator(".product-preview");
  await preview.getByRole("tab", { name: "Quỹ an toàn", exact: true }).click();
  await expect(preview.getByRole("tabpanel")).toContainText("42.750.000");
  await expect(preview.locator('[data-scene="emergency"]')).toBeVisible();
  await preview.getByRole("button", { name: "Ẩn số tiền minh họa" }).click();
  await expect(preview.getByRole("tabpanel")).not.toContainText("42.750.000");
  expect(calls).toEqual([]);
});

test("locations archive only at zero; canceled entries remain in history and lists paginate", async ({
  page,
}) => {
  const s = await setup(page);
  await page.getByRole("button", { name: "Nơi giữ tiền", exact: true }).click();
  await page
    .getByRole("button", { name: "Thêm nơi giữ tiền", exact: true })
    .click();
  await page
    .getByLabel("Tên nơi giữ tiền", { exact: true })
    .fill("Ví dự phòng");
  await save(page);
  await expect(page.locator("dialog").first()).toContainText("Ví dự phòng");
  await page
    .getByRole("button", { name: "Sửa Ví dự phòng", exact: true })
    .click();
  await page.getByLabel("Đang sử dụng", { exact: true }).uncheck();
  await save(page);
  const parent = page.locator("dialog").first();
  await expect(parent).toContainText("Đã ngừng sử dụng");
  await parent
    .getByRole("button", { name: "Sửa Ví dự phòng", exact: true })
    .click();
  await page.getByLabel("Đang sử dụng", { exact: true }).check();
  await save(page);
  await parent.getByRole("button", { name: "Đóng", exact: true }).click();
  for (let i = 0; i < 21; i++)
    await post(page, s.bank, "1", { note: `Khoản kiểm tra ${i}` });
  await page.reload();
  await expect(page.locator(".fund-transaction")).toHaveCount(20);
  await page.getByRole("button", { name: "Trang sau", exact: true }).click();
  await expect(page.locator(".fund-transaction")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Hủy giao dịch", exact: true })
    .click();
  await page
    .getByLabel("Lý do sửa hoặc hủy", { exact: true })
    .fill("Ghi trùng");
  await save(page);
  await expect(page.locator(".fund-pagination")).toContainText("20 giao dịch");
  expect((await view(page)).book?.revisions).toHaveLength(22);
  await page.getByRole("button", { name: "Nơi giữ tiền", exact: true }).click();
  await page
    .getByRole("button", { name: "Sửa Ngân hàng", exact: true })
    .click();
  await page.getByLabel("Đang sử dụng", { exact: true }).uncheck();
  await page
    .getByRole("button", { name: "Xem trước thay đổi", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").locator(".expense-error"),
  ).toContainText("bằng 0");
});
test("foreground refresh keeps drafts on network failure and clears data on auth expiry", async ({
  page,
}) => {
  const s = await setup(page);
  await post(page, s.bank, "1234567");
  await page.reload();
  await expect(page.locator(".fund-workspace")).toContainText("1.234.567");
  await page
    .locator('[data-fund="emergency"]')
    .getByRole("button", { name: "Thêm tiền", exact: true })
    .click();
  await page.getByLabel("Số tiền (VND)", { exact: true }).fill("500");
  await page.route("**/api/v1/funds", (route) =>
    route.fulfill({
      status: 503,
      json: { error: "Kết nối kiểm thử tạm gián đoạn" },
    }),
  );
  await page.clock.setFixedTime(Date.now() + 61000);
  await page.evaluate(() => {
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("focus"));
  });
  await expect(page.locator(".fund-workspace > [role=alert]")).toContainText(
    "Kết nối kiểm thử",
  );
  await expect(page.getByLabel("Số tiền (VND)", { exact: true })).toHaveValue(
    "500",
  );
  await expect(page.locator(".fund-health")).toContainText("1.234.567");
  await expect(page.locator(".fund-workspace > .loading-status")).toHaveCount(
    0,
  );
  await page.unroute("**/api/v1/funds");
  await page.route("**/api/v1/funds", (route) =>
    route.fulfill({
      status: 401,
      json: { error: "Phiên đã hết hạn", code: "UNAUTHENTICATED" },
    }),
  );
  await page.context().clearCookies();
  await page.clock.setFixedTime(Date.now() + 80000);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(page).toHaveURL(/\/login\?next=%2Ffunds$/);
  await expect(page.locator(".fund-health")).toHaveCount(0);
});
