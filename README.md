# Financial Manager

Ứng dụng quản lý tài chính cá nhân thay thế workflow Notion: **web PWA trên điện thoại và máy tính → cloud có đăng nhập, đồng bộ nhiều thiết bị → Flutter iOS cài trên iPhone cá nhân ở giai đoạn sau**.

## Trạng thái hiện tại

**Thu nhập, Chi tiêu và Tiết kiệm đã được triển khai trong source**. Có Auth email, HTTP API v1 và migration PostgreSQL/RLS. Các khu vực khác vẫn là bộ khung P0.

**Chi tiêu:** hũ chi tháng/tích lũy, tự tính tiền bỏ hũ, nhập số dư, sử dụng tích lũy, cấu hình có hiệu lực, báo cáo bảng/biểu đồ và chốt/xuất backup từng năm.

**Thu nhập:** danh mục cố định có hiệu lực theo tháng, tổng thực nhận riêng mỗi tháng, khoản phát sinh một lần, báo cáo bảng/biểu đồ và xuất CSV. Xem [đặc tả Thu nhập](docs/features/income.md).

**Tiết kiệm:** tiền/ví, từng sổ tiền gửi và đợt mua vàng; rút/bán, lãi thực nhận, tái tục, giá lịch sử, báo cáo xuyên năm, chốt/mở lại tháng và CSV/JSON. Xem [đặc tả và migration Tiết kiệm](docs/features/savings.md). Chưa tự đồng bộ số dư với Thu nhập/Chi tiêu; chưa áp dụng migration Tiết kiệm lên cloud.

Trang `/` là landing công khai với preview tương tác bằng dữ liệu minh họa. Mọi trang ứng dụng yêu cầu đăng nhập; khi chưa cấu hình Auth, chuyển đến trang đăng nhập có hướng dẫn trạng thái thiết lập. Không lưu tài chính trong trình duyệt. Dấu `—` trên tổng quan vẫn là chưa có dữ liệu. Có thể sinh **bộ dữ liệu mẫu tham khảo Notion** bằng `npm run data:sample -- --owner <USER_UID>`, rồi nạp qua Supabase SQL Editor. Bộ có inspect, seed, backup và reset sau khi chốt UI/UX; không tự kết nối hoặc ghi cloud. Xem [hướng dẫn dữ liệu mẫu](docs/10-sample-data.md), [đặc tả Chi tiêu](docs/features/expenses.md) và [hướng dẫn kết nối cloud](docs/09-expenses-cloud.md).

Để xem ngay cả Tiết kiệm với dữ liệu mẫu local: `npm run data:preview`, dùng URL in ra với `review@example.test` / mã `123456`. Bản preview dùng database/Auth local riêng. Bộ bổ sung và reset đủ 22 bảng: [hướng dẫn dữ liệu review](docs/10-sample-data.md#bổ-sung-tiết-kiệm--17102026).

## Landing và truy cập ứng dụng

Landing giới thiệu sản phẩm theo tinh thần “công cụ từ nhu cầu thật”: màu Zen, câu chuyện ngắn và preview Thu nhập / Chi tiêu / Tiết kiệm. Preview dùng dữ liệu cố định, chỉ chuyển tab và che/hiện tiền, không gọi API tài chính. Người đã đăng nhập vẫn xem được landing, với avatar/hồ sơ và nút Vào ứng dụng.

`/login` dùng email + OTP hoặc liên kết email. Sau đăng nhập mặc định mở `/overview`; `next` chỉ chấp nhận đường dẫn ứng dụng trong danh sách cho phép. Các trang kiểm tra phiên phía server trước khi render, kể cả module còn đang xây dựng. Đăng xuất trở về `/`; PWA vẫn khởi đầu tại `/overview` và yêu cầu đăng nhập. Lỗi Auth tạm thời có trạng thái thử lại, khác với phiên hết hạn.

Catalog dùng chung cho trạng thái module; quy tắc trong `AGENTS.md` yêu cầu rà soát landing, preview, README và tài liệu khi thay đổi sản phẩm. Xem [đặc tả landing và xác thực](docs/features/landing.md).

## Giao diện Zen

Tổng quan và các màn hình dùng nền kem/xanh xô thơm, Nunito tiếng Việt, minh họa SVG và dark mode theo hệ thống. Tổng quan đọc dữ liệu hũ tháng hiện tại; Chi tiêu hỗ trợ emoji có thể đổi và đồng bộ, thẻ mobile có số dư/tiến độ, báo cáo donut/thanh/đường với bảng thay thế. Nút mắt ở header che số tiền trong Chi tiêu, Thu nhập và Tiết kiệm (kể cả giá/lượng vàng); form có nút hiện riêng. Chỉ tùy chọn riêng tư lưu trên thiết bị, backup/CSV vẫn chứa số đầy đủ. Xem [hướng UI/UX](docs/04-ux-direction.md).

## Đọc bản kế hoạch

| Tài liệu | Nội dung |
| --- | --- |
| [00 — Phân tích Notion](docs/00-notion-analysis.md) | Ánh xạ 13 ảnh, các vấn đề dữ liệu và thay đổi cần thiết |
| [01 — Phạm vi và lộ trình](docs/01-product-plan.md) | Giai đoạn, phụ thuộc và điều kiện nghiệm thu |
| [02 — Kiến trúc và công nghệ](docs/02-architecture.md) | Stack, API dùng chung và hướng iOS |
| [03 — Mô hình dữ liệu](docs/03-data-model.md) | Sổ giao dịch, tài khoản, quỹ, đầu tư và các nguyên tắc tính |
| [04 — UI/UX](docs/04-ux-direction.md) | Điều hướng, nhập liệu, dashboard và PWA |
| [05 — Deploy và vận hành](docs/05-deployment.md) | Local, preview, production, sao lưu và rollback |
| [06 — Làm rõ nghiệp vụ](docs/06-feature-discovery.md) | Mẫu mô tả tính năng và các câu hỏi còn mở |
| [07 — Xác minh](docs/07-validation.md) | Kết quả kiểm tra thực tế và giới hạn |
| [08 — Xử lý lỗi local](docs/08-troubleshooting.md) | Hydration mismatch do extension thêm thuộc tính vào HTML |
| [Landing và xác thực](docs/features/landing.md) | Nội dung công khai, preview, đăng nhập và quy tắc cập nhật |
| [10 — Dữ liệu mẫu](docs/10-sample-data.md) | Nạp mẫu theo tài khoản để review, backup và reset trước khi dùng thật |

## Chạy local

Dùng Node.js **22 LTS**, tối thiểu 22.12.0; phiên bản mặc định Node 18 trên máy hiện tại không chạy được stack này. Đã có Node 22.12.0 trong NVM trên máy; không thay đổi Node mặc định.

```bash
nvm use 22
npm ci
npm run dev
```

Mở http://localhost:3000. Nếu `nvm` chưa được nạp vào terminal, mở terminal có cấu hình NVM trước. `.nvmrc` chọn Node 22; dùng bản vá Node 22 còn được hỗ trợ khi triển khai thực tế.

```bash
npm run typecheck
npm run build
npm start
```

Service worker chỉ đăng ký trong production (`build` + `start`). Localhost có thể dùng để kiểm tra; truy cập PWA từ thiết bị khác cần HTTPS. Bản khung cache riêng trang `offline.html`, chưa cache hoặc ghi dữ liệu tài chính ngoại tuyến. Có thể xóa service worker trong DevTools → Application khi đổi cấu hình PWA.

Không cần `.env` để xem landing, preview minh họa và trạng thái đăng nhập chưa kết nối. Để dùng Chi tiêu thật, cấu hình `.env.local` theo `.env.example` và [hướng dẫn cloud](docs/09-expenses-cloud.md). Không dùng database admin/postgres làm connection runtime.

## Playwright MCP

Source có `@playwright/mcp` trong devDependencies và cấu hình Codex theo dự án tại `.codex/config.toml`, theo [OpenAI Docs](https://developers.openai.com/codex/mcp). Sau `nvm use 22` và `npm ci`, mở lại phiên Codex trong thư mục này để nạp cấu hình; dự án cần được đánh dấu trusted. Dùng `/mcp` trong Codex CLI để kiểm tra server `playwright`.

MCP dùng Google Chrome đã cài trên máy, chạy headless ở kích thước 1440 × 900 với profile tạm riêng cho mỗi phiên ([Playwright MCP](https://github.com/microsoft/playwright-mcp)). Ảnh chụp và kết quả được lưu trong `artifacts/playwright/`, đã được loại khỏi Git. Trên máy mới cần cài Google Chrome trước khi dùng cấu hình này.

Chạy ứng dụng bằng `npm run dev`, sau đó yêu cầu Codex mở `http://127.0.0.1:3000` qua Playwright MCP. MCP client tự khởi động server bằng `npm run --silent mcp:playwright`; không cần chạy lệnh này riêng trong terminal. Có thể kiểm tra CLI bằng `npm run --silent mcp:playwright -- --help`.

## Cấu trúc

```text
src/
  app/                  Next.js routes, layout, manifest và CSS tokens
    (public)/           Landing và đăng nhập, khung công khai
    (app)/              Trang ứng dụng được bảo vệ, sidebar và Privacy Mode
  components/           Navigation, icon và đăng ký PWA
  features/catalog.ts   Danh mục, trạng thái và mô tả dùng chung
  features/landing/     Nội dung, preview dữ liệu mẫu và CSS công khai
  features/expenses/    Chi tiêu: giao diện, form, báo cáo bảng/biểu đồ
  domain/expenses/      Công thức BigInt, quy tắc tháng/năm và báo cáo
  application/          Điều phối preview/lưu, version và idempotency
  server/               Xác minh Auth, PostgreSQL repository và origin
public/                 Icon, service worker, trang mất mạng
supabase/migrations/    Schema Chi tiêu, RLS và trigger lưu trữ
tests/                  Unit, PostgreSQL integration và browser tests
docs/                   Phân tích, kiến trúc, roadmap, deploy và đặc tả
.github/workflows/      Typecheck + build; chưa chạy trên GitHub
Notion/                 13 ảnh gốc trên máy, được loại khỏi Git/deploy
```

Đã thêm Supabase SSR/Auth, Postgres.js, Zod, Vitest và Playwright Test. Tiền dùng BigInt, native form/dialog và biểu đồ HTML/SVG có bảng thay thế. `package-lock.json` khóa dependency thực tế. shadcn/ui và các thư viện biểu đồ/form khác chưa cần cho module này.

```bash
npm test
npm run test:db
npm run test:e2e
npm run check
```

DB/e2e cần PostgreSQL binaries (`initdb`, `pg_ctl`, `pg_config`); nếu không có trong PATH, đặt PG_BIN. Runner tự tạo cluster local riêng, không dùng credentials cloud. E2e cần Google Chrome trên máy và sử dụng Auth double local, không gửi email thật. Kết quả được ghi trong artifacts, đã loại khỏi Git. CI chạy unit/typecheck/build và DB integration; chưa thay thế smoke test cloud.

Ảnh gốc và file import/backup được loại khỏi Git. Dùng repository private khi đưa source và tài liệu dự án lên cloud. Bộ khung được chuẩn bị local; hướng Vercel/Supabase trong tài liệu là kế hoạch triển khai.

Kết quả Chi tiêu: **37 unit + 9 PostgreSQL + 12 browser tests**, typecheck/build và production smoke không credentials đã qua local. Xem [bằng chứng và giới hạn nghiệm thu](docs/07-validation.md). Người dùng chọn để cấu hình cloud sau.
