"use client";
import { ThemeIcon, ThemeText } from "@/components/theme-decoration";
import { HelpButton, HelpPageTitle } from "@/features/help/provider";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useUser } from "@/features/profile/user-provider";
import { LoadingStatus } from "@/components/loading";
import { useMoney } from "@/components/privacy";
import { useForegroundRefresh } from "@/components/use-foreground-refresh";
import { focusPointerControl } from "@/components/pointer-focus";
import { ExpenseModal } from "@/features/expenses/modal";
import { useToast } from "@/components/toast";
import type { FundId } from "@/domain/funds/schema";
import type { FundView } from "@/domain/funds/types";
import { FundEditor, type EditorMode } from "./editor";
import { FundDetails, FundGuide, FundLocations } from "./details";
import { FundLedger } from "./ledger";
import { ProgressScene } from "./progress-scene";
import { fundNames, guides } from "./content";
import { fundsJSON, FundAPIError } from "./api";
export function FundsWorkspace() {
  const toast = useToast();
  const { user } = useUser(),
    router = useRouter(),
    money = useMoney();
  const [view, setView] = useState<FundView | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [detail, setDetail] = useState<FundId | "locations" | null>(null),
    [editor, setEditor] = useState<EditorMode | null>(null),
    [celebration, setCelebration] = useState(0);
  const request = useRef(0),
    displayed = useRef(false),
    session = useRef(user?.id);
  const authLost = useCallback(() => {
    request.current++;
    setView(null);
    displayed.current = false;
    setEditor(null);
    setDetail(null);
    router.replace("/login?next=%2Ffunds");
  }, [router]);
  const load = useCallback(async () => {
    const ticket = ++request.current,
      owner = user?.id;
    if (!displayed.current) setLoading(true);
    try {
      const next = await fundsJSON<FundView>();
      if (ticket === request.current && session.current === owner) {
        setView(next);
        displayed.current = true;
        setError("");
      }
      return next;
    } catch (e) {
      if (ticket === request.current && session.current === owner) {
        if (e instanceof FundAPIError && e.status === 401) authLost();
        else
          setError(e instanceof Error ? e.message : "Không thể tải dữ liệu.");
      }
      throw e;
    } finally {
      if (ticket === request.current) setLoading(false);
    }
  }, [user?.id, authLost]);
  const reload = useForegroundRefresh(load, Boolean(user));
  useEffect(() => {
    session.current = user?.id;
    request.current++;
    setView(null);
    displayed.current = false;
    setEditor(null);
    setDetail(null);
    if (user) void reload().catch(() => {});
    return () => {
      request.current++;
    };
  }, [user?.id, reload]);
  useEffect(() => {
    if (!user) return;
    const now = Date.now(),
      day = 86400000,
      next = day - ((now + 7 * 3600000) % day);
    const timer = setTimeout(() => void reload().catch(() => {}), next + 100);
    return () => clearTimeout(timer);
  }, [user, view?.now, reload]);
  const config = view?.book?.configurations.at(-1),
    next = config?.priority.find(
      (id) => BigInt(view!.state.funds.find((f) => f.id === id)!.missing) > 0n,
    );
  const saved = () => {
    setEditor(null);
    void reload()
      .then(() => setCelebration((n) => n + 1))
      .catch(() =>
        toast("warning", "Đã lưu thay đổi nhưng chưa tải lại được dữ liệu."),
      );
  };
  return (
    <div className="fund-workspace" onMouseDownCapture={focusPointerControl}>
      <header className="fund-heading">
        <div>
          <p className="eyebrow">
            <ThemeIcon size={16} /> <ThemeText name="fundsEyebrow" />
          </p>
          <HelpPageTitle>Vững vàng trước những ngày bất ngờ.</HelpPageTitle>
          <p>Từng khoản dự phòng nhỏ, một nền tảng an tâm hơn.</p>
        </div>
        {view?.book && (
          <div className="fund-actions">
            <button
              className="expense-secondary"
              onClick={() => setDetail("locations")}
            >
              Nơi giữ tiền
            </button>
            <button
              className="expense-secondary"
              onClick={() => setEditor({ type: "configure" })}
            >
              Điều chỉnh mục tiêu
            </button>
          </div>
        )}
      </header>
      {loading && !view && (
        <LoadingStatus>
          <ThemeText name="fundsLoading" />
        </LoadingStatus>
      )}
      {error && (
        <div role="alert" className="expense-error">
          {error}
          <button
            className="expense-secondary"
            onClick={() => void reload().catch(() => {})}
          >
            Thử tải lại
          </button>
        </div>
      )}
      {view && !view.book && (
        <>
          <section className="fund-welcome panel">
            <div>
              <span className="pill">
                <ShieldCheck size={16} aria-hidden="true" /> Chuẩn bị theo nhịp
                của bạn
              </span>
              <h2>Hiểu trước, bắt đầu từng chút.</h2>
              <p>
                Chọn chi phí sinh hoạt từ Chi tiêu, tự đặt quy mô cho ba quỹ rồi
                ghi lại tiền đã dành riêng. Mỗi quỹ có một vai trò, một hành
                trình lớn lên.
              </p>
              <button
                className="expense-primary"
                onClick={() => setEditor({ type: "configure" })}
              >
                Bắt đầu xây quỹ <ArrowRight size={17} aria-hidden="true" />
              </button>
              <p className="fund-note">
                Tiền trong Fund được ghi độc lập; Financial Goals có không gian
                riêng.
              </p>
            </div>
            <ProgressScene fund="emergency" percent="35" />
          </section>
          <div className="fund-card-grid">
            {(["emergency", "rainy_day", "sinking"] as FundId[]).map((id) => (
              <article className="fund-card" key={id}>
                <ProgressScene fund={id} percent="0" />
                <p className="eyebrow">
                  <ThemeText name={id} />
                </p>
                <h2>{fundNames[id]}</h2>
                <p>{guides[id].concept}</p>
                <details>
                  <summary>Tìm hiểu cách xây quỹ</summary>
                  <FundGuide fund={id} />
                </details>
              </article>
            ))}
          </div>
        </>
      )}
      {view?.book && config && (
        <>
          <section className="fund-health" aria-label="Sức đệm tài chính">
            <div>
              <span>Tổng dự phòng</span>
              <strong>{money(view.state.total)}</strong>
            </div>
            <div>
              <span>Tổng mục tiêu</span>
              <strong>{money(view.state.target)}</strong>
            </div>
            <div>
              <span>Còn thiếu từng quỹ cộng lại</span>
              <strong>{money(view.state.missing)}</strong>
            </div>
            <div>
              <span>Emergency đủ trang trải</span>
              <strong>
                {view.state.emergencyMonths.replace(".", ",")} tháng
              </strong>
            </div>
          </section>
          <section className="fund-living panel">
            <div>
              <h2>Nền tảng sinh hoạt</h2>
              <HelpButton
                pageId="funds"
                sectionId="living"
                label="Mức sinh hoạt và mục tiêu"
              />
              <p>
                <strong>{money(config.living.total)}/tháng</strong> · Mức đã xác
                nhận từ tháng{" "}
                {config.living.month.split("-").reverse().join("/")}
              </p>
              <p className="fund-note">
                Số tháng Emergency dùng mức sinh hoạt này.
              </p>
            </div>
            <details>
              <summary>Xem các hũ cấu thành</summary>
              {config.living.items.map((i) => (
                <p key={i.jarId}>
                  {i.name} <strong>{money(i.amount)}</strong>
                </p>
              ))}
              <Link href="/budgets">Mở Chi tiêu →</Link>
            </details>
          </section>
          {view.sourceChanged && (
            <section className="fund-source-change" role="status">
              <strong>Chi phí sinh hoạt có thay đổi.</strong>
              <p>
                {view.sourceUnavailable
                  ? "Một số hũ đã ngừng hoạt động hoặc mức sinh hoạt không còn phù hợp. Hãy chọn lại nguồn."
                  : `Mức hiện tại từ Chi tiêu: ${money(view.proposedLiving!.total)}/tháng. Xem chênh lệch trước khi áp dụng.`}{" "}
                Mục tiêu đã xác nhận đang được giữ.
              </p>
              <button
                className="expense-secondary"
                onClick={() => setEditor({ type: "configure" })}
              >
                Xem lại mức sinh hoạt
              </button>
            </section>
          )}
          <section className="fund-next">
            <span className="fund-next-icon">
              <ThemeIcon size={24} />
            </span>
            <div>
              <p className="eyebrow">BƯỚC TIẾP THEO CỦA BẠN</p>
              {next ? (
                <>
                  <h2>
                    <ThemeText name="nextFund" /> {fundNames[next]}.
                  </h2>
                  <p>
                    Còn{" "}
                    {money(
                      view.state.funds.find((f) => f.id === next)!.missing,
                    )}{" "}
                    theo mục tiêu bạn chọn. Bắt đầu bằng một khoản vừa sức.
                  </p>
                </>
              ) : (
                <>
                  <h2>Ba quỹ đã đủ mức bạn đặt.</h2>
                  <p>
                    Duy trì dự phòng và xem lại khi nhu cầu sinh hoạt thay đổi.
                  </p>
                </>
              )}
            </div>
            {next && (
              <button
                className="expense-primary"
                onClick={() =>
                  setEditor({
                    type: "transaction",
                    fundId: next,
                    kind: "deposit",
                  })
                }
              >
                Thêm tiền
              </button>
            )}
          </section>
          <div className="fund-card-grid">
            {view.state.funds.map((f) => (
              <article className="fund-card" key={f.id} data-fund={f.id}>
                <ProgressScene
                  key={`${f.id}-${celebration}`}
                  fund={f.id}
                  percent={f.percent}
                  animate={celebration > 0}
                />
                <div className="fund-card-title">
                  <p className="eyebrow">
                    <ThemeText name={f.id} />
                  </p>
                  <span className="fund-percentage">
                    {f.percent.replace(".", ",")}%
                  </span>
                </div>
                <h2>{fundNames[f.id]}</h2>
                <p className="fund-balance">{money(f.balance)}</p>
                <p>
                  Mục tiêu {money(f.target)} · {config.multipliers[f.id]} tháng
                </p>
                <p className="fund-note">
                  {BigInt(f.excess) > 0n
                    ? `Vượt mục tiêu ${money(f.excess)}`
                    : BigInt(f.missing) > 0n
                      ? `Còn ${money(f.missing)} để đủ mức bạn chọn`
                      : "Đã đủ mức dự phòng"}
                </p>
                <div className="fund-actions">
                  <button
                    className="expense-secondary"
                    aria-label={`Xem ${fundNames[f.id]}`}
                    onClick={() => setDetail(f.id)}
                  >
                    Chi tiết
                  </button>
                  <button
                    className="expense-primary"
                    onClick={() =>
                      setEditor({
                        type: "transaction",
                        fundId: f.id,
                        kind: "deposit",
                      })
                    }
                  >
                    Thêm tiền
                  </button>
                </div>
              </article>
            ))}
          </div>
          <div className="panel">
            <FundLedger view={view} onEdit={setEditor} />
          </div>
        </>
      )}
      {view?.book &&
        detail &&
        (detail === "locations" ? (
          <ExpenseModal
            title="Nơi giữ tiền"
            size="detail"
            onClose={() => setDetail(null)}
          >
            <FundLocations view={view} onEdit={setEditor} />
          </ExpenseModal>
        ) : (
          <FundDetails
            fund={detail}
            view={view}
            onClose={() => setDetail(null)}
            onEdit={setEditor}
          />
        ))}
      {view && editor && (
        <FundEditor
          mode={editor}
          view={view}
          refresh={reload}
          onSaved={saved}
          onClose={() => setEditor(null)}
          onAuthLost={authLost}
        />
      )}
    </div>
  );
}
