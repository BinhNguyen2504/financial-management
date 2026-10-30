"use client";
import { useState } from "react";
import { ArrowDown, ArrowUp, Plus } from "lucide-react";
import { useMoney } from "@/components/privacy";
import { useToast } from "@/components/toast";
import { LoadingStatus } from "@/components/loading";
import { StatusBadge } from "@/components/status-badge";
import { HelpPageTitle } from "@/features/help/provider";
import { formatDate, formatDecimal } from "@/i18n/format";
import { useI18n } from "@/i18n/provider";
import type { GoalAction } from "@/domain/goals/schema";
import { useGoals } from "./use-goals";
import { GoalEditor } from "./editor";
import { newGoal, purposeNames, statusNames } from "./editor-config";
import { GoalDetails } from "./details";

export function GoalsWorkspace() {
  const controller = useGoals();
  return (
    <Workspace key={controller.owner ?? "guest"} controller={controller} />
  );
}
function Workspace({
  controller,
}: {
  controller: ReturnType<typeof useGoals>;
}) {
  const { view, error, reload, authLost } = controller,
    { t: tr, locale } = useI18n("goals"),
    money = useMoney(),
    toast = useToast();
  const [editor, setEditor] = useState<GoalAction | null>(null),
    [detail, setDetail] = useState<string | null>(null),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("following");
  const all = [...(view?.book?.goals ?? [])].sort((a, b) => a.rank - b.rank),
    goals = all.filter(
      (g) =>
        (filter === "all" || filter === "following"
          ? ["active", "paused"].includes(g.status) || filter === "all"
          : g.status === filter) &&
        `${g.name} ${g.note}`
          .toLocaleLowerCase()
          .includes(query.toLocaleLowerCase()),
    );
  const selected = view?.book?.goals.find((g) => g.id === detail);
  const move = (id: string, direction: number) => {
    const ids = all.map((g) => g.id),
      i = ids.indexOf(id),
      j = i + direction;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    setEditor({ type: "reorder", ids });
  };
  function saved() {
    setEditor(null);
    toast("success", tr("Đã lưu thay đổi"));
    void reload().catch(() =>
      toast("warning", tr("Đã lưu thay đổi nhưng chưa tải lại được dữ liệu.")),
    );
  }
  return (
    <div className="goals-workspace expenses-workspace">
      <header className="goal-heading">
        <div>
          <HelpPageTitle>{tr("Mục tiêu")}</HelpPageTitle>
          <p>{tr("Điều muốn đạt, từng bước chuẩn bị.")}</p>
        </div>
        <button
          className="expense-primary"
          disabled={!view}
          onClick={() => setEditor(newGoal())}
        >
          <Plus size={18} aria-hidden="true" />
          {tr("Tạo mục tiêu")}
        </button>
      </header>
      {error && (
        <div role="alert" className="expense-error">
          {tr(error)}
          <button
            className="expense-secondary"
            onClick={() => void reload().catch(() => {})}
          >
            {tr("Thử tải lại")}
          </button>
        </div>
      )}
      {!view && !error && (
        <LoadingStatus>{tr("Đang tải Mục tiêu…")}</LoadingStatus>
      )}
      {view && (
        <>
          {!all.length ? (
            <section className="goal-empty panel">
              <h2>{tr("Bắt đầu từ điều bạn muốn đạt.")}</h2>
              <p>
                {tr(
                  "Liên kết tiền đã có hoặc ghi từng khoản góp trong sổ riêng. Chọn hạn và mức góp phù hợp với bạn.",
                )}
              </p>
              <button
                className="expense-primary"
                onClick={() => setEditor(newGoal())}
              >
                {tr("Tạo mục tiêu đầu tiên")}
              </button>
            </section>
          ) : (
            <>
              <div className="goal-filters">
                <label>
                  {tr("Tìm mục tiêu")}
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
                <label>
                  {tr("Trạng thái")}
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="following">
                      {tr("Đang theo đuổi và tạm dừng")}
                    </option>
                    <option value="all">{tr("Tất cả")}</option>
                    {Object.entries(statusNames).map(([value, label]) => (
                      <option key={value} value={value}>
                        {tr(label)}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="expense-secondary"
                  onClick={() => void reload().catch(() => {})}
                >
                  {tr("Tải lại")}
                </button>
              </div>
              <div className="goal-grid">
                {goals.map((g) => {
                  const s = view.states.find((s) => s.id === g.id)!;
                  return (
                    <article key={g.id} className="goal-card" data-goal={g.id}>
                      <div className="goal-card-top">
                        <span>{tr(purposeNames[g.purpose])}</span>
                        <StatusBadge
                          tone={
                            s.ready
                              ? "success"
                              : s.overdue
                                ? "warning"
                                : "neutral"
                          }
                          size="compact"
                        >
                          {tr(
                            g.status === "active" && s.ready
                              ? "Đã đủ tiền"
                              : statusNames[g.status],
                          )}
                        </StatusBadge>
                      </div>
                      <h2>
                        <button onClick={() => setDetail(g.id)}>
                          {g.name}
                        </button>
                      </h2>
                      <p>
                        {tr(
                          g.mode === "ledger"
                            ? "Sổ góp riêng"
                            : "Liên kết dữ liệu sẵn có",
                        )}
                      </p>
                      <div className="goal-amount">
                        <strong>
                          {s.current === null
                            ? tr("Chưa đủ dữ liệu")
                            : money(s.current)}
                        </strong>
                        <span>/ {money(g.target)}</span>
                      </div>
                      <progress
                        max={100}
                        value={Math.min(100, Number(s.percent ?? "0"))}
                        aria-label={tr("Tiến độ {0}", { 0: g.name })}
                      />
                      <div className="goal-card-top">
                        <span>
                          {s.percent === null
                            ? "—"
                            : `${formatDecimal(s.percent, locale)}%`}
                        </span>
                        <span>
                          {tr("Còn thiếu")}:{" "}
                          {s.remaining === null ? "—" : money(s.remaining)}
                        </span>
                      </div>
                      <dl className="goal-facts">
                        <dt>{tr("Hạn hoàn thành")}</dt>
                        <dd>
                          {g.deadline
                            ? formatDate(g.deadline, locale)
                            : tr("Không đặt hạn")}
                        </dd>
                        <dt>{tr("Cần góp / tháng")}</dt>
                        <dd>
                          {s.requiredMonthly === null
                            ? "—"
                            : money(s.requiredMonthly)}
                        </dd>
                      </dl>
                      {s.overdue && g.status === "active" && (
                        <p className="goal-warning">{tr("Quá hạn")}</p>
                      )}
                      {s.stale && (
                        <p className="goal-warning">{tr("Định giá đã cũ")}</p>
                      )}
                      <div className="goal-actions">
                        <button
                          className="expense-secondary"
                          onClick={() => setDetail(g.id)}
                          aria-label={tr("Xem mục tiêu {0}", { 0: g.name })}
                        >
                          {tr("Chi tiết")}
                        </button>
                        <div className="goal-order">
                          <button
                            className="expense-icon-button"
                            disabled={g.rank === 0}
                            aria-label={tr("Ưu tiên {0} lên", { 0: g.name })}
                            onClick={() => move(g.id, -1)}
                          >
                            <ArrowUp size={16} />
                          </button>
                          <button
                            className="expense-icon-button"
                            disabled={g.rank === all.length - 1}
                            aria-label={tr("Ưu tiên {0} xuống", { 0: g.name })}
                            onClick={() => move(g.id, 1)}
                          >
                            <ArrowDown size={16} />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
              {!goals.length && <p>{tr("Không có mục tiêu phù hợp.")}</p>}
            </>
          )}
          <p className="goal-note">
            {tr(
              "Các cột mốc có thể trùng nguồn; không cộng tiến độ thành tổng tài sản. Sổ riêng độc lập với các module khác.",
            )}
          </p>
        </>
      )}
      {selected && view && (
        <GoalDetails
          goal={selected}
          view={view}
          onClose={() => setDetail(null)}
          onEdit={setEditor}
        />
      )}
      {editor && view && (
        <GoalEditor
          initial={editor}
          view={view}
          onClose={() => setEditor(null)}
          onSaved={saved}
          onReload={reload}
          onAuthLost={() => {
            setEditor(null);
            setDetail(null);
            authLost();
          }}
        />
      )}
    </div>
  );
}
