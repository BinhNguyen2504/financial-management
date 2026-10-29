# Financial Manager

Ứng dụng quản lý tài chính cá nhân thay thế workflow Notion: **web PWA trên điện thoại và máy tính → cloud có đăng nhập, đồng bộ nhiều thiết bị → Flutter iOS cài trên iPhone cá nhân ở giai đoạn sau**.

## Trạng thái hiện tại

**Thu nhập, Chi tiêu, Tiết kiệm, Đầu tư và Quỹ an toàn đã được triển khai trong source**. Có Auth email, HTTP API v1 và migration PostgreSQL/RLS. Cài đặt có sao lưu/khôi phục toàn tài khoản; các khu vực dự kiến còn lại vẫn là bộ khung P0.

**Chi tiêu:** hũ chi tháng/tích lũy, tự tính tiền bỏ hũ, nhập số dư, sử dụng tích lũy, cấu hình có hiệu lực, báo cáo bảng/biểu đồ và chốt từng năm. Sao lưu toàn tài khoản trong Cài đặt.

**Sao lưu và khôi phục:** Cài đặt cho phép xuất JSON V2 đầy đủ năm module cùng lịch sử và hồ sơ, nhập sang tài khoản trống với tùy chọn khôi phục hồ sơ. File không mật khẩu, không chứa thông tin đăng nhập. Xuất file không phụ thuộc migration biên nhận import; khôi phục cần migration này. Schema cũ thiếu cột logo/icon phân loại vẫn xuất được; khôi phục chỉ được bỏ qua cột còn thiếu khi giá trị trong file là null, tránh mất metadata. Cấu hình giới hạn truyền file phù hợp hosting; xem [đặc tả backup](docs/features/backup.md). Chưa áp dụng migration mới lên cloud.

**Thu nhập:** danh mục cố định có hiệu lực theo tháng, tổng thực nhận riêng mỗi tháng, khoản phát sinh một lần, báo cáo bảng/biểu đồ và xuất CSV. Cho xóa danh mục khi không còn số thu ở bất kỳ tháng/năm nào; bản ghi 0 đồng vẫn chặn xóa. Xem [đặc tả Thu nhập](docs/features/income.md).

**Đầu tư:** tổng tiền từng danh mục và nhiều ví tiền chờ; mở đầu, nạp/rút/chuyển, mua/bán với giá vốn bán nhập tay, phí/thuế, định giá, lãi/lỗ, sửa/hủy có lịch sử, báo cáo xuyên năm và CSV/JSON. Form giao dịch chia nhóm, xem trước rồi xác nhận lưu; xác nhận bỏ nội dung bằng dialog trong ứng dụng. Xóa/lưu trữ chỉ khi hết vốn và giá trị. Xem [đặc tả và migration Đầu tư](docs/features/investments.md). Độc lập với các module khác; chưa áp dụng migration Đầu tư lên cloud.

**Tiết kiệm:** bảng danh mục và giao dịch căn cột trên desktop, xếp dọc có nhãn trên mobile, tùy chọn cột; tiền/ví, từng sổ tiền gửi và đợt mua vàng; rút/bán, lãi thực nhận, tái tục, giá lịch sử, báo cáo xuyên năm, chốt/mở lại tháng và CSV/JSON. Xem [đặc tả và migration Tiết kiệm](docs/features/savings.md). Chưa tự đồng bộ số dư với Thu nhập/Chi tiêu. Đọc lại cloud ngày 18/10 xác nhận đã có schema và bộ mẫu Tiết kiệm; chưa dùng bằng chứng này để khẳng định đăng nhập/thiết bị thật.

Trang `/` là landing công khai với preview tương tác bằng dữ liệu minh họa. Mọi trang ứng dụng yêu cầu đăng nhập; khi chưa cấu hình Auth, chuyển đến trang đăng nhập có hướng dẫn trạng thái thiết lập. Không lưu tài chính trong trình duyệt. Dấu `—` trên tổng quan vẫn là chưa có dữ liệu. Có thể sinh **bộ dữ liệu mẫu tham khảo Notion** bằng `npm run data:sample -- --owner <USER_UID>`, rồi nạp qua Supabase SQL Editor. Bộ có inspect, seed, backup và reset sau khi chốt UI/UX; không tự kết nối hoặc ghi cloud. Xem [hướng dẫn dữ liệu mẫu](docs/10-sample-data.md), [đặc tả Chi tiêu](docs/features/expenses.md) và [hướng dẫn kết nối cloud](docs/09-expenses-cloud.md).

Để xem Thu nhập/Chi tiêu/Tiết kiệm/Đầu tư với dữ liệu mẫu local: `npm run data:preview`, dùng URL in ra với `review@example.test` / mã `12345678`. Bản preview dùng database/Auth local riêng. Xem [hướng dẫn dữ liệu review](docs/10-sample-data.md). Có thể bổ sung Đầu tư vào bộ review cùng tài khoản bằng `npm run data:investments:sample -- --base imports/<BỘ_MẪU_TIẾT_KIỆM>/sample-data.json`; bộ mới có reset 28 bảng, chỉ dùng sau khi chốt UI/UX.

Tag trạng thái dùng nền nhẹ, viền rõ, chữ đậm và icon chung trên các module; đặt sát tên danh mục, kỳ hoặc số liệu liên quan, hỗ trợ sáng/tối và năm chủ đề. Xem [quy tắc danh mục và tag](docs/features/income-tags-2026-10-28.md).

## Landing và truy cập ứng dụng

Tinh chỉnh 29/10/2026: preview mobile dùng khung điện thoại có vùng cuộn riêng; header gọn cùng hàng với VI/EN và icon tài khoản. FAQ có section rõ, mở/đóng mượt; các khối nội dung mở rộng trong ứng dụng dùng chung hành vi và hỗ trợ giảm chuyển động. Nội dung Việt/Anh ưu tiên công dụng và bước thao tác. Xem [đặc tả và phạm vi kiểm chứng](docs/features/responsive-disclosures-2026-10-29.md).

Trang `/` có hai trải nghiệm: **khách chưa đăng nhập** xem landing marketing riêng với nền ngà, chữ đen và điểm nhấn cam đồng; **người đã đăng nhập** giữ trang giới thiệu theo chủ đề đã chọn, avatar/hồ sơ và nút Vào ứng dụng. Server xác minh phiên để HTML đầu tiên đã đúng bản khách hoặc thành viên; phiên hợp lệ không phải chờ JavaScript để đổi giao diện. Khi Auth gián đoạn, `/` vẫn trả nội dung công khai và nút tài khoản cho phép thử lại. Preview Thu nhập / Chi tiêu / Tiết kiệm / Đầu tư / Quỹ an toàn dùng dữ liệu cố định, chuyển tab và che/hiện tiền, không gọi API tài chính. Bản khách dùng biểu đồ trung tính, không đổi theo theme/chế độ lưu trong trình duyệt.

`/login` dùng mã đăng nhập 8 chữ số qua email, hiển thị từng ô vuông; tự focus/chuyển ô, tự xác nhận khi nhập ô cuối hoặc dán/tự điền đủ mã. Mã dùng một lần trong 30 phút; có gửi lại sau 60 giây và đổi email. Cần áp dụng mẫu email và thời hạn trên Supabase theo [hướng dẫn OTP](docs/features/email-otp.md); source không tự đổi cấu hình cloud. Callback giữ tương thích link đã gửi trước chuyển đổi. Sau đăng nhập mặc định mở `/overview`; `next` chỉ chấp nhận đường dẫn ứng dụng trong danh sách cho phép. Các trang kiểm tra phiên phía server trước khi render, kể cả module còn đang xây dựng. Đăng xuất trở về `/`; PWA vẫn khởi đầu tại `/overview` và yêu cầu đăng nhập. Lỗi Auth tạm thời có trạng thái thử lại, khác với phiên hết hạn.

Catalog dùng chung cho trạng thái module; quy tắc trong `AGENTS.md` yêu cầu rà soát landing, preview, README và tài liệu khi thay đổi sản phẩm. Xem [đặc tả landing và xác thực](docs/features/landing.md).

SEO của landing Việt/Anh theo lựa chọn cookie, mặc định tiếng Việt, tập trung vào quản lý tài chính cá nhân; giữ slogan và dữ liệu minh họa cố định. Mặc định `SEO_INDEXABLE=false`: trang có `noindex`, sitemap rỗng. Khi có tên miền HTTPS chính thức, đặt `APP_ORIGIN` và `SEO_INDEXABLE=true` ở production rồi build/deploy lại; Vercel preview vẫn `noindex`. Canonical, Open Graph và JSON-LD dùng chung origin hợp lệ; login/workspace tiếp tục không lập chỉ mục. Chạy `npm run test:seo` để kiểm tra ba cấu hình bằng production build cô lập, không cần database/Auth. Xem [hướng dẫn bật SEO](docs/05-deployment.md#seo-trang-giới-thiệu--27102026).

## Giao diện Zen

Tổng quan và các màn hình dùng Nunito tiếng Việt, minh họa SVG cùng năm chủ đề **Khu vườn (xanh lục)**, **Dòng nước (xanh lam)**, **Kim ngân (vàng)**, **Lửa ấm (đỏ)** và **Đất lành (nâu)**. Đổi trong Cài đặt, áp dụng ngay cho app, landing sau đăng nhập, trang đăng nhập và trang mất kết nối (landing khách dùng nhận diện riêng); mỗi chủ đề có màu sáng/tối riêng, dùng chung lựa chọn Sáng/Tối/Theo hệ thống. Minh họa và lời dẫn đi theo chủ đề; emoji người dùng giữ nguyên. Logo hũ tích lũy/đồng xu dùng màu than–ngà chung cho cả năm chủ đề, đảo theo sáng/tối; favicon và icon cài app cùng biểu tượng. Tổng quan dùng widget đọc năm module và lưu bố cục theo tài khoản; Chi tiêu hỗ trợ emoji có thể đổi và đồng bộ, thẻ mobile có số dư/tiến độ, báo cáo donut/thanh/đường với bảng thay thế. Biểu đồ Tiết kiệm có tooltip cho điểm, cột nạp/rút, lát donut và chú giải khi rê chuột, chạm hoặc dùng Tab. Nút mắt ở header che số tiền trong Chi tiêu, Thu nhập, Tiết kiệm (kể cả giá/lượng vàng), Đầu tư và Quỹ an toàn; form có nút hiện riêng. Nút chevron thu gọn/mở rộng menu desktop nằm trên mép phải sidebar, ngang hàng logo, với vòng tròn nhỏ và vùng bấm rộng. Các tùy chọn riêng tư, theme, sidebar và cột bảng được lưu trên trình duyệt; chủ đề/chế độ đồng bộ giữa các tab, không đồng bộ tài khoản và không nằm trong backup tài chính; không lưu bản nháp hay dữ liệu tài chính. Backup/CSV vẫn chứa số đầy đủ. Dialog các module có tóm tắt số liệu, tab theo nội dung, tìm kiếm/lọc và danh sách 20 dòng mỗi trang; mở form con rồi quay lại giữ vị trí. Xem [hướng UI/UX](docs/04-ux-direction.md).

Tổng quan, Chi tiêu và Thu nhập giữ nội dung khi quay lại tab; dữ liệu đã tải ít nhất 60 giây được cập nhật ngầm, gộp các sự kiện quay lại trùng nhau. Có mạng trở lại hoặc đổi ngày Việt Nam sẽ kiểm tra sớm hơn (cách lần tải trước ít nhất 5 giây). Lần mở đầu hoặc đổi năm Thu nhập vẫn có trạng thái tải. Các trạng thái tải dữ liệu có vòng xoay kèm thông báo; nút gửi/lưu/khôi phục hiển thị tiến trình trong lúc chờ server. Hiệu ứng theo màu sáng/tối và dừng khi bật giảm chuyển động. Xem [phản hồi giao diện](docs/features/ui-feedback.md). Nếu gặp hydration diff `cz-shortcut-listen`, xem [cách xử lý extension](docs/08-troubleshooting.md).

Mỗi trang trong ứng dụng có **Hướng dẫn** cạnh tiêu đề, với đề mục đánh số, từ khóa và ví dụ được nhấn rõ. Nội dung bao gồm mục đích, tư duy sử dụng, thuật ngữ và thao tác. Có thể tra cứu ngay từ form rồi quay lại với bản nháp còn nguyên; ví dụ dùng số liệu minh họa cố định. Liên kết trong trang, mục lục Help, xem trước, phân trang và vị trí lỗi trong dialog cuộn mượt đến nội dung; tùy chọn giảm chuyển động bỏ hiệu ứng cuộn. Xem [Help theo từng trang](docs/features/help.md).

Trên Tổng quan, **Hướng dẫn** nằm cạnh tiêu đề và **Tùy chỉnh Tổng quan** mở danh sách 10 widget. Kỳ và trạng thái dữ liệu nằm trong từng widget; các thao tác nhập liệu mở module tương ứng.

Biểu mẫu tài chính đọc số tiền VND ngay dưới ô, đặt `*` sát nhãn cần nhập và báo lỗi tại đúng trường. Chú thích gọn “* Bắt buộc” dùng chung cho form; menu có scrollbar mảnh, nền trong suốt. Toast phân cấp tiêu đề/nội dung với icon và màu theo trạng thái, hỗ trợ sáng/tối và giảm chuyển động. Lưu thành công hoặc lỗi có thông báo chung; trường hợp chưa rõ kết quả lưu được nêu riêng và giữ bản nháp. Dialog giữ hàng nút thao tác khi cuộn; bước xem trước Quỹ an toàn ưu tiên những số thực sự thay đổi. Sidebar desktop có nút thu gọn ở mép phân cách, ngang hàng logo; biểu tượng ứng dụng vẫn hiện ở thanh mobile. Xem [quy chuẩn phản hồi giao diện](docs/features/ui-feedback.md).

## Ngôn ngữ Anh/Việt

Chọn **Tiếng Việt** (mặc định) hoặc **English** trên thanh đầu trang, cạnh đăng nhập/tài khoản, hoặc trong Cài đặt → Ngôn ngữ / Language. Áp dụng ngay cho cả trang chủ khách và thành viên, preview, khung công khai, đăng nhập, ứng dụng, Help và lỗi/thông báo. Lựa chọn lưu trên trình duyệt, đồng bộ giữa các tab, không nằm trong backup hoặc đồng bộ tài khoản. Đổi ngôn ngữ giữ bộ lọc và bản nháp.

English dùng `en-GB`: `1,000,000 ₫`, số lượng `1.25`, ngày `22/10/2026`; tiếng Việt dùng `1.000.000 ₫`, số lượng `1,25`. Vẫn dùng VND và giờ Việt Nam. CSV dịch tên cột/nhãn hệ thống, giữ số/ngày dạng chuẩn; JSON backup không đổi cấu trúc. Xem [đặc tả ngôn ngữ và logo](docs/features/localization.md).

Phương án logo 29/10/2026: xem [ba biểu tượng và bảng so sánh](docs/design/logo-concepts/README.md). Đây là bản thiết kế để lựa chọn, chưa thay nhận diện đang dùng.

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
  components/           Dialog, form feedback, bảng, navigation, theme và PWA dùng chung
  features/catalog.ts   Danh mục, trạng thái và mô tả dùng chung
  features/landing/     Nội dung, preview dữ liệu mẫu và CSS công khai
  features/<module>/    UI, editor config/action/controller, trường nhập và preview
  domain/<module>/      Công thức BigInt, schema, lịch sử và báo cáo thuần TypeScript
  domain/shared/        Primitive ngày/tháng/tiền, Clock và validation tương thích
  application/          Điều phối preview/lưu, version và fingerprint command dùng chung
  server/               Auth, HTTP boundary, transaction/RLS và repository từng module
  i18n/report-exports/  Xuất CSV theo ngôn ngữ, tách khỏi phép tính domain
public/                 Icon, service worker, trang mất mạng
supabase/migrations/    Schema các module, RLS và trigger lưu trữ có phiên bản
tests/                  Unit, PostgreSQL integration và browser tests
docs/                   Phân tích, kiến trúc, roadmap, deploy và đặc tả
.github/workflows/      Lint, kiến trúc, định dạng, unit, typecheck/build và PostgreSQL
Notion/                 13 ảnh gốc trên máy, được loại khỏi Git/deploy
```

Đã thêm Supabase SSR/Auth, Postgres.js, Zod, Vitest và Playwright Test. Tiền dùng BigInt, native form/dialog và biểu đồ HTML/SVG có bảng thay thế. `package-lock.json` khóa dependency thực tế. shadcn/ui và các thư viện biểu đồ/form khác chưa cần cho module này.

```bash
npm test
npm run test:db
npm run test:e2e
npm run lint
npm run check:architecture
npm run format:check
npm run check
```

`npm run check` kiểm lint, ranh giới kiến trúc, định dạng, unit, TypeScript và production build. CI dùng cùng lệnh và chạy thêm PostgreSQL integration; chưa xác nhận lượt chạy GitHub cho đợt refactor này. Xem [hướng dẫn bảo trì và thêm module](docs/11-source-maintenance.md).

DB/e2e cần PostgreSQL binaries (`initdb`, `pg_ctl`, `pg_config`); nếu không có trong PATH, đặt PG_BIN. Runner tự tạo cluster local riêng, không dùng credentials cloud. E2e cần Google Chrome trên máy và sử dụng Auth double local, không gửi email thật. Bật Firefox/WebKit bằng `TEST_FIREFOX=1 TEST_WEBKIT=1 npm run test:e2e`; các browser tương ứng phải được cài trên máy. Kết quả được ghi trong artifacts, đã loại khỏi Git; chưa thay thế smoke test cloud.

Ảnh gốc và file import/backup được loại khỏi Git. Dùng repository private khi đưa source và tài liệu dự án lên cloud. Bộ khung được chuẩn bị local; hướng Vercel/Supabase trong tài liệu là kế hoạch triển khai.

Mốc Chi tiêu ban đầu: **37 unit + 9 PostgreSQL + 12 browser tests**, typecheck/build và production smoke không credentials đã qua local. Các lượt xác minh mới được bổ sung tại [bằng chứng và giới hạn nghiệm thu](docs/07-validation.md). Người dùng chọn để cấu hình cloud sau.


## Quỹ an toàn — 19/10/2026

`/funds` hướng dẫn xây Emergency, Rainy Day và Sinking. Living expense lấy mức cấu hình hiệu lực từ các hũ chi tháng người dùng chọn, mục tiêu = mức sinh hoạt × hệ số tự nhập. Khi nguồn đổi, xem trước rồi xác nhận; cây, tán ô và cầu thể hiện tiến độ thực tế. Sổ tiền độc lập, có nhiều nơi giữ, thêm/rút/chuyển liên quỹ, sửa/hủy giữ lịch sử. Financial Goals là module riêng.

Chạy migration `supabase/migrations/202610190001_funds.sql` sau các migration hiện có trước khi phát hành source này; tài khoản runtime không có quyền tự tạo bảng. Backup V2 bao gồm 35 bảng của năm module và vẫn nhận file V1 (Fund trống). Xem [đặc tả Fund](docs/features/funds.md). Migration cloud/deployment và thiết bị vật lý cần xác minh riêng.

Bộ mẫu Fund để review có ba mức 50% / 105% / 25%, 37 giao dịch gốc cùng lịch sử sửa/hủy và 6 nơi giữ. `npm run data:preview` mở bộ năm module trong PostgreSQL/Auth local riêng; `/funds` dùng cùng dữ liệu minh họa, không đọc tài khoản cloud. Để bổ sung vào tài khoản đang review, dùng `data:funds:sample` và `data:funds:import` theo [hướng dẫn dữ liệu mẫu](docs/10-sample-data.md). Reset mới bao phủ 35 bảng cùng biên nhận restore nếu có, mặc định khóa và chỉ chạy sau duyệt UI/UX riêng.

## Cải thiện thao tác — 19/10/2026

Tinh chỉnh 26/10: chú thích dưới các card hướng dẫn cài đặt có khoảng cách riêng với card và lưu ý kết nối mạng, dùng chung cho cả ba nhóm thiết bị.

Liên kết ngoài trong hướng dẫn cài đặt, tài liệu tham khảo Quỹ an toàn và thiết lập Thu nhập dùng chung màu theo theme, chữ đậm và gạch chân luôn hiện; hover/focus làm nét gạch chân đậm hơn để dễ nhận biết thao tác.

Menu theo trạng thái triển khai, sidebar thu gọn, header giữ nút ẩn tiền, theme sáng/tối/hệ thống; Thu nhập nhắc rõ khoản thiếu và nhập ngay từ báo cáo. Chi tiêu chọn năm bất kỳ, chọn phân loại có sẵn kèm logo/icon và tùy chỉnh cột. Hướng dẫn cài đặt có minh họa theo thiết bị. Xem [đối chiếu 33 phản hồi](docs/features/interface-feedback-2026-10-19.md). Lưu logo/icon tùy chọn cần migration `202610190002_label_visuals.sql`; schema cũ vẫn dùng được các thao tác không có metadata. Chưa áp dụng migration cloud trong đợt này.

Tinh chỉnh 21/10: chọn cột bằng popover nổi, không đẩy bảng; Chi tiêu đặt nút cạnh tiêu đề tháng, dùng chung lựa chọn trên desktop/mobile. Logo phương thức 20px, ưu tiên biểu tượng riêng thay wordmark và sắp nhãn phụ thành các cụm gọn. Xem [đặc tả](docs/features/expenses.md#cột-hiển-thị-và-nhận-diện-phương-thức--21102026).

Tinh chỉnh 26/10: cột thao tác bảng hũ căn giữa một hoặc hai nút; Dùng tiền dùng icon ví đồng bộ nút sửa, có nhãn truy cập và tooltip. Nền tiêu đề/hàng được cắt theo góc bo của bảng, giữ cuộn dữ liệu và popover chọn cột.

## Chủ đề giao diện — 21/10/2026

Khu vườn giữ thiết kế xanh lục hiện có; Dòng nước dùng xanh lam trầm, suối/giọt nước và các cảnh Quỹ theo tiến độ (hồ dự trữ, mái che dưới mưa, thuyền về bến). Kim ngân dùng nền kem/vàng champagne, đồng xu, thỏi vàng, túi tiền và rương tích lũy; các cảnh Quỹ đầy dần theo tỷ lệ. Lửa ấm dùng đỏ gạch/đỏ san hô, bếp lửa, đèn lồng, than hồng và núi lửa cách điệu; các cảnh Quỹ ấm dần hoặc tiến về đèn đích. Đất lành dùng nâu đất/nền cát, tầng đất, đồi núi, đá cuội, đất nung và ruộng bậc thang; các cảnh Quỹ xây nền, mở rộng mái trú và tiến lên bậc đá. Chỉ có chuyển động ngắn khi tương tác, tôn trọng giảm chuyển động. Chi tiết năm chủ đề: [Chủ đề giao diện](docs/features/themes.md). Kết quả kiểm thử và giới hạn môi trường: [Validation](docs/07-validation.md).

### Bố cục mobile và bảng — 23/10/2026

Tab trong app và dialog giữ nhãn một dòng, cuộn ngang khi thiếu chỗ; preview mobile dùng cùng hành vi. Nút chọn cột giữ vị trí theo khung bảng khi cuộn dữ liệu. Thu nhập chọn trực tiếp năm/tháng trên cùng một hàng như Chi tiêu, không có nút tháng trước/sau; hàng nhập thiếu vẫn gọn, đều với hàng có số. Xem [ma trận rà soát toàn ứng dụng](docs/features/layout-scroll-2026-10-23.md) và [bằng chứng kiểm thử](docs/07-validation.md).

### Minh họa Tiết kiệm và Đầu tư — 26/10/2026

Mỗi trang có năm cảnh riêng theo theme: Tiết kiệm dùng nhà kính, bồn hứng nước, heo đất, đèn lồng và chum; Đầu tư dùng vườn cây ăn quả, thuyền buồm, cân tài sản, lò gốm và cầu đá. Bộ mười hình SVG hỗ trợ sáng/tối, xuất hiện cả trong preview thành viên; trạng thái trống có cảnh khác tiêu đề. Hình trang trí không biểu thị số dư hay cam kết lợi nhuận. Xem [chủ đề giao diện](docs/features/themes.md).

### Tiêu đề và tỷ lệ minh họa — 26/10/2026

Thu nhập, Chi tiêu, Tiết kiệm, Đầu tư và Quỹ an toàn dùng bố cục tiêu đề chung: hình 240–320px cạnh chữ trên desktop/tablet, 216px ở hàng riêng dưới chữ trên điện thoại. Nút thao tác có hàng riêng. Chi tiêu thêm cảnh hũ, Quỹ thêm năm cảnh bảo vệ riêng theo theme; hình tiêu đề Quỹ là trang trí, tiến độ thật vẫn ở từng thẻ. Các trang dự kiến dùng cùng tỷ lệ nhưng giữ nhãn trạng thái. Preview thành viên có hình cho cả năm module; preview khách giữ nhận diện riêng. Xem [chủ đề giao diện](docs/features/themes.md).

## Tinh chỉnh Chi tiêu — 28/10/2026

Phân loại có logo PNG giữ màu/hình gốc, hàng tên căn giữa và khoảng cách biểu tượng rõ hơn. Trường loại cố định khi sửa; tạo mới vẫn chọn Phương thức/Nhóm mục đích. Bỏ “Gồm hũ đã ngừng” sẽ ẩn hũ không hoạt động trong tháng đang chọn, kể cả còn dư; lịch sử vẫn xem được khi bật lại. Xem trước tách Tháng, Hũ, Thông tin, Trước và Sau. Các module tài chính chỉ ghi những dòng thay đổi trong cùng transaction để giảm số lượt đi tới database; tốc độ cloud cần đo riêng. Xem [đợt rà soát](docs/features/expense-feedback-2026-10-28.md).


Chi tiêu (28/10): dialog “Phương thức và nhóm” dùng hàng gọn trên mobile; 90 emoji gợi ý và nhập một emoji riêng từ bàn phím, lưu/backup theo cùng hợp đồng. Có 27 thương hiệu chia ngân hàng/ví điện tử với logo cục bộ. Xem [đặc tả](docs/features/expenses.md#phân-loại-mobile-emoji-và-thương-hiệu--28102026); danh sách này phục vụ phân loại thủ công.

## Chuẩn hóa trải nghiệm — 28/10/2026

Nội dung dành cho người dùng phổ thông; cỡ chữ theo vai trò dùng chung; dialog mobile giới hạn chiều cao và cuộn bên trong; menu đóng khi chạm ngoài; tháng/năm dùng hai ô Năm rồi Tháng trên toàn ứng dụng. Xem [phạm vi và kiểm chứng](docs/features/usability-consistency-2026-10-28.md).

## Tổng quan cá nhân hóa — 29/10/2026

Tổng quan nay xem nhanh Thu nhập, Chi tiêu, Tiết kiệm, Đầu tư và Quỹ an toàn: 6 widget mặc định, 4 widget tùy chọn. Thêm/ẩn/đổi thứ tự, chọn tối đa 5 hũ, xem thử rồi Lưu/Hủy; bố cục đồng bộ theo tài khoản. Số liệu giữ kỳ và trạng thái tạm tính/thiếu định giá, không cộng các sổ thành tài sản ròng. Cần áp dụng migration `202610290001_overview_layouts.sql` để lưu bố cục. Cấu hình này nằm ngoài backup và kiểm tra tài khoản trống; các tùy chọn theme/privacy/cột vẫn theo trình duyệt. Xem [đặc tả Tổng quan](docs/features/overview.md).

### Tối ưu Tổng quan — 29/10/2026

Mặc định mới gồm năm thẻ số chính và cảnh báo; vẫn tùy chỉnh 10 loại widget và giữ nguyên bố cục đã lưu. Một request Tổng quan trả cả bố cục lẫn số liệu, trước đó hiện trạng thái tải chung để tránh lóe widget mặc định. Luồng đọc riêng bỏ audit và dữ liệu màn hình chi tiết, chia sẻ dữ liệu Chi tiêu với Quỹ; chỉ tải danh sách phụ khi bật widget. Cần chú ý theo các module đang hiển thị. Khôi phục bản sao lưu ở Cài đặt; Tổng quan không gọi kiểm tra gợi ý khôi phục. Xem [đặc tả cập nhật](docs/features/overview.md).

## Khôi phục và làm trống dữ liệu — 29/10/2026

Cài đặt giải thích từng phân hệ và loại bản ghi đang chặn khôi phục, kể cả cấu hình, sổ, dữ liệu đã xóa/hủy và lịch sử. Xóa giao dịch hoặc số dư bằng 0 không làm tài khoản đủ trống. Có thao tác **Làm trống dữ liệu tài chính** riêng: tải JSON hiện tại, xác nhận đã lưu, nhập `XÓA TOÀN BỘ`, rồi xóa toàn bộ năm phân hệ trong một transaction. Dữ liệu thay đổi từ lúc sao lưu thì phải tạo bản mới. Hồ sơ, tài khoản và bố cục Tổng quan được giữ. Sau đó người dùng tự chọn nhập file hoặc bắt đầu lại. Cần migration `202610290002_financial_data_reset.sql`; chưa áp dụng thì reset bị khóa, backup vẫn dùng được. Xem [đặc tả backup](docs/features/backup.md). Kiểm chứng local không thay thế triển khai cloud.

## Bố cục Quỹ an toàn — 30/10/2026

Chi tiết ba quỹ có cột tiền và nút Sửa/Hủy nhất quán, nơi giữ tiền gọn theo tên/trạng thái/số dư, lịch sử tách các khối trước/sau. Card sinh hoạt làm rõ số tiền và nguồn đã xác nhận; checkbox cập nhật nguồn có vùng riêng phía trên danh sách hũ. Bộ lọc phụ trong dialog có thể mở khi cần. Catalog và Help preview vi/en đã được đối chiếu, dữ liệu minh họa giữ cố định. Xem [đặc tả Quỹ an toàn](docs/features/funds.md).
