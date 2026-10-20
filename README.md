# Financial Manager

Ứng dụng quản lý tài chính cá nhân thay thế workflow Notion: **web PWA trên điện thoại và máy tính → cloud có đăng nhập, đồng bộ nhiều thiết bị → Flutter iOS cài trên iPhone cá nhân ở giai đoạn sau**.

## Trạng thái hiện tại

**Thu nhập, Chi tiêu, Tiết kiệm, Đầu tư và Quỹ an toàn đã được triển khai trong source**. Có Auth email, HTTP API v1 và migration PostgreSQL/RLS. Cài đặt có sao lưu/khôi phục toàn tài khoản; các khu vực dự kiến còn lại vẫn là bộ khung P0.

**Chi tiêu:** hũ chi tháng/tích lũy, tự tính tiền bỏ hũ, nhập số dư, sử dụng tích lũy, cấu hình có hiệu lực, báo cáo bảng/biểu đồ và chốt từng năm. Sao lưu toàn tài khoản trong Cài đặt.

**Sao lưu và khôi phục:** Cài đặt cho phép xuất JSON V2 đầy đủ năm module cùng lịch sử và hồ sơ, nhập sang tài khoản trống với tùy chọn khôi phục hồ sơ. File không mật khẩu, không chứa thông tin đăng nhập. Xuất file không phụ thuộc migration biên nhận import; khôi phục cần migration này. Cấu hình giới hạn truyền file phù hợp hosting; xem [đặc tả backup](docs/features/backup.md). Chưa áp dụng migration mới lên cloud.

**Thu nhập:** danh mục cố định có hiệu lực theo tháng, tổng thực nhận riêng mỗi tháng, khoản phát sinh một lần, báo cáo bảng/biểu đồ và xuất CSV. Xem [đặc tả Thu nhập](docs/features/income.md).

**Đầu tư:** tổng tiền từng danh mục và nhiều ví tiền chờ; mở đầu, nạp/rút/chuyển, mua/bán với giá vốn bán nhập tay, phí/thuế, định giá, lãi/lỗ, sửa/hủy có lịch sử, báo cáo xuyên năm và CSV/JSON. Xóa/lưu trữ chỉ khi hết vốn và giá trị. Xem [đặc tả và migration Đầu tư](docs/features/investments.md). Độc lập với các module khác; chưa áp dụng migration Đầu tư lên cloud.

**Tiết kiệm:** tiền/ví, từng sổ tiền gửi và đợt mua vàng; rút/bán, lãi thực nhận, tái tục, giá lịch sử, báo cáo xuyên năm, chốt/mở lại tháng và CSV/JSON. Xem [đặc tả và migration Tiết kiệm](docs/features/savings.md). Chưa tự đồng bộ số dư với Thu nhập/Chi tiêu. Đọc lại cloud ngày 18/10 xác nhận đã có schema và bộ mẫu Tiết kiệm; chưa dùng bằng chứng này để khẳng định đăng nhập/thiết bị thật.

Trang `/` là landing công khai với preview tương tác bằng dữ liệu minh họa. Mọi trang ứng dụng yêu cầu đăng nhập; khi chưa cấu hình Auth, chuyển đến trang đăng nhập có hướng dẫn trạng thái thiết lập. Không lưu tài chính trong trình duyệt. Dấu `—` trên tổng quan vẫn là chưa có dữ liệu. Có thể sinh **bộ dữ liệu mẫu tham khảo Notion** bằng `npm run data:sample -- --owner <USER_UID>`, rồi nạp qua Supabase SQL Editor. Bộ có inspect, seed, backup và reset sau khi chốt UI/UX; không tự kết nối hoặc ghi cloud. Xem [hướng dẫn dữ liệu mẫu](docs/10-sample-data.md), [đặc tả Chi tiêu](docs/features/expenses.md) và [hướng dẫn kết nối cloud](docs/09-expenses-cloud.md).

Để xem Thu nhập/Chi tiêu/Tiết kiệm/Đầu tư với dữ liệu mẫu local: `npm run data:preview`, dùng URL in ra với `review@example.test` / mã `123456`. Bản preview dùng database/Auth local riêng. Xem [hướng dẫn dữ liệu review](docs/10-sample-data.md). Có thể bổ sung Đầu tư vào bộ review cùng tài khoản bằng `npm run data:investments:sample -- --base imports/<BỘ_MẪU_TIẾT_KIỆM>/sample-data.json`; bộ mới có reset 28 bảng, chỉ dùng sau khi chốt UI/UX.

## Landing và truy cập ứng dụng

Landing giới thiệu sản phẩm theo tinh thần “công cụ từ nhu cầu thật”: màu Zen, câu chuyện ngắn và preview Thu nhập / Chi tiêu / Tiết kiệm / Đầu tư / Quỹ an toàn. Preview dùng dữ liệu cố định, chỉ chuyển tab và che/hiện tiền, không gọi API tài chính. Người đã đăng nhập vẫn xem được landing, với avatar/hồ sơ và nút Vào ứng dụng.

`/login` dùng email + OTP hoặc liên kết email. Sau đăng nhập mặc định mở `/overview`; `next` chỉ chấp nhận đường dẫn ứng dụng trong danh sách cho phép. Các trang kiểm tra phiên phía server trước khi render, kể cả module còn đang xây dựng. Đăng xuất trở về `/`; PWA vẫn khởi đầu tại `/overview` và yêu cầu đăng nhập. Lỗi Auth tạm thời có trạng thái thử lại, khác với phiên hết hạn.

Catalog dùng chung cho trạng thái module; quy tắc trong `AGENTS.md` yêu cầu rà soát landing, preview, README và tài liệu khi thay đổi sản phẩm. Xem [đặc tả landing và xác thực](docs/features/landing.md).

## Giao diện Zen

Tổng quan và các màn hình dùng nền kem/xanh xô thơm, Nunito tiếng Việt, minh họa SVG và giao diện sáng/tối/theo hệ thống. Tổng quan đọc dữ liệu hũ tháng hiện tại; Chi tiêu hỗ trợ emoji có thể đổi và đồng bộ, thẻ mobile có số dư/tiến độ, báo cáo donut/thanh/đường với bảng thay thế. Biểu đồ Tiết kiệm có tooltip cho điểm, cột nạp/rút, lát donut và chú giải khi rê chuột, chạm hoặc dùng Tab. Nút mắt ở header che số tiền trong Chi tiêu, Thu nhập, Tiết kiệm (kể cả giá/lượng vàng), Đầu tư và Quỹ an toàn; form có nút hiện riêng. Các tùy chọn riêng tư, theme, sidebar và cột bảng được lưu trên trình duyệt; không lưu bản nháp hay dữ liệu tài chính. Backup/CSV vẫn chứa số đầy đủ. Dialog các module có tóm tắt số liệu, tab theo nội dung, tìm kiếm/lọc và danh sách 20 dòng mỗi trang; mở form con rồi quay lại giữ vị trí. Xem [hướng UI/UX](docs/04-ux-direction.md).

Tổng quan, Chi tiêu và Thu nhập giữ nội dung khi quay lại tab; dữ liệu đã tải ít nhất 60 giây được cập nhật ngầm, gộp các sự kiện quay lại trùng nhau. Có mạng trở lại hoặc đổi ngày Việt Nam sẽ kiểm tra sớm hơn (cách lần tải trước ít nhất 5 giây). Lần mở đầu hoặc đổi năm Thu nhập vẫn có trạng thái tải. Các trạng thái tải dữ liệu có vòng xoay kèm thông báo; nút gửi/lưu/khôi phục hiển thị tiến trình trong lúc chờ server. Hiệu ứng theo màu sáng/tối và dừng khi bật giảm chuyển động. Xem [phản hồi giao diện](docs/features/ui-feedback.md). Nếu gặp hydration diff `cz-shortcut-listen`, xem [cách xử lý extension](docs/08-troubleshooting.md).

Mỗi trang trong ứng dụng có **Hướng dẫn** cạnh tiêu đề, với đề mục đánh số, từ khóa và ví dụ được nhấn rõ. Nội dung bao gồm mục đích, tư duy sử dụng, thuật ngữ và thao tác. Có thể tra cứu ngay từ form rồi quay lại với bản nháp còn nguyên; ví dụ dùng số liệu minh họa cố định. Xem [Help theo từng trang](docs/features/help.md).

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
| [08 — Xử lý lỗi local](docs/08-troubleshooting.md) | Hydration do extension và lỗi Chi tiêu khi thiếu migration logo phân loại |
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

Nếu database chưa áp dụng `202610190002_label_visuals.sql`, Chi tiêu vẫn đọc/lưu hũ và phân loại không có logo tùy chọn. Lưu logo/icon mới cần migration này; API trả `LABEL_VISUALS_MIGRATION_REQUIRED` thay vì báo mất kết nối chung. Xem [cách xử lý](docs/08-troubleshooting.md#chi-tiêu-báo-storage_unavailable-khi-thiếu-migration-logo--20102026).

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


## Quỹ an toàn — 19/10/2026

`/funds` hướng dẫn xây Emergency, Rainy Day và Sinking. Living expense lấy mức cấu hình hiệu lực từ các hũ chi tháng người dùng chọn, mục tiêu = mức sinh hoạt × hệ số tự nhập. Khi nguồn đổi, xem trước rồi xác nhận; cây, tán ô và cầu thể hiện tiến độ thực tế. Sổ tiền độc lập, có nhiều nơi giữ, thêm/rút/chuyển liên quỹ, sửa/hủy giữ lịch sử. Financial Goals là module riêng.

Chạy migration `supabase/migrations/202610190001_funds.sql` sau các migration hiện có trước khi phát hành source này; tài khoản runtime không có quyền tự tạo bảng. Backup V2 bao gồm 35 bảng của năm module và vẫn nhận file V1 (Fund trống). Xem [đặc tả Fund](docs/features/funds.md). Migration cloud/deployment và thiết bị vật lý cần xác minh riêng.

Bộ mẫu Fund để review có ba mức 50% / 105% / 25%, 37 giao dịch gốc cùng lịch sử sửa/hủy và 6 nơi giữ. `npm run data:preview` mở bộ năm module trong PostgreSQL/Auth local riêng; `/funds` dùng cùng dữ liệu minh họa, không đọc tài khoản cloud. Để bổ sung vào tài khoản đang review, dùng `data:funds:sample` và `data:funds:import` theo [hướng dẫn dữ liệu mẫu](docs/10-sample-data.md). Reset mới bao phủ 35 bảng cùng biên nhận restore nếu có, mặc định khóa và chỉ chạy sau duyệt UI/UX riêng.

## Cải thiện thao tác — 19/10/2026

Menu theo trạng thái triển khai, sidebar thu gọn, header giữ nút ẩn tiền, theme sáng/tối/hệ thống; Thu nhập nhắc rõ khoản thiếu và nhập ngay từ báo cáo. Chi tiêu chọn năm bất kỳ, chọn phân loại có sẵn kèm logo/icon và tùy chỉnh cột. Hướng dẫn cài đặt có minh họa theo thiết bị. Xem [đối chiếu 33 phản hồi](docs/features/interface-feedback-2026-10-19.md). Lưu logo/icon tùy chọn cần migration `202610190002_label_visuals.sql`; schema cũ vẫn dùng được các thao tác không có metadata. Chưa áp dụng migration cloud trong đợt này.
