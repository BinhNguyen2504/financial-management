# Xác minh

## Phản hồi UI/UX — 17/10/2026

- Chuẩn hóa khoảng cách và kiểu chữ, căn tiêu đề/giá trị tiền và nhóm thao tác, sắp lại dòng Thu nhập, tách chữ lỗi khỏi nút thử lại; tám cảnh SVG theo ngữ cảnh và bảng màu Zen. [Chi tiết hành vi](features/ui-feedback.md).
- Dialog hỗ trợ bấm nền, giữ dialog cha khi Hủy/Escape/bấm nền ở lớp con, khôi phục cuộn/focus và chặn đóng khi xử lý bất đồng bộ. Lớp bị che có inert/aria-hidden, ID tiêu đề không trùng. Kiểm tra kéo từ trong ra ngoài không đóng nhầm.
- WebKit tái hiện mất focus sau đóng dialog và mất click Đăng xuất khi link trong menu đang có focus. Truy vết sự kiện xác nhận mousedown mặc định làm nút blur, đóng menu trước click; đã sửa quản lý focus ở mousedown. Kiểm tra lại bằng cả mouse click, chạm và bàn phím.
- `npm test`: **91/91 unit tests** qua. TypeScript strict và production build Next.js 16.4.1 bằng Node 22.12.0 qua. `git diff --check` và kiểm tra định dạng các file thay đổi qua.
- `TEST_WEBKIT=1 npm run test:e2e -- ui-feedback.spec.ts zen.spec.ts review-data.spec.ts expenses.spec.ts income.spec.ts savings.spec.ts profile.spec.ts`: **87/87 browser tests** qua (29 ca mỗi cấu hình: desktop Chromium, Chromium điện thoại, WebKit iPhone mô phỏng). Sáng/tối, reduced motion, viewport 320/768/1024/1440/1920; đo tọa độ căn tiền/nút, kiểm tra không tràn ngang toàn trang, lỗi mạng/thử lại, Privacy Mode và hồi quy các module đang có.
- Bằng chứng local: [bảng desktop](../artifacts/ui-feedback/desktop-budgets-dark.png), [Thu nhập desktop](../artifacts/ui-feedback/desktop-income-dark.png), [Thu nhập WebKit](../artifacts/ui-feedback/webkit-income-dark.png), [thông báo lỗi mobile](../artifacts/ui-feedback/mobile-savings-error.png), [kiểm tra tương tác WebKit trực tiếp](../artifacts/ui-feedback/webkit-interaction.json).

Các kiểm thử dùng production app, PostgreSQL và Auth double local cô lập. Chưa deploy hoặc xác minh trên thiết bị vật lý; không thay đổi dữ liệu cloud. URL preview dữ liệu mẫu mới nằm trong `artifacts/review-preview.json`.

## Thu nhập và hồi quy Chi tiêu — 15/10/2026

Kết quả trên source local sau khi triển khai `/income`; không kết nối Supabase thật hoặc deploy.

| Kiểm tra | Kết quả |
| --- | --- |
| `npm test` | 54 test qua: nghiệp vụ/báo cáo Thu nhập, command/retry, lỗi mạng/response, Auth/origin và hồi quy Chi tiêu |
| `npm run test:db` | 15 test qua trên PostgreSQL 14 local, nạp cả hai migration: tiền chính xác, preview, concurrency/idempotency, rollback, RLS/FK và lịch sử bất biến |
| `npm run test:e2e` | 22 test qua: Chromium desktop và cấu hình iPhone 13; API/DB thật local, Auth contract double local |
| `npm run typecheck` | Qua với TypeScript strict |
| `npm run build` | Production build thành công bằng Node 22.12.0, có route `/income` và `/api/v1/income` |
| Production smoke | `/income` hiển thị thiết lập; API trả 503 NOT_CONFIGURED/private no-store; callback giữ đích Thu nhập và từ chối redirect ngoài app; light/dark ở 1440/375/320px không tràn ngang, không có browser exception |
| Source | `git diff --check` qua |

Browser Thu nhập kiểm tra thêm/sửa/xóa số tháng và phát sinh, thay thế thay vì cộng trùng, số 0 khác chưa nhập, sửa/ngừng từ tháng giữ lịch sử, bảng và bốn kiểu biểu đồ, lọc/xuất CSV, cuộn bảng trong vùng riêng, viewport 320/375/768/1440, bàn phím/Escape, lỗi mạng giữ form, hai phiên xung đột và mất phản hồi sau commit rồi retry không tăng version/audit. Chuyển tháng 12 sang tháng 1 giữ danh mục và không sao chép tiền; tháng tương lai bị chặn ghi cả ở UI và API.

Unit bổ sung trường hợp ngừng backdate vẫn giữ tên của số thu đã ghi; danh mục từng ghi tiền rồi xóa số thu vẫn phải ngừng; ID của phát sinh trùng ID danh mục không làm cộng sai báo cáo.

Ảnh kiểm tra dùng dữ liệu giả, không đưa lên Git: [desktop light](../artifacts/browser/income-desktop-light.png), [mobile dark](../artifacts/browser/income-mobile-dark.png). [Production smoke JSON](../artifacts/income-production-smoke.json) ghi kết quả kiểm tra bản build không có credentials. Server kiểm tra được dừng sau khi hoàn tất.

Chưa chạy migration cloud, email/PKCE thật, Safari/iPhone thật hoặc cài PWA trên thiết bị. Hướng dẫn áp dụng migration mới và nghiệm thu cloud nằm trong [hướng dẫn cloud](09-expenses-cloud.md#bổ-sung-thu-nhập).

## Chi tiêu — 15/10/2026

Người dùng chọn thiết lập Supabase sau. Các kết quả dưới đây là kiểm tra local; chưa gửi email thật, kết nối cloud, chạy CI trên GitHub hoặc deploy production.

| Kiểm tra | Kết quả |
| --- | --- |
| `npm test` | 37 test qua: 31 nghiệp vụ/báo cáo, 2 origin, 4 Auth/config và gián đoạn dịch vụ |
| `npm run test:db` | 9 test qua trên PostgreSQL 14 thật, cluster local riêng: precision, preview không ghi, retry/idempotency, sửa đồng thời, rollback, RLS/FK cùng owner, PostgREST bị chặn, snapshot bất biến |
| `npm run test:e2e` | 12 test qua, Chromium desktop + cấu hình iPhone 13; Next.js/API/PostgreSQL thật local, Auth contract double local |
| `npm run check` | Unit, TypeScript strict và production build đều thành công bằng Node 22.12.0 |
| Production smoke không có credentials | `/budgets` và `/login` hiển thị thiết lập; API trả 503/no-store; callback lỗi quay về đúng origin; không tràn ngang ở 375px; không có browser exception |
| Service worker production | Cache chỉ có offline.html; mất mạng hiển thị fallback, không cache API/tài chính |
| Kiểm tra source | `git diff --check` qua; không có dữ liệu hoặc credentials cloud được thêm vào source |

Browser tests bao gồm thêm hũ, nhập số dư, ví dụ 2,3 triệu thực chi đã xác nhận, sử dụng tích lũy, đổi bảng/biểu đồ, light/dark, reduced motion, viewport 320/375/768/1440, lỗi mạng giữ form, mất phản hồi sau khi server commit rồi retry không trùng, Escape khôi phục focus, hai phiên đăng nhập sửa xung đột, token giả/CSRF/truy cập chéo, xem năm đã chốt và backup JSON. Chuyển năm ở UI được kiểm bằng response clock giả lập; công thức chuyển dư và khóa năm còn được kiểm độc lập trong domain và PostgreSQL.

Ảnh kiểm tra local (dữ liệu giả, không đưa lên Git/deploy): [desktop light](../artifacts/browser/expenses-monthly-balances--28952-ports-responsive-light-dark-desktop/expenses-light.png), [mobile dark](../artifacts/browser/expenses-monthly-balances--28952-ports-responsive-light-dark-mobile/expenses-dark.png).

Chưa nghiệm thu Supabase Auth/RLS trên cloud thật, email/PKCE thật, Safari/iPhone thật, cài PWA trên thiết bị thật hoặc restore database cloud. Làm theo [hướng dẫn cloud](09-expenses-cloud.md) khi thiết lập dịch vụ. Không coi Auth double hoặc PostgreSQL local là deployment online.

## Kết quả lịch sử: bộ khung P0

Ngày: 15/10/2026. Kết quả chỉ có giá trị với source local và phạm vi kiểm tra nêu dưới đây.

### Trạng thái P0 tại thời điểm kiểm tra

- Dependency đã cài vào workspace bằng Node 22.12.0 hiện có, không đổi Node mặc định của máy.
- `npm install` hoàn thành; audit tại thời điểm cài báo 0 vulnerabilities.
- `npm run typecheck`: thành công (`next typegen` + TypeScript strict).
- `npm run build`: thành công với Next.js 16.4.1; không cần credentials cloud.
- Kiểm tra trình duyệt trên production server local `127.0.0.1:3847`: thành công; server kiểm tra được dừng sau khi hoàn tất.

### Kiểm tra trình duyệt P0 đã thực hiện

| Nội dung | Kết quả |
| --- | --- |
| 10 route module | HTTP 200, đúng heading và navigation active |
| URL gốc | Chuyển sang `/overview` |
| URL không tồn tại | HTTP 404 và nội dung phù hợp |
| Tổng quan ở 1440×1000, 1024×768, 768×1024, 375×812, 320×700, 812×375 | Không tràn ngang toàn trang |
| 9 trang module còn lại tại 375×812, cả light/dark | Không tràn ngang toàn trang |
| Menu mobile | Mở, chuyển sang Mục tiêu, đóng và cập nhật trang hiện tại |
| Bàn phím | Tab đến skip link, Enter chuyển focus vào main |
| Theme và motion | Smoke check light/dark và reduced motion |
| Contrast các token chính | Body, muted/surface, primary/primary-soft, banner đều ≥4,5:1 trong light/dark; chưa phải audit WCAG toàn diện |
| Manifest và icon | `standalone`, start URL đúng, icon thường/maskable/Apple trả 200 |
| Service worker | Đăng ký trên bản production; response `sw.js` có no-store |
| Cache PWA | Cache của app chỉ chứa `/offline.html` |
| Mất mạng | Điều hướng hiển thị trang dự phòng; bật mạng và chọn thử lại về tổng quan |
| JavaScript | Không có uncaught browser exception trong lượt kiểm tra |
| Tài liệu | 9 Markdown gồm README và 8 tài liệu; không phát hiện link nội bộ hỏng hoặc trailing whitespace trong tập đã rà |

Ảnh chụp local (được loại khỏi Git/deploy): [desktop](../artifacts/overview-desktop.png), [mobile](../artifacts/overview-mobile.png), [dark](../artifacts/overview-dark.png). Kiểm tra bằng Chromium desktop với viewport giả lập không thay thế kiểm tra Safari/iPhone hoặc cài đặt PWA trên thiết bị thật.

### Phạm vi lịch sử P0 (trước module Chi tiêu)

| Nội dung | Trạng thái |
| --- | --- |
| Source, tài liệu, shell và PWA nền | Có trong workspace |
| Cloud Auth/DB và RLS | Chưa triển khai |
| Thu chi, đầu tư, công thức và đồng bộ | Chưa triển khai |
| Unit/integration test nghiệp vụ tài chính | Sẽ xây cùng tính năng, hiện chưa có nghiệp vụ để test |
| GitHub CI | Có workflow; chưa có bằng chứng chạy từ GitHub |
| Vercel/Supabase production | Chưa tạo hoặc deploy |
| PWA cài thực tế trên iPhone/Android | Cần thử trên thiết bị thật sau khi có HTTPS |
| App iOS | Chỉ có định hướng kiến trúc |

Không dùng ảnh Notion làm fixture/seed tài chính; không sao chép ảnh vào public assets. Không có test mock nào được dùng để tuyên bố backend đang online.

## Bổ sung: kiểm tra hydration ở development

Ngày 15/10/2026, sau phản hồi về `cz-shortcut-listen`: dùng dev server có sẵn ở port 3000, kiểm tra ba context sạch → chèn thuộc tính vào body trước React → sạch. Kết quả lần lượt 0 → 1 → 0 hydration error. Không thay đổi source runtime để che lỗi và không thay đổi extension trong browser của người dùng. Xem [hướng xử lý](08-troubleshooting.md).

Kiến trúc/roadmap được cập nhật cho Flutter/Dart; tài liệu deploy bổ sung bảng giá cloud và phương án cài iOS cá nhân từ nguồn chính thức. Không cài SDK Flutter, không tạo tài nguyên cloud và không mua dịch vụ.

## Giao diện Zen và Privacy Mode — 15/10/2026

Đã triển khai và kiểm chứng local trên source hiện tại, gồm cả module Thu nhập đã có. Cloud thật và deploy vẫn chưa được thực hiện.

| Kiểm tra | Kết quả |
| --- | --- |
| Unit (`npm test`) | 62 tests qua, gồm metadata emoji, khóa năm, giữ nguyên tiền và gộp donut chính xác với BigInt/số lớn |
| PostgreSQL (`npm run test:db`) | 16 tests qua; emoji lưu/đọc lại, idempotency và input tài chính giữ nguyên |
| Browser (`npm run test:e2e`) | 30 tests qua trên desktop và mobile giả lập, gồm toàn bộ regression Thu nhập/Chi tiêu |
| Typecheck | Qua `next typegen` và TypeScript strict |
| Production build | Qua với Next.js 16.4.1, Nunito Latin/tiếng Việt qua next/font |
| Privacy Mode | Nhớ lựa chọn, không lóe số khi tải lại, che số trong bảng/tooltip/accessibility tree; form hiện riêng và che lại khi blur/visibilitychange |
| Storage bị chặn | Nút ẩn/hiện tiếp tục hoạt động trong phiên |
| Emoji | Gợi ý theo tên, chọn khi tạo, đổi qua preview/command, phiên đăng nhập độc lập đọc lại đúng; không đổi tiền |
| Responsive/a11y | Sáng/tối, reduced motion, viewport 375/768/1440, zoom 200%, thao tác bàn phím; regression Chi tiêu còn kiểm 320px |
| Contrast token chữ | Các cặp text/surface, muted/canvas, primary/primary-soft, on-primary/primary, accent/accent-soft đều ≥4,5:1 ở sáng/tối; chưa phải audit WCAG toàn diện |
| Tổng quan | API Chi tiêu thật trong test local; phân biệt đăng nhập, chưa có hũ, lỗi mạng/retry; không dựng số tài sản ròng |
| Production PWA local | Cache `fm-offline-v2` chỉ có `/offline.html`; mất mạng mở trang Zen, kết nối lại trở về Tổng quan; không có pageerror trong lượt smoke |

Bộ browser dùng PostgreSQL cô lập và Auth double local, không dùng tài khoản/credentials cloud và không gửi email thật. Viewport mobile giả lập không thay thế Safari/iPhone thật. Privacy Mode chỉ thay cách trình bày; backup JSON và CSV vẫn chứa dữ liệu đầy đủ. Bộ cũ đã kiểm chốt năm/backup và CSV qua API.

Ảnh từ lượt browser cuối (dữ liệu kiểm thử): [desktop sáng](../artifacts/browser/zen-Zen-surfaces-charts-an-754a5-es-mobile-keyboard-and-zoom-desktop/zen-overview-light.png), [desktop tối](../artifacts/browser/zen-Zen-surfaces-charts-an-754a5-es-mobile-keyboard-and-zoom-desktop/zen-overview-dark.png), [mobile sáng](../artifacts/browser/zen-Zen-surfaces-charts-an-754a5-es-mobile-keyboard-and-zoom-mobile/zen-overview-light.png), [mobile tối](../artifacts/browser/zen-Zen-surfaces-charts-an-754a5-es-mobile-keyboard-and-zoom-mobile/zen-overview-dark.png). Artifacts không được đưa lên Git/deploy.

## Hồ sơ cá nhân và rà soát Playwright MCP — 16/10/2026

Đã căn đáy bộ chọn năm/tháng và hai nút mũi tên; màn hình 320px giữ cả bốn điều khiển cùng hàng. Sửa native select trên Safari/iOS để giữ chiều cao tối thiểu 44px và hiển thị mũi tên chọn theo theme. Thêm `/profile` với tên, email đăng nhập (chỉ đọc), ngày sinh, giới tính; avatar dùng chung chứa thông tin tài khoản, liên kết hồ sơ và đăng xuất. Xem [thiết kế và lưu trữ hồ sơ](features/profile.md).

Playwright MCP được gọi trực tiếp trên bốn browser profile; đây là giả lập thiết bị bằng trình duyệt, không phải thiết bị vật lý:

| Profile | Viewport | Bố cục sáng/tối trên 7 trang | Tương tác hồ sơ |
| --- | --- | --- | --- |
| Firefox desktop | 1024×768, 1440×900, 1920×1080 | 42 tổ hợp qua | 19 bước qua |
| Android Chromium | 320×700, 412×915, 823×412 | 42 tổ hợp qua | 19 bước qua |
| iPhone WebKit | 320×700, 393×852, 667×375 | 42 tổ hợp qua | 19 bước qua |
| iPad WebKit | 834×1194, 1194×834 | 28 tổ hợp qua | 19 bước qua |

Tổng cộng 154 tổ hợp bố cục: `/overview`, `/income`, `/budgets`, `/profile`, `/settings`, `/goals`, `/login`; không phát hiện tràn ngang hoặc pageerror trong lượt cuối. Kiểm tra kích thước/căn hàng bộ chọn tháng, menu avatar nằm trong viewport, Escape đóng menu; bật reduced motion. Rà thêm tên dài ở 320px và zoom 200% trên Firefox desktop 1440px.

76 bước tương tác gồm xác thực tên/ngày sinh, lỗi lưu giữ nháp và thử lại, lưu/tải lại hồ sơ, email chỉ đọc, lỗi tải/thử lại, chuyển tháng qua năm và khóa biên 2000/2099, liên kết hồ sơ từ avatar, click ngoài, bàn phím/ArrowDown/Escape, đăng xuất khi Auth trả lỗi, tách thông tin giữa hai tài khoản. SDK Auth hiện tại xóa phiên local cả khi thu hồi phiên từ xa lỗi; đã sửa để vẫn rời màn hình tài chính khi phiên local mất. Safari không tự focus nút khi chạm; Escape được nghe trên document để hoạt động đúng.

Regression sau khi sửa: **65 unit, 16 PostgreSQL và 38 browser tests** qua. Typecheck và production build Next.js 16.4.1 cũng qua. Browser gồm cả dữ liệu thực trong PostgreSQL local, báo cáo, Privacy Mode, emoji, xung đột giữa các phiên và auth/CSRF/owner boundaries của Thu nhập/Chi tiêu.

Bằng chứng local (artifacts được loại khỏi Git/deploy): [kết quả MCP](../artifacts/mcp-ui-results.json), [script bố cục](../artifacts/mcp-ui-audit.js), [script tương tác](../artifacts/mcp-profile-journey.js), [hồ sơ desktop](../artifacts/mcp-profile-desktop-final.png), [hồ sơ iPhone](../artifacts/mcp-profile-iphone-final.png). Dùng Auth double và PostgreSQL cô lập; chưa xác minh Supabase cloud hoặc bản deploy.


## Tiết kiệm — 17/10/2026

Triển khai `/savings`, API v1, migration PostgreSQL/RLS, lịch sử liên tục nhiều năm, tiền/ví/sổ gửi/vàng, giá vốn theo đợt, rút/bán/tái tục, giá có ngày, chốt/mở lại tháng và báo cáo/CSV/JSON. Đặc tả và migration: [Tiết kiệm](features/savings.md).

- `npm run check`: **84 unit tests**, typecheck và production build Next.js 16.4.1 qua.
- `npm run test:db`: **29 PostgreSQL tests** qua, gồm 6 ca Tiết kiệm: persistence chính xác, snapshot/revision bất biến, preview/idempotency, concurrent write/rollback, RLS hai owner, quan hệ sổ tái tục và các đợt mua/bán.
- Trước sửa đăng nhập, một lượt regression có 45/46 ca qua (timeout tải dữ liệu khi đăng nhập); lượt sau có 47/48 ca qua (không tới bước nhập OTP). Truy vết xác nhận form gửi HTML gốc đến `/login?` trước khi React gắn xử lý, làm mất email. Kiểm thử trì hoãn các chunk JavaScript trên bản source cũ tái hiện được trạng thái nhận thao tác trước hydration. Đã sửa Email/OTP/nút chỉ nhận thao tác khi form sẵn sàng, không tăng timeout hoặc bật retry để che lỗi.
- Regression production build cuối: **50/50 browser tests** qua trên Chromium desktop và điện thoại, gồm kiểm thử hydration mới và toàn bộ Thu nhập/Chi tiêu/hồ sơ/Privacy Mode/dữ liệu mẫu/Tiết kiệm.
- WebKit production cuối: **5/5 ca Tiết kiệm** qua trên iPhone mô phỏng, gồm trì hoãn hydration, bán vàng/báo cáo/xuất dữ liệu/Privacy Mode, sổ tiền gửi và chốt tháng, giả lập lỗi mạng/xung đột, mất phản hồi sau commit và lưu trữ/khôi phục danh mục.
- Bộ tập trung trước bổ sung kiểm thử hydration: **15/15 browser tests** qua — 4 luồng Tiết kiệm và 1 luồng Privacy Mode trên desktop Chromium, Chromium mô phỏng điện thoại và WebKit mô phỏng iPhone.
- Runner browser sao chép source sang thư mục Next riêng trong artifacts và dùng PostgreSQL/Auth local riêng, tránh tranh lock hoặc dừng server phát triển đang chạy. Các lượt dev còn ghi nhận Fast Refresh tự tải lại form; runner tự động đã chuyển sang `next build --webpack` + `next start`, còn chế độ MCP dùng dev server riêng. Không sao chép `.env.local` vào ứng dụng kiểm thử. Các ca API injection đặt `serviceWorkers: "block"`: ở WebKit production, service worker bỏ qua `page.route` khiến request dự kiến bị ngắt vẫn trả 200. Đây là cấu hình của test; service worker ứng dụng giữ nguyên, kiểm tra PWA là luồng riêng.

Bằng chứng local: [desktop](../artifacts/savings-desktop.png), [mobile](../artifacts/savings-mobile.png), [WebKit iPhone](../artifacts/savings-webkit.png), [baseline chưa hydration](../artifacts/prehydration-before/). Các artifact chứa dữ liệu giả; CSV/JSON xuất đầy đủ, Privacy Mode chỉ che giao diện. Chưa áp dụng migration Tiết kiệm trên Supabase cloud, chưa deploy và chưa xác minh iPhone vật lý. Không dùng kết quả local để khẳng định cloud đã sẵn sàng.


## Bộ mẫu Tiết kiệm và reset toàn ứng dụng — 17/10/2026

- Bộ mẫu bổ sung dựa trên `Notion/saving.png`: 6 danh mục, 9 đợt vàng, 46 giao dịch, 3 sổ tiền gửi, 1 sổ sắp đáo hạn và đủ giá để tính tổng (có giá cũ để review cảnh báo). Số lượng/đơn vị/ngày/lãi là dữ liệu minh họa có nhãn. Gốc Techcombank 100 triệu và sáu giá vốn cộng 62,2 triệu tham khảo ảnh.
- `npm run check`: **91 unit tests**, typecheck và production build qua. `npm run test:db`: **33 PostgreSQL tests** qua; mới có xác minh seed bổ sung không đổi Income/Expenses, idempotency, backup/reset đủ 22 bảng, giữ owner khác/Auth, rollback trigger và migration + seed nguyên tử khi thiếu schema.
- `TEST_WEBKIT=1 npm run test:e2e -- review-data.spec.ts`: **3/3 browser tests** qua, xem mẫu ở Chi tiêu/Thu nhập/Tiết kiệm/Tổng quan, báo cáo xuyên năm và Privacy Mode trên desktop, điện thoại Chromium và WebKit iPhone mô phỏng. Bằng chứng: `artifacts/browser/review-savings-{desktop,mobile,webkit}.png`.
- `npm run data:preview` mở production app/Auth/PostgreSQL local riêng, tài khoản demo `review@example.test` / mã `123456`. Đã đăng nhập thật vào phiên preview và đọc lại 6 danh mục/9 đợt/46 giao dịch/3 sổ; không có lỗi JavaScript hoặc tràn ngang ở 390px. Ảnh: [desktop đang review](../artifacts/review-savings-ready-desktop.png), [mobile đang review](../artifacts/review-savings-ready-mobile.png). URL phiên được lưu trong `artifacts/review-preview.json`.
- Cloud đọc lại xác nhận bộ Thu nhập/Chi tiêu hiện tại còn nguyên; runtime `expense_api` không có quyền CREATE và schema Tiết kiệm chưa tồn tại. Đã lưu backup owner 14 bảng trước khi chuẩn bị import, cùng `cloud-state-before.json` trong bộ private mới. File `01-enable-and-seed.sql` đã được kiểm trên PostgreSQL local, cần chạy bằng Supabase SQL Editor/admin để bật và seed trên cloud. **Chưa ghi dữ liệu Tiết kiệm lên cloud, chưa chạy reset cloud.**
- Script reset mới `03-reset.sql` nằm trong bộ private `imports/savings-review-*/`, mặc định NOT_CONFIRMED. Chỉ dùng sau khi người dùng xác nhận UI/UX xong; xuất backup 22 bảng trước. Script bảo toàn Auth/hồ sơ/owner khác, từ chối marker sai, không tắt RLS hoặc TRUNCATE, bật lại toàn bộ trigger trong transaction.
