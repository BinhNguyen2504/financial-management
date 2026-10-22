# Xác minh

## Lỗi STORAGE_UNAVAILABLE ở Chi tiêu — 20/10/2026

- Truy vấn chỉ đọc trên database mà app local đang cấu hình: kết nối thành công bằng runtime `expense_api`, thiếu hai cột `expense_labels.brand_key`/`icon_key`; truy vấn cũ tái hiện PostgreSQL `42703`. Sau sửa, đọc toàn bộ ExpenseView bằng adapter mới và RLS trên cùng database thành công, có sổ/phân loại/dòng tháng. Không in số tiền hoặc thông tin tài khoản, không ghi dữ liệu, chạy migration hoặc đổi quyền. Đây là bằng chứng backend, chưa xác minh phiên Auth trên trình duyệt đang lỗi của người dùng.
- `npm run test:db`: **67/67** kiểm thử qua trên PostgreSQL local cô lập. Bốn ca mới kiểm tra thiếu cả hai/từng cột, đọc sổ và lưu phân loại/hũ, từ chối metadata với mã lỗi cụ thể và giữ version/audit/biên nhận, cùng lưu/giữ/xóa metadata sau migration. Thay đổi schema thử nghiệm được rollback; không dùng database đang cấu hình cho kiểm thử ghi.
- `npm test`: **166/166** qua; `npm run typecheck` qua. Log: `artifacts/storage-unavailable-db.log`, `artifacts/storage-unavailable-unit.log`, `artifacts/storage-unavailable-typecheck.log`. Không chạy lại build hoặc browser suite trong lượt sửa repository này.
- Đã cập nhật README, xử lý lỗi local, triển khai, kiến trúc, UX và đặc tả Chi tiêu. Đã rà soát catalog, copy landing và preview cố định: khả năng/trạng thái module không đổi, không cần thay dữ liệu minh họa hoặc lời giới thiệu; preview tiếp tục không đọc API tài khoản. Không deploy hoặc xác minh thiết bị vật lý.

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

## Đầu tư theo tổng danh mục — 18/10/2026

Môi trường: Node 22.12.0, PostgreSQL local cô lập, Next.js 16.4.1. Unit/persistence dùng nghiệp vụ thực và role `expense_api`/RLS; browser dùng production build cùng Auth contract double local. Không dùng kết quả này để khẳng định Supabase cloud hoặc iPhone vật lý đã sẵn sàng.

| Kiểm tra | Kết quả |
|---|---|
| `npm run check` | **124/124 unit tests**, typecheck và production build qua |
| `npm run test:db` | **39/39 tests** trên 7 file qua; có ledger Đầu tư, định giá/revision và seed preview đọc lại qua runtime RLS |
| `TEST_WEBKIT=1 npm run test:e2e -- investments.spec.ts landing.spec.ts` | **39/39 browser tests** qua: 13 ca mỗi cấu hình desktop Chromium, Chromium mô phỏng điện thoại và WebKit mô phỏng iPhone |
| Source | `git diff --check` qua |

Đã kiểm tra mở đầu, mua cộng phí vào vốn, bán một phần và toàn bộ, mất toàn bộ vốn, vốn 0/ROI không có, tiền chờ không ROI, sửa/hủy/định giá có lịch sử, thứ tự gốc cùng ngày, chặn số dư âm và kiểm lại mốc lưu trữ sau khi sửa quá khứ. Ví dụ bán 30 triệu, vốn bán 25 triệu, phí/thuế 200 nghìn cho tiền ròng 29,8 triệu và lãi đã chốt 4,8 triệu.

Persistence kiểm tra preview không ghi, retry cùng ID không ghi trùng, xung đột hai phiên, rollback khi lỗi sau bước save, FK cùng owner và RLS hai owner. Fixture local được chạy qua domain thật ở các mốc đầu năm/cuối năm, rồi seed SQL và đọc lại bằng repository runtime để đối chiếu số tiền/lịch sử.

Browser kiểm tra CRUD/lưu trữ/khôi phục, mua/bán từ form, định giá và sửa có lý do, hai phía trước/sau, báo cáo xuyên năm, CSV/JSON, lỗi mạng giữ nháp, nạp đồng thời gây version conflict, mất phản hồi **sau commit** rồi retry chỉ có một bản ghi. Privacy Mode che cả lịch sử/form, nút hiện riêng không mở toàn trang; xuất file vẫn đầy đủ. Landing có tab Đầu tư cố định, không gọi API tài chính; kiểm tra Auth cho mọi trang và cookie Origin cho API.

Ảnh dữ liệu giả: [desktop](../artifacts/investments-desktop.png), [điện thoại](../artifacts/investments-mobile.png), [WebKit tối](../artifacts/investments-webkit-dark.png), [báo cáo](../artifacts/investments-reports-desktop.png), [portfolio mẫu](../artifacts/investments-sample-desktop.png). Đã xem ảnh desktop sáng, báo cáo tối, điện thoại sáng và WebKit tối. Logs local: `artifacts/investments-check.log`, `artifacts/investments-postgres.log`, `artifacts/investments-browser.log`.

Đã rà/cập nhật catalog, landing copy và preview, README, đặc tả Đầu tư, kiến trúc, dữ liệu, UX, discovery, deployment và hướng dẫn sample; giữ các kết quả kiểm chứng có ngày trước đó. Migration Đầu tư mới **chưa áp dụng cloud**, chưa deploy, chưa email/PKCE thật hoặc kiểm tra iPhone vật lý. Không chạy import/reset cloud; script reset 22 bảng cũ không bao gồm Đầu tư.

Preview review 18/10: đã mở phiên production local riêng bằng `npm run data:preview`, đăng nhập bằng tài khoản demo và đọc lại **7 danh mục/ví, 16 giao dịch/định giá**, tổng tài sản minh họa **176.140.000 VND**. Không có lỗi JavaScript hoặc tràn ngang ở 390px. Bằng chứng: `artifacts/investments-review-readback.json`, [desktop đang review](../artifacts/investments-review-ready-desktop.png), [mobile đang review](../artifacts/investments-review-ready-mobile.png). Thông tin phiên hiện tại ở `artifacts/review-preview.json`; URL/cổng chỉ có hiệu lực khi phiên local còn chạy, không phải URL deploy.

## Bộ mẫu Đầu tư theo Notion và reset đủ bốn module — 18/10/2026

- `npm test`: **129/129 unit tests** qua, gồm 5 mốc đầu/cuối năm để đối chiếu từng action của fixture Đầu tư với domain thật, sửa/hủy và ngày định giá.
- `npm run test:db`: **44/44 tests** qua. Bổ sung seed qua runtime RLS không thay đổi module trước, seed lại giữ chỉnh sửa, chặn dữ liệu không có marker, backup/reset 28 bảng với xác nhận/marker bốn module, giữ Auth/owner khác, rollback lỗi muộn và khôi phục trigger. Migration+seed được thử trong database local mới thiếu toàn bộ bảng Đầu tư và tình huống schema dở dang.
- `npm run typecheck`: qua. Không đổi giao diện/API nghiệp vụ trong lượt bổ sung scripts này; bằng chứng browser/source trước đó được giữ nguyên.
- Cloud đọc lại xác nhận đúng bộ mẫu ở Thu nhập/Chi tiêu/Tiết kiệm; schema Đầu tư còn thiếu. Role `expense_api` không có quyền CREATE. Đã lưu backup 22 bảng owner và bộ SQL migration+seed/reset 28 bảng vào thư mục private. Lệnh import dừng ở preflight thiếu migration, **chưa nạp Đầu tư trên cloud, chưa chạy reset**. File 01-enable-and-seed.sql cần chạy bằng SQL Editor/admin.

Catalog, landing và preview minh họa đã rà soát: dữ liệu public tiếp tục cố định, không lấy bộ tài khoản này. README, hướng dẫn sample và đặc tả module cập nhật trạng thái/cách nạp; không coi chuẩn bị file hoặc kiểm thử local là cloud apply/deploy.


## Backup toàn tài khoản và chuyển sang tài khoản mới — 18/10/2026

- `npm run check` trên Node 22.12.0: **133/133 unit tests**, typecheck và production build qua. Typecheck được chạy lại sau cập nhật test cuối.
- `npm run test:db`: **51/51 PostgreSQL tests** qua trên cluster local cô lập, dùng runtime `expense_api` và RLS. Vòng A → JSON → B → JSON giữ nguyên cả 28 bảng và kết quả đọc bốn module; bao gồm năm đã chốt, sửa/hủy, số tiền 24 chữ số. Kiểm thêm tranh chấp import, ghi thường đồng thời, retry sau commit, sai fingerprint, lỗi ghi muộn, sai read-back, schema thiếu, audit/tham chiếu hỏng và truy cập chéo. Rollback giữ tài khoản đích trống và không lưu biên nhận.
- `npm run test:e2e -- backup.spec.ts savings.spec.ts investments.spec.ts expenses.spec.ts profile.spec.ts landing.spec.ts`: **64/64 browser tests** qua trên Chromium desktop và mobile giả lập. Kiểm hồi quy module, CSV/legacy JSON API, profile, landing công khai và xác thực server. Các test module đã chuyển khỏi nút backup riêng; download toàn tài khoản được kiểm tại Cài đặt.
- `TEST_WEBKIT=1 npm run test:e2e -- backup.spec.ts`: **12/12 tests** qua (desktop, mobile Chromium, iPhone WebKit giả lập), chạy trên mã cuối của luồng backup. Kiểm file download, khôi phục bốn module, opt-in hồ sơ và lỗi/retry Auth riêng, mất phản hồi sau commit, gợi ý/đóng gợi ý, trạng thái chưa biết/lỗi, tài khoản đổi, CSRF, file sai/phiên bản mới và request vượt 20 MiB.
- Luồng xác nhận được kích hoạt bằng bàn phím; đã kiểm không tràn ngang, light/dark, reduced motion và 320px. Đã xem ảnh `artifacts/backup-preview-mobile.png` và `artifacts/backup-dark-320-webkit.png`; ảnh/trace ở local, không đưa dữ liệu backup vào Git.
- Bộ browser dùng production build trong thư mục cô lập và Auth double; không có tài khoản/ghi dữ liệu cloud. Không chạy reset, không áp dụng migration mới trên cloud và không deploy. Chưa xác minh thiết bị iPhone thật hoặc giới hạn file của hosting; cần đủ migration bốn module và `202610180002_data_imports.sql`, rồi kiểm `DATA_BACKUP_MAX_BYTES` theo môi trường trước phát hành.

Đã rà soát/cập nhật module catalog, landing copy và preview minh họa, README, đặc tả backup và các tài liệu tính năng/kiến trúc/dữ liệu/UX/triển khai liên quan. Các mốc kiểm chứng cũ được giữ nguyên.


## Hydration và loading trực quan — 18/10/2026

- Dev server hiện có `http://127.0.0.1:3000/login`, Chrome context tách biệt: sạch **0** lỗi hydration → chèn `cz-shortcut-listen="true"` trước React **1** lỗi với đúng thuộc tính trong diff → sạch **0** lỗi. Source không tạo thuộc tính này. Bằng chứng: `artifacts/hydration-extension-2026-10-18.json`; hướng dẫn tắt quyền extension/reload trong [troubleshooting](08-troubleshooting.md). Chưa truy cập danh sách extension/profile của người dùng.
- `npm run typecheck`, `tsc --noEmit` trên mã cuối và production build Webpack trong thư mục browser cô lập: qua trên Node 22.12.0.
- Hồi quy `landing.spec.ts` và `ui-feedback.spec.ts`: **36/36** ca qua trên Chromium desktop, Chromium mobile và WebKit mô phỏng iPhone. Landing/preview độc lập API tài chính; kiểm xác thực server, dialog lồng nhau, pending save, focus và căn bố cục.
- Nhóm `loading.spec.ts` chạy lại riêng: **12/12** ca qua trên ba profile trên. Giữ request thật để kiểm vòng xoay/nút bị khóa/aria-busy, hoàn tất thì dừng, lỗi và thử lại ở Tổng quan/Chi tiêu/Thu nhập; kiểm loading cả bảy workspace, sáng/tối, reduced motion, 375px và xoay ngang. Không ghi nhận hydration error trong nhóm tải workspace.
- Nhóm kiểm đăng nhập ban đầu sửa matcher để bao gồm query của URL OTP; helper đăng nhập chờ request Tổng quan kết thúc trước khi giả lập request điều hướng tiếp theo, tránh race trên WebKit. Sau chỉnh bài kiểm thử, cả 12 ca loading đều qua.
- Production build đầu tải font Google bình thường; lượt kiểm lại gặp kết nối IPv6 bị treo, nên nhóm loading cuối dùng CSS và năm file Nunito thật đã tải từ build thành công qua biến môi trường test `NEXT_FONT_GOOGLE_MOCKED_RESPONSES`. Fixture ở `artifacts/loading-cached-fonts.cjs`, không thay source hoặc cấu hình build sản phẩm.
- Đã xem ảnh desktop sáng và mobile tối; ảnh/trace cuối ở `artifacts/browser/`, gồm `loading-light.png` và `loading-dark.png` cho từng profile. Cơ sở dữ liệu PostgreSQL và Auth double local cô lập; không ghi cloud, không deploy hoặc nghiệm thu iPhone vật lý.

Đã rà soát catalog, landing copy và preview: tên/trạng thái module, khả năng tài chính và dữ liệu minh họa cố định phù hợp; không thêm loading giả cho thao tác preview. README, tài liệu UX, đặc tả phản hồi giao diện, landing và troubleshooting cập nhật cùng source; giữ các mốc kiểm chứng trước.


## Sửa lỗi tải backup và UI/UX Cài đặt — 18/10/2026

- Đọc chỉ schema trên database đang cấu hình xác nhận đủ phần Đầu tư nhưng thiếu `data_imports`. Regression ban đầu tái hiện lỗi `SCHEMA_NOT_READY` khi chỉ thiếu bảng biên nhận; sau sửa, export/status không phụ thuộc bảng này, import vẫn trả `IMPORT_NOT_READY`. `npm run test:db`: **52/52 tests** qua, gồm export đủ 28 bảng trong trạng thái thiếu migration import; kiểm tra dữ liệu tài chính thiếu vẫn fail đóng.
- Đọc qua runtime RLS trên database đang cấu hình: **560 bản ghi tài chính**, xuất và validate đủ **28 bảng**, **198830 byte**. Tất cả nằm trong transaction read-only; không lưu file dữ liệu thật ra ổ đĩa, không áp dụng migration, ghi hoặc reset dữ liệu của người dùng. Hồ sơ trong lượt chẩn đoán dùng ba trường trống; đây là bằng chứng đọc/xuất backend, không phải kiểm tra phiên Auth thật của người dùng trên trình duyệt.
- `TEST_WEBKIT=1 npm run test:e2e -- backup.spec.ts loading.spec.ts`: **33/33 browser tests** qua trên Chromium desktop/mobile và iPhone WebKit giả lập, dùng production build, PostgreSQL/Auth double cô lập. Có ca import chưa sẵn sàng nhưng export vẫn tải, status lỗi không làm nút tải im lặng, lỗi tại thẻ tương ứng, phản hồi HTML giả lập, loading/retry và mô phỏng chặn tải tự động nhưng liên kết Lưu file JSON tải được file đúng định dạng.
- Sau điều chỉnh câu lỗi cuối và trợ năng, chạy riêng ba ca `status failure` trên desktop/mobile/WebKit: **3/3** qua với bản dev cô lập.
- Playwright MCP Firefox sạch và iPhone WebKit giả lập đều nhận sự kiện download, `failure: null` và liên kết lưu trực tiếp còn dùng được. Đã xem ảnh desktop, iPhone và 320px dark/reduced-motion; không tràn ngang. Ảnh `artifacts/settings-after-desktop.png`, `artifacts/settings-after-iphone.png`, `artifacts/settings-after-320-dark.png`. Không thay cho thiết bị thật.
- `npm run check` bản cuối: **133/133 unit tests**, typecheck và production build qua. `git diff --check` qua. Đã rà soát/cập nhật README, catalog, landing/preview, đặc tả backup, kiến trúc, UX và deployment; giữ các mốc cũ.
- Khởi động source hiện tại tại `http://127.0.0.1:3000`; `/settings` trả 307 đến login khi chưa có phiên, giữ nguyên boundary xác thực. Bản preview sao chép cũ không tự nhận thay đổi của source hiện tại.


### Căn đều hai thẻ Cài đặt — 18/10/2026

Trình duyệt Firefox local tái hiện lệch đáy 28,9px ban đầu và 152px sau tải tại 1440px, do `align-items: start`. Sau đổi grid sang `stretch`, hai thẻ cùng mép trên/dưới tại 1440/1100px, trước và sau tải; preview import mở rộng thẻ bên phải vẫn giữ cùng chiều cao. Kiểm thêm 768/375/320px: xếp dọc, không chồng nội dung hoặc tràn ngang. WebKit iPhone giả lập kiểm 1440/375/320px qua. Kiểm cả light/dark; download trả `failure: null`. Đã xem ảnh `artifacts/settings-aligned-1440.png`, có thêm ảnh 320px. Dùng PostgreSQL/Auth double local cô lập, không ghi/reset cloud; không đại diện thiết bị thật. Thay đổi chỉ CSS nên không thêm unit test hoặc chạy lại kiểm thử nghiệp vụ.

### Focus và tooltip biểu đồ Tiết kiệm — 18/10/2026

- Bỏ focus khỏi nhóm chứa cả điểm và nhãn tháng, dùng vòng nhỏ quanh điểm hoặc viền quanh cột/lát khi Tab. Click/tap không còn khung dài xuống trục. Tooltip cho điểm, từng cột nạp/rút, từng lát donut và chú giải; Escape/bấm ngoài đóng, đổi loại biểu đồ/phân bố bỏ lựa chọn cũ. Cuộn ngang do Tab giữ tooltip ở đúng điểm mới.
- `npm test`: **133/133** unit tests qua; `npm run typecheck` và `git diff --check` qua. Production build `next build --webpack` trong runner cô lập qua; Google Fonts IPv6 bị treo nên lần chạy cuối dùng CSS/font Nunito thật tải sẵn bằng IPv4 qua biến môi trường kiểm thử, không sửa cấu hình font ứng dụng.
- `TEST_WEBKIT=1 npm run test:e2e -- savings.spec.ts`: **18/18** qua trên Chrome desktop, Chrome mobile và WebKit mô phỏng iPhone. Thêm **2/2** bài tooltip trên Firefox desktop và WebKit desktop với config tạm trong artifacts, cùng production app local. Không có page errors trong bài tooltip.
- Bài mới kiểm click/tap, hover từng lát thật theo tọa độ để phát hiện tooltip chặn phần bên dưới, số tiền từng cột, nhóm Khác, Tab/focus ring, Escape cả khi hover, Privacy Mode, đổi phân bố, tháng tương lai và hai nơi Tổng quan/Báo cáo. Kiểm không tràn ngang và tooltip nằm trong viewport ở 320px/844px ngang, light/dark và reduced motion; có ảnh `artifacts/savings-point-tooltip-desktop.png`, `artifacts/savings-allocation-tooltip-firefox.png`, `artifacts/savings-chart-320-mobile.png`.
- Đã rà/cập nhật catalog, landing copy, preview cố định, README, đặc tả Tiết kiệm và UX; preview public tiếp tục không đọc API tài chính. Toàn bộ kiểm chứng dùng PostgreSQL/Auth double local cô lập, không ghi dữ liệu cloud; chưa deploy hoặc kiểm trên thiết bị vật lý. Giữ nguyên các mốc kiểm chứng trước đó.


## Dialog và khả năng đọc dữ liệu — 19/10/2026

Triển khai bắt đầu ngày 18/10: Thu nhập, Chi tiêu, Tiết kiệm và Đầu tư dùng header cố định, body cuộn, footer form cố định; detail 960px/form 760px/xác nhận 480px và gần toàn màn hình trên điện thoại. Tóm tắt số liệu, tab có số lượng, bảng/thẻ có nhãn, bộ lọc và 20 dòng/trang; preview có nhãn Trước/Sau và cho đọc toàn bộ thay đổi. Mở/sửa/lưu trong dialog con giữ parent, tab, bộ lọc và vị trí. Đầu tư bổ sung focus helper dùng chung để sửa lỗi trả focus trên WebKit.

- `npm test`: **134/134 unit tests** qua. Bài mới đối chiếu tiền hiển thị với chênh lệch số dư do engine tính ở cả hai phía chuyển tiền, phí/thuế, vàng, tiền gửi/nhận lãi/tái tục và số nguyên vượt `Number.MAX_SAFE_INTEGER`.
- `npm run typecheck` qua; production build `next build --webpack` trong runner kiểm thử cô lập qua. Dùng CSS/font Nunito thật đã cache qua biến môi trường kiểm thử do Google Fonts IPv6 không ổn định; không đổi cấu hình font ứng dụng.
- Lần toàn bộ `TEST_WEBKIT=1 TEST_FIREFOX=1 node scripts/test-postgres.mjs --browser`: **224/228** qua. Bốn lỗi đều là một bài Zen lặp ở bốn trình duyệt, vẫn mong mọi dialog đóng sau khi lưu biểu tượng. Đã cập nhật bài để kiểm tra editor đóng, parent còn mở theo luồng mới rồi chủ động đóng parent trước khi thao tác nền.
- Chạy lại `TEST_WEBKIT=1 TEST_FIREFOX=1 node scripts/test-postgres.mjs --browser tests/browser/zen.spec.ts`: **16/16** qua, gồm cả bốn ca trên. Tổng phạm vi 228 ca đã được kiểm chứng qua lần toàn bộ và lần chạy lại; không tuyên bố một lượt toàn bộ 228/228. Prettier cho các file giao diện/test thay đổi và `git diff --check` đều qua.
- `dialogs.spec.ts`: **12/12** qua trên Chromium desktop, Chromium mô phỏng iPhone, Firefox desktop và WebKit mô phỏng iPhone. Kiểm dữ liệu tổng hợp 0/1/20/21/221 dòng, ranh giới trang, tìm không dấu/không có kết quả, ba lớp dialog, sửa/lưu thật qua API local rồi quay lại đúng nội dung; tháng, đợt vàng, sổ tiền gửi và che tiền/khối lượng.
- Kiểm light/dark, reduced motion, viewport 320/375/768/1024/1440, 844×390 ngang và mô phỏng phóng chữ 200%; không tràn ngang, tiêu đề/nút đóng vẫn hiện khi cuộn, footer form tiếp cận được. Đã xem ảnh detail vàng dark, mobile phóng chữ và hũ chi tiêu desktop. Ảnh được giữ tại `artifacts/dialog-review/`; dữ liệu stress là tổng hợp, không phải số dư thật.
- Bộ toàn ứng dụng còn kiểm auth/landing, backup, hồ sơ, loading/lỗi mạng, xung đột phiên bản, riêng tư, biểu đồ và tooltip Tiết kiệm. Log gốc: `artifacts/dialog-validation.log`; log chạy lại: `artifacts/dialog-zen-validation.log`.
- Đã rà soát/cập nhật README, catalog, landing copy, preview minh họa cố định, UX và đặc tả bốn module. Preview không đọc API tài chính. Không thay API/schema/công thức nghiệp vụ; toàn bộ kiểm chứng dùng PostgreSQL/Auth double local cô lập, không ghi/reset cloud, chưa deploy hoặc kiểm trên thiết bị vật lý.


## Cập nhật ngầm khi quay lại ứng dụng — 19/10/2026

Tổng quan, Chi tiêu và Thu nhập giữ nội dung khi đã có dữ liệu; quay lại trong 60 giây từ lần đọc thành công không tạo request mới. Sự kiện focus/visibilitychange/online được gộp, bỏ qua khi còn request hoặc trang ẩn/offline; reconnect/đổi ngày Việt Nam có thể đọc sớm hơn, tối thiểu 5 giây giữa các lần tải tự động. Gợi ý khôi phục dùng cùng chính sách. Lần mở đầu/đổi năm Thu nhập vẫn tải có phản hồi; lưu, retry và timer đổi ngày vẫn đọc server ngay.

- `npm test`: **141/141** unit tests qua, gồm **7** bài mới về độ mới dữ liệu, request chậm, sự kiện trùng, reconnect, đổi ngày Việt Nam, lỗi/cooldown và đọc bị thay thế.
- `npm run typecheck` qua. Production build `next build --webpack` trong runner cô lập qua; dùng CSS/font Nunito thật đã cache qua `NEXT_FONT_GOOGLE_MOCKED_RESPONSES`, không đổi cấu hình font sản phẩm.
- `TEST_WEBKIT=1 TEST_FIREFOX=1 npm run test:e2e -- foreground-refresh.spec.ts loading.spec.ts expenses.spec.ts income.spec.ts landing.spec.ts`: lượt cuối **112/112** qua trên Chrome desktop, Chrome mobile, Firefox desktop và WebKit mô phỏng iPhone. Log: `artifacts/foreground-validation-final.log`.
- Bộ mới có **20/20** ca trên bốn profile: quay lại sớm không fetch, dữ liệu server thay đổi được phản ánh sau cập nhật ngầm, một request cho các sự kiện trùng, không chèn loading/không đổi tọa độ nội dung, lỗi giữ view và retry có busy/spinner, 401 xóa view, offline/ẩn không tải và reconnect khi ẩn được xử lý khi hiện lại; giữ nội dung và focus bản nháp. Hồi quy giữ loading lần đầu, đổi năm, rollover, lưu/version/idempotency, Auth và preview public độc lập API.
- Lượt đầu có 8 lỗi ở selector mới (tên hũ có emoji trang trí, alert của Next route announcer); đã đổi sang tên truy cập của nút và giới hạn alert trong main, rồi chạy lại toàn bộ trên source cuối. Không dùng kết quả lượt đầu để coi các ca đó đã qua.
- Đã xem ảnh Chi tiêu desktop sáng/mobile tối khi request ngầm còn chờ; ảnh `background-refresh.png` ở `artifacts/browser/foreground-refresh--budget-f8ca6-ut-loading-or-layout-shifts-{desktop,mobile}/`. Các kiểm loading còn kiểm cả hai theme, reduced motion và xoay ngang.
- Đã rà soát catalog, copy landing và preview cố định; khả năng tài chính/trạng thái module không đổi. Cập nhật README, kiến trúc, UX và đặc tả Thu nhập/Chi tiêu/phản hồi giao diện/landing. Toàn bộ bằng chứng dùng PostgreSQL và Auth double local cô lập; không ghi cloud, chưa deploy hoặc kiểm thiết bị vật lý.


## Fund — Vườn an toàn tài chính — 19/10/2026

Đã triển khai `/funds`, API preview/commands và migration bổ sung sổ quỹ độc lập. Living expense lấy mức cấu hình hiệu lực từ hũ chi tháng được chọn, không lấy ngoại lệ/thực chi hoặc hũ tích lũy; người dùng nhập x và xác nhận mục tiêu. Source đổi chỉ tạo đề xuất. Ba cảnh SVG cây/ô/cầu phản ánh số dư, giữ tỷ lệ khi ẩn tiền. Financial Goals tiếp tục là module riêng.

- `npm test`: **155/155 unit tests** qua. Kiểm phép nhân/làm tròn BigInt, nguồn hiệu lực/không hoạt động/0, thay nguồn và x, số dư xuyên lịch sử, chuyển tiền, sửa/hủy, số tiền lớn và vượt 100%, các mốc cảnh 0/24/25/50/75/100/200%, V1 → V2 và ngày giao dịch Việt Nam trong summary backup.
- `npm run test:db`: **58/58 PostgreSQL tests** qua trên cluster local cô lập với runtime `expense_api`/RLS. Bao gồm preview không ghi, retry, version/source conflict, hai owner, composite FK, history append-only, rollback muộn, chuyển liên quỹ, restore V2 đầy đủ Fund/revisions, nhận V1, phát hiện tài khoản chỉ có Fund và schema thiếu.
- `npm run typecheck` và `npm run build` qua; browser runner còn build production bằng webpack trong thư mục riêng. `git diff --check` qua.
- `TEST_FIREFOX=1 TEST_WEBKIT=1 npm run test:e2e -- funds.spec.ts backup.spec.ts expenses.spec.ts landing.spec.ts`: lượt cuối **116/116** qua trên Chromium desktop, Chromium mô phỏng iPhone, Firefox desktop và WebKit mô phỏng iPhone. Trong đó **32 ca Fund**, **84 ca hồi quy** Backup/Chi tiêu/Landing/xác thực.
- Browser Fund kiểm onboarding không mặc định x, preview chưa tạo sổ, ưu tiên, thay nguồn có xác nhận, dialog con giữ tab/bộ lọc, sửa/chuyển thực qua API, version conflict, mất phản hồi sau commit và retry không trùng, ngừng/khôi phục nơi giữ, hủy có lịch sử, phân trang 21 dòng, cập nhật foreground giữ bản nháp khi lỗi và xóa view khi hết phiên, riêng tư, bàn phím, reduced motion, light/dark và không tràn ngang.
- Đã xem ảnh desktop sáng và mobile tối. Ảnh từng profile: `artifacts/funds-light-{desktop,mobile,firefox,webkit}.png` và `artifacts/funds-dark-{desktop,mobile,firefox,webkit}.png`. Landing Fund hiển thị minh họa cả ở màn hình nhỏ, dùng số liệu cố định và không gọi API tài chính.
- Các vòng trước đã phát hiện/sửa: khác thứ tự khóa JSONB gây báo nguồn thay đổi giả, khác độ chính xác timestamp khi replay backup, selector dialog/tab ẩn bị trùng và CSS preview cũ ẩn hình Fund ở mobile. Chỉ dùng kết quả lượt cuối 116/116 để nghiệm thu browser.
- Đã rà/cập nhật catalog, landing/copy/preview, README, đặc tả Fund/Chi tiêu/backup/landing và tài liệu kiến trúc, dữ liệu, UX, deployment/discovery/sample-data. Giữ nguyên các thay đổi đang có trước lượt triển khai.
- Log cuối: `artifacts/funds-unit-validation.log`, `funds-postgres-validation.log`, `funds-browser-validation.log`, `funds-typecheck-validation.log`, `funds-build-validation.log`.

Toàn bộ dữ liệu kiểm thử là tổng hợp, Auth là contract double local; không ghi/reset cloud. Migration `202610190001_funds.sql` cần áp dụng bằng SQL Editor/admin trước khi phát hành source mới. Chưa xác minh cloud deployment, Auth thật hoặc thiết bị vật lý. Backup V2 yêu cầu đủ schema Fund; không bỏ module thiếu khỏi bản sao lưu.

## Dữ liệu review Fund — 19/10/2026

Lượt bổ sung dữ liệu mẫu, tiếp nối lịch sử nghiệm thu triển khai Fund ở trên:

- Unit: **158/158** đạt (`artifacts/fund-review-unit-validation.log`). Generator không sửa bộ bốn module cũ, sử dụng đúng nguồn Chi tiêu, dựng tiến độ 50/105/25% và đủ lịch sử.
- PostgreSQL local riêng: **63/63** đạt (`artifacts/fund-review-postgres-validation.log`). Bao gồm nạp Fund bằng runtime RLS, bảo toàn 28 bảng cũ, retry giữ chỉnh sửa, từ chối version/marker/dữ liệu khác, CLI mặc định không ghi + apply/read-back, backup 35 bảng/biên nhận, reset bị khóa mặc định, bảo toàn owner khác/Auth, rollback lỗi muộn/trigger và migration+seed nguyên tử trên database chưa có Fund.
- Browser production build local: **4/4** đạt trên Chromium desktop/mobile, Firefox desktop, WebKit mobile (`artifacts/fund-review-browser-validation.log`). Kiểm tra dữ liệu nhập thực qua SQL, cả ba tiến độ, phần vượt, bước tiếp theo, hai trang giao dịch/tìm kiếm, lịch sử hủy, nơi giữ ngừng/trống, Privacy Mode và không tràn ngang. Đây là mô phỏng, không phải thiết bị vật lý hoặc Auth cloud thật. Ảnh `artifacts/browser/fund-review-*.png`.
- `npm run typecheck` đạt. Browser runner đã build production bằng webpack và mở thành công; không phát hành deployment.
- `npm run data:preview` đã mở đủ năm module, đăng nhập demo và đọc lại Fund tổng 84.600.000 VND / 39 revision / 6 nơi giữ. Chứng cứ `artifacts/fund-review-preview-readback.json`, ảnh viewport desktop/mobile `artifacts/fund-review-preview-{desktop,mobile}.png`; metadata URL hiện tại ở `artifacts/review-preview.json`. Đây là phiên local riêng, không phải owner cloud.
- Đã đối chiếu catalog/landing/public preview: các dữ liệu minh họa công khai vẫn cố định, không lấy dữ liệu private của owner. README, đặc tả Fund và hướng dẫn sample/reset được cập nhật cùng lượt.
- Cloud chỉ kiểm tra đọc bằng `expense_api` và sao lưu đúng UID: bốn module đã có bộ review cùng dataset; 7 bảng Fund và `data_imports` còn thiếu, role không có CREATE. CLI dừng `FUNDS_MIGRATION_REQUIRED` trước mọi ghi. Package private có `01-enable-and-seed.sql` để SQL Editor/admin chạy. **Chưa nạp Fund, chưa reset cloud, chưa chứng minh deployment hoặc thiết bị vật lý.**

## Help theo từng trang — 20/10/2026

Đã bổ sung bài tiếng Việt cho đủ 12 trang, nút Hướng dẫn dùng chung và các điểm giải thích trong workspace/form. Nội dung tải khi mở, có mục lục, lỗi/thử lại; Help dùng cùng stack dialog, giữ bản nháp và trả focus khi đóng. Bốn module chưa triển khai có bài riêng ghi đúng trạng thái. Định nghĩa ba quỹ dùng chung với hướng dẫn Fund hiện có.

- `npm test`: **167/167 tests**, **20/20 files** đạt. Contract Help kiểm đủ catalog cộng Hồ sơ, sáu phần mỗi bài, ID duy nhất, tác vụ có bước/kết quả, định nghĩa quỹ dùng chung và mọi đích của HelpButton, kể cả các nhánh theo loại form.
- `npm run typecheck`, `npm run build` và `git diff --check` đạt. Log cuối: `artifacts/help-unit-final.log`, `help-typecheck-final.log`, `help-build-final.log`.
- Lượt toàn bộ browser có **319/324 đạt**, còn năm ca bố cục: bộ chọn kỳ Thu nhập dưới 400px ở bốn profile và topbar bị tràn khi phóng 200% trên desktop. Đã sửa độ ưu tiên CSS bộ chọn kỳ và cho topbar có Help xuống dòng. Log: `artifacts/help-regression-final.log`.
- Sau sửa, chạy lại `help.spec.ts profile.spec.ts zen.spec.ts interface-feedback.spec.ts backup.spec.ts`: **100/100 đạt** trên Chromium desktop/mobile, Firefox desktop và WebKit mô phỏng iPhone. Bao gồm cả năm ca lỗi trên, hồ sơ, bộ lọc, sao lưu/khôi phục, theme và phóng chữ. Log: `artifacts/help-regression-layout.log`.
- Lượt cuối `help.spec.ts dialogs.spec.ts`: **36/36 đạt** trên cùng bốn profile, gồm **24 ca Help** và **12 ca dialog hiện có**. Kiểm bổ sung Tab từ tiêu đề được mục lục focus quay về nút đóng, Shift+Tab đi đúng vòng; Escape chỉ đóng lớp trên cùng. Log: `artifacts/help-dialog-final.log`. Sau lượt này chỉ tinh chỉnh đích tra cứu nạp/rút/chuyển ví và hủy giao dịch Đầu tư; contract đích Help, toàn bộ unit, typecheck và build chạy lại đạt.
- Phạm vi Help bao gồm đúng bài cho 12 route; không phát sinh request tài chính hay lệnh ghi khi mở; đọc được khi API nghiệp vụ lỗi; hủy tải chunk và thử lại; đổi route đóng/đặt lại mục; hai form lồng nhau giữ giá trị chưa lưu, vị trí cuộn, focus và khóa cuộn nền. Bộ hồi quy rộng còn bao phủ điều hướng, xác thực, landing và các module tài chính.
- Kiểm viewport 375px, desktop 1440px, ngang 812px, sáng/tối, reduced motion và chữ lớn; nội dung không tràn ngang, tiêu đề/nút đóng vẫn tiếp cận được. Đã xem ảnh 375px sáng và 1440px tối tại `artifacts/help/`. Public preview dùng phần giải thích minh họa cố định cho năm tab, không gọi API tài chính.
- Trong quá trình kiểm tra đã tái hiện hydration mismatch của SVG hướng dẫn cài màn hình chính: `<title>` có nhiều React text node. Gộp thành một chuỗi và chạy lại bài 12 route trên cả bốn trình duyệt không còn lỗi runtime/hydration. Đây là lỗi tái hiện trong trình duyệt sạch local.
- Đã cập nhật/rà soát catalog, landing/preview, README, tài liệu Help, kiến trúc, UX, discovery và các đặc tả liên quan; kiểm liên kết giữa các tài liệu Markdown đạt. Tám liên kết ảnh browser ở các mốc kiểm chứng cũ không còn file trong thư mục artifacts hiện tại; giữ nguyên lịch sử, không tái tạo ảnh để thay thế bằng chứng cũ. Không thêm API, schema, migration hay thay đổi công thức nghiệp vụ cho Help; giữ kiểm tra quyền server từng trang và các thay đổi có sẵn trong workspace.

Các lượt browser dùng production build cô lập, PostgreSQL và Auth contract double local; dữ liệu kiểm thử tổng hợp. Kết quả trên là bằng chứng nhiều lượt có phạm vi rõ ràng, **không phải một lượt toàn bộ 324/324 trên source cuối**. Không ghi/reset cloud, không deploy và không coi mô phỏng là kiểm chứng Auth thật hoặc thiết bị vật lý. Các mốc kiểm chứng cũ được giữ nguyên.

## Hoàn tất 33 phản hồi giao diện — 20/10/2026

Tiếp tục lượt triển khai bị gián đoạn ngày 19/10, kiểm tra trên source hiện tại có cả Fund, Help và khả năng tương thích schema logo. Giữ nguyên các thay đổi sẵn có trong workspace. Lượt cũ `feedback-final-browser.log` đã dừng ở lỗi TypeScript trước khi chạy browser, không được tính là kết quả đạt; lượt mới dưới đây đã hoàn tất trên source hiện tại.

- `npm test`: **167/167 tests, 20/20 files** đạt. Log `artifacts/feedback-resume-unit.log`.
- `npm run test:db`: **67/67 tests, 11/11 files** đạt trên PostgreSQL local cô lập, runtime RLS. Bao gồm schema logo mới/cũ, lỗi lưu metadata và tính nguyên tử. Log `artifacts/feedback-resume-postgres.log`.
- `npm run typecheck` và `npm run build` đạt trên Node **22.12.0**; build mặc định Next.js **16.4.1**. Log `artifacts/feedback-resume-typecheck.log`, `artifacts/feedback-resume-build.log`. Browser runner còn build production bằng webpack trong thư mục riêng; log `artifacts/feedback-resume-next.log`.
- `TEST_FIREFOX=1 TEST_WEBKIT=1 npm run test:e2e`: **324/324 đạt trong một lượt toàn bộ, 10 phút**, gồm 81 ca mỗi profile Chromium desktop, Chromium mô phỏng iPhone, Firefox desktop và WebKit mô phỏng iPhone. Log `artifacts/feedback-resume-browser.log`; `artifacts/browser/.last-run.json` có trạng thái passed, không có failedTests. Sau lượt này chỉ cập nhật tài liệu, không đổi source ứng dụng.
- Bộ mới `interface-feedback.spec.ts`: **16/16** ca trên bốn profile. Kiểm thứ tự/tag menu, sidebar và theme sau reload, theme hệ thống, hướng dẫn cài bốn bước theo thiết bị, quay lại từ Hồ sơ và nút riêng tư khi cuộn; Thu nhập phân biệt thiếu/0, nhập đúng ô tháng, chuẩn hóa tiền, tooltip/privacy, sửa rồi hoàn tác và danh mục ngừng; Chi tiêu select đóng, lỗi field, thêm phân loại lồng nhau giữ bản nháp, logo trong backup và giải mã đủ 13 asset bằng trình duyệt, cột được nhớ và năm trống chỉ xem; form Tiết kiệm/Đầu tư cùng quy tắc chưa đổi/lỗi field.
- Toàn bộ hồi quy còn kiểm dialog cha/con, focus Safari, lịch sử tài chính, phân trang, loading/lỗi mạng/xung đột/retry, backup/import, Auth và preview public không đọc API tài chính. Các bài layout kiểm sáng/tối, reduced motion, nhiều viewport đến 320px, xoay ngang và chữ lớn; không tràn trang trong phạm vi được đo.
- Đã xem ảnh Thu nhập desktop/mobile và Chi tiêu desktop tối từ lượt hiện tại. Ảnh `artifacts/browser/feedback-{shell,income,expenses}-{desktop,mobile,firefox,webkit}.png`, cùng ảnh từng bài layout. Ảnh full-page của trang đã cuộn có thể ghi header sticky tại vị trí viewport đang xem; kiểm vị trí nút riêng tư dùng tọa độ viewport thực.
- Đã rà/cập nhật README, catalog, landing/copy/preview cố định, kiến trúc, UX và các đặc tả Chi tiêu/Thu nhập/Hồ sơ/Tiết kiệm/Đầu tư/Quỹ an toàn/backup/phản hồi giao diện. Ma trận [33 phản hồi](features/interface-feedback-2026-10-19.md) ghi kết quả và quy tắc rà soát thành phần cùng loại. `git diff --check` đạt.

Toàn bộ bằng chứng mới là local với dữ liệu tổng hợp và Auth contract double, không ghi/reset cloud, không deploy, không xác minh Auth thật hoặc thiết bị vật lý. Migration `202610190002_label_visuals.sql` cần cho việc lưu logo/icon tùy chọn; schema cũ vẫn dùng được thao tác không có metadata theo bản sửa tương thích ngày 20/10. Lượt này không tự áp dụng migration cloud. Giữ nguyên các mốc kiểm chứng lịch sử ở trên.

## Đối soát cloud Fund sau script 01 — 20/10/2026

Sau khi người dùng báo đã chạy `imports/funds-review-2026-10-19-f10d12b7/01-enable-and-seed.sql`, đã kiểm tra lại đúng UID `00850da1-9131-4109-8d16-259424eaefc3` qua kết nối `expense_api`, role authenticated và RLS. Cả 7 bảng Fund đã có; marker cả năm module khớp dataset. Chỉ chạy importer ở chế độ đọc mặc định, không seed lại hoặc reset; giữ các thay đổi review hiện có ở module khác.

- Đọc lại Fund version 48: 3 quỹ, 6 nơi giữ, 2 cấu hình, 37 giao dịch gốc / 39 revision và 48 audit. Dựng lại toàn bộ lịch sử bằng domain validator, đối chiếu toàn bộ FundBook và số tiền với package: khớp.
- Emergency 27/54 triệu (50%), Rainy Day 44,1/42 triệu (105%), Sinking 13,5/54 triệu (25%); tổng dự phòng 84,6 triệu, Emergency 4,5 tháng. Nguồn sinh hoạt không đổi (`sourceChanged=false`).
- Snapshot mới đúng owner tại `backups/before-funds-review-00850da1-9131-4109-8d16-259424eaefc3-1792507119998.json`, quyền 0600. Log `artifacts/fund-review-cloud-readback-2026-10-20.log`, kết quả đối soát `artifacts/fund-review-cloud-verified-2026-10-20.json`.
- `data_imports` vẫn thiếu; không ảnh hưởng đọc/ghi Fund, nhưng chức năng restore tại Cài đặt còn cần migration biên nhận. Không tự áp dụng migration hoặc tăng quyền runtime.

Đây là xác minh dữ liệu database cloud qua runtime/RLS, không phải bằng chứng UI deployment, Auth đăng nhập thật hoặc thiết bị vật lý. Reset cloud vẫn chưa thực hiện.

## Tinh chỉnh Help theo phản hồi — 21/10/2026

Hoàn tất bốn phản hồi về vị trí nút, phân cấp đề mục, nhấn ý chính và chuyển động. Hướng dẫn nằm cạnh h1 trên đủ 12 trang, có nhãn đầy đủ trên điện thoại. Các mục lớn 01–06, mục con 3.1/4.1… và khối tư duy/ví dụ/lưu ý giúp đọc lướt; từ khóa, công thức và số tiền minh họa được nhấn theo theme. Help trượt vào 280ms, thu về 220ms; giữ modal/focus/khóa cuộn đến khi đóng xong, có fallback 300ms và bỏ chuyển động khi reduced motion.

- Unit: **168/168**, **20/20 files** đạt; typecheck và production build đạt. Log: `artifacts/help-refinement-unit.log`, `help-refinement-typecheck.log`, `help-refinement-build.log`. Contract bổ sung render toàn bộ nội dung, gồm công thức có dấu `=`, không để lộ dấu nhấn source và vẫn escape HTML.
- Lượt hồi quy `help.spec.ts dialogs.spec.ts zen.spec.ts profile.spec.ts landing.spec.ts`: **100/104 đạt** trên Chromium desktop/mobile, Firefox desktop và WebKit mô phỏng iPhone. Bốn lỗi cùng một ca đọc đủ 12 bài, phát hiện dấu nhấn công thức chưa được xử lý vì bộ tách ban đầu không cho ký tự `=` bên trong. Đã sửa bộ tách và thêm kiểm tra nội dung nêu trên. Log: `artifacts/help-refinement-browser.log`.
- Chạy lại toàn bộ `help.spec.ts` trên source sau sửa: **28/28 đạt** trên cùng bốn profile. Log: `artifacts/help-refinement-browser-final.log`. Các ca Help đã đạt cùng **76 ca hồi quy ngoài Help** của lượt trước; không tuyên bố một lượt 104/104 trên source cuối.
- Kiểm đủ 12 bài, vị trí nút trong tiêu đề, mục lớn đánh số và không có dấu nhấn source trên giao diện. Tiếp tục kiểm mục lục/bàn phím, focus/scroll/bản nháp trong hai dialog bên dưới, lỗi API/chunk và thử lại, đổi route, preview public không gọi API tài chính.
- Ca chuyển động đo vị trí đầu/giữa/cuối lúc mở, vị trí giữa lúc đóng; xác nhận modal vẫn mở, focus ở trong và nền còn khóa cuộn. Tắt animation để kiểm fallback, bật reduced motion để kiểm không còn animation và đóng trả focus đúng.
- Kiểm sáng/tối, 375px, 1440px, 812px ngang, chữ lớn, reduced motion và zoom trong bộ Zen; không tràn ngang, nút đóng tiếp cận được. Đã xem ảnh desktop sáng, mobile sáng và 375px tối. Ảnh: `artifacts/help-refinement/mindset-{desktop,mobile,firefox,webkit}.png`, `examples-{desktop,mobile,firefox,webkit}.png` và `artifacts/help/375-dark.png`.
- Đã cập nhật/rà soát README, catalog, landing/preview, đặc tả Help, kiến trúc, UX và phản hồi giao diện. Liên kết Markdown nội bộ và `git diff --check` đạt; giữ các mốc kiểm chứng cũ.

Kiểm thử dùng production build, PostgreSQL và Auth contract double local với dữ liệu tổng hợp. Không phát hành deployment hoặc ghi/reset cloud; mô phỏng trình duyệt không thay cho Auth thật hay thiết bị vật lý.

## Chủ đề Khu vườn / Dòng nước — 21/10/2026

Thêm hai chủ đề với bảng màu sáng/tối riêng và dùng chung chế độ Sáng/Tối/Theo hệ thống. Phạm vi gồm app, Help, landing/preview cố định, login và offline. Tùy chọn giữ trên trình duyệt; không đổi schema/API tài chính, không thêm tùy chọn vào backup. Bảo toàn các chỉnh sửa tài liệu Help đã có trước đợt này.

- `npm test`: **172/172**, **21/21 files** đạt. Bổ sung kiểm tra tương thích tùy chọn, script trước hydration, fallback khi storage bị chặn, nội dung offline và hình học tiến độ Quỹ. Kiểm tra Quỹ sẵn có tiếp tục bao phủ các mốc 0/24/25/50/75/100% và vượt mục tiêu.
- `npm run typecheck` và `npm run build` đạt, Node **22.12.0**, Next **16.4.1**. Runner browser dùng một production build webpack và PostgreSQL/Auth contract double riêng, không dùng dữ liệu cloud.
- Bộ mới `TEST_FIREFOX=1 TEST_WEBKIT=1 npm run test:e2e -- visual-themes.spec.ts`: **30 đạt, 2 bỏ qua theo engine**. Hai ca service worker chỉ chạy trên Chromium desktop/mobile; ca nội dung offline chạy trên cả Chromium, Firefox và WebKit. Đã kiểm thực tế cache chỉ chứa `/offline.html` với khóa `fm-offline-v3`, offline navigation hiển thị đúng Dòng nước tối.
- Đủ bốn tổ hợp chủ đề × sáng/tối trên 12 trang với dữ liệu tổng hợp. Kiểm native radio/bàn phím, reload, tab đồng bộ, storage bị chặn/giá trị lạ, Theo hệ thống và override, SVG/lời dẫn đúng chủ đề, meta theme-color, public preview không gọi API tài chính, giữ bản nháp dialog đang mở khi đổi chủ đề từ tab khác.
- Đo chữ chính/phụ trên canvas/surface/surface-alt/primary-soft đạt **≥4.5:1**, chữ trên nút primary **≥4.5:1**, màu focus so với surface **≥3:1** cho cả bốn tổ hợp. Kiểm 320/768/1440px, zoom CSS 200%, reduced motion, Help, biểu đồ, Quỹ và che tiền giữ tỷ lệ. Đã xem ảnh desktop sáng và mobile 320px tối tại `artifacts/themes/`; đây là mô phỏng trình duyệt, không phải thiết bị vật lý.
- Rà soát/cập nhật catalog, README, landing/preview, hướng dẫn Cài đặt trong Help và tài liệu kiến trúc/UX/Backup/Quỹ/theme. Liên kết Markdown nội bộ không thiếu đích; giữ các mốc validation cũ.

Hồi quy toàn ứng dụng: **357 đạt, 2 bỏ qua, 1 lỗi** trong 360 ca trên Chromium desktop/mobile, Firefox và WebKit (15,8 phút). Ca lỗi WebKit tìm nút Cột hiển thị trong bản build còn dùng summary: test được cập nhật sang button sau khi runner đã chụp source. Source/test bộ chọn cột và logo Chi tiêu đang được chỉnh song song trong workspace. Log: `artifacts/themes-regression.log`, `artifacts/themes-regression-next.log`; trace: `artifacts/themes-regression/`.

Đã kiểm lại bằng snapshot gồm cả source và tests để tránh trộn phiên bản:

- Snapshot `artifacts/theme-validation-final-hcd5a3pv`: **172 unit đạt**, typecheck và production build webpack đạt. Bộ `visual-themes.spec.ts interface-feedback.spec.ts expense-presentation.spec.ts` có **51 đạt, 2 bỏ qua, 3 lỗi**. Toàn bộ **30 ca theme được chạy** và **16 ca interface-feedback** đều đạt, gồm ca bộ chọn cột từng lỗi vì lệch phiên bản. Ba lỗi thuộc bộ test mới của thay đổi popup Chi tiêu: viewport ngang thấp và seed trước khi trang tải xong. Log: `artifacts/themes-current.log`; trace/ảnh nằm trong snapshot ở `artifacts/themes-current/` và `artifacts/themes/`.
- Sau bản sửa popup/seed song song, snapshot `artifacts/theme-column-final-59so0c9p` kiểm lại hai ca popup mới và ca bộ chọn cột cũ trên đủ bốn profile: **12/12 đạt**. Log: `artifacts/themes-column-final.log`; production-build log và trace nằm trong snapshot ở `artifacts/themes-column-next.log`, `artifacts/themes-column/`. Phần theme giữ nguyên khi đối chiếu source/public với workspace. Sau snapshot này, `column-table.tsx` tiếp tục có chỉnh sửa song song để căn giữa popup trên màn hình hẹp; chỉnh sửa kế tiếp này không thuộc kết quả 12/12 nêu trên.

Các lỗi nêu trên đã có ca kiểm lại đạt trên snapshot tương ứng; không tuyên bố một lượt 360/360 trên source cuối. Phần theme giữ nguyên giữa hai snapshot. Không ghi đè thay đổi bộ chọn cột/logo đang làm song song. Liên kết Markdown nội bộ và `git diff --check` đạt.

Chưa triển khai cloud/deployment hoặc kiểm chứng Supabase Auth thật/thiết bị vật lý trong đợt này. Ba chủ đề Lửa ấm/Kim ngân/Đất lành chỉ ghi nhận định hướng, chưa xuất hiện trong bộ chọn.

## Bộ chọn cột và logo Chi tiêu — 21/10/2026

Đưa nút Cột hiển thị cạnh tiêu đề tháng/số hũ, bỏ hàng trống trước bảng. Bộ chọn dùng native auto popover trên top layer; danh sách công tắc không đẩy bảng và không bị vùng cuộn/dialog cắt. Điện thoại hẹp dùng panel căn giữa; màn hình ngang ngắn tận dụng chiều cao viewport và cho cuộn danh sách. Desktop/card mobile dùng chung lựa chọn cột. Logo 20px, icon nhóm 16px, nhãn phụ thành các cụm có căn hàng; HSBC/Techcombank/MB dùng biểu tượng tách khỏi wordmark, các icon khác lấy từ website chính thức. Nguồn và cách trích phần biểu tượng ở `public/brands/sources.json`.

- `npm test`: **172/172 tests, 21/21 files** đạt. `npm run typecheck`, `npm run build` và `git diff --check` đạt. Node **22.12.0**, Next **16.4.1**. Log `artifacts/column-refinement-final-unit.log`, `column-refinement-final-typecheck.log`, `column-refinement-final-build.log`.
- Bộ tập trung `expense-presentation.spec.ts interface-feedback.spec.ts`: **24/24 đạt** trên Chromium desktop/mobile, Firefox desktop, WebKit mô phỏng iPhone. Log `artifacts/column-refinement-layout-browser.log`. Sau đó tinh chỉnh thêm căn giữa panel ở màn hình ≤480px; **cả 24 ca này cũng đạt trong lượt toàn bộ trên source sau tinh chỉnh**.
- Hai bài mới tương ứng **8/8 ca trên bốn profile**: đo tọa độ bảng trước/sau mở popover, ẩn cột/khôi phục mặc định, bấm ngoài/Escape/trả focus, giữ dialog cha khi đóng popover; kiểm logo ≤20px, căn giữa icon/nhãn và chiều cao hàng với 18 hũ tổng hợp; giữ lựa chọn desktop/mobile sau reload, 320px sáng/tối và 844×390 ngang. Bài sẵn có tiếp tục giải mã đủ 13 asset thương hiệu bằng trình duyệt và kiểm metadata trong backup.
- Lượt toàn ứng dụng **368 ca**: **342 đạt, 24 lỗi, 2 bỏ qua**. Log `artifacts/column-refinement-final-browser.log`, production-build log `column-refinement-final-next.log`, trace `artifacts/column-refinement-final/`. Lượt bị kéo dài **5,3 giờ**; phần lớn lỗi là timeout. Ví dụ trace ca Zen Firefox ghi khoảng 925 giây không tiến triển trong setup rồi test hết hạn trước khi kiểm trạng thái 401. Đây là dấu hiệu gián đoạn thực thi, không đủ để tự coi những ca đó đã đạt.
- Chạy lại đúng 24 test ID bằng `--last-failed`: **21 đạt, 3 timeout**, log `artifacts/column-refinement-failures-browser.log`. Chạy lại đúng ba ca còn lại: **3/3 đạt trong 1,3 phút**, gồm bốn tổ hợp theme trên mobile, đọc Help đủ 12 trang trên Firefox và bố cục tài chính trên Firefox. Log `artifacts/column-refinement-final-three-browser.log`; danh sách test cuối `artifacts/column-refinement-final-three.json` có trạng thái passed. Source/public được đối chiếu SHA-256 không đổi giữa các lượt; không tăng timeout hoặc nới kỳ vọng để nhận kết quả đạt.
- Tổng phạm vi **366 ca có chạy đã được xác nhận qua lượt toàn bộ và các lượt chạy lại**, không tuyên bố một lượt toàn bộ 368/368. Hai ca bỏ qua là service worker trên Firefox/WebKit theo điều kiện engine có sẵn; service worker vẫn chạy trên hai profile Chromium. Tài liệu offline được kiểm trên mọi engine.
- Đã xem ảnh desktop và mobile 320px tối; panel có đủ lựa chọn trên điện thoại dọc, các cụm logo/tên gọn. Ảnh từ source cuối nằm tại `artifacts/column-refinement-final/expense-presentation-colum-23f12-k-across-desktop-and-mobile-{desktop,mobile,firefox,webkit}/column-popover.png`, `column-320-light.png`, `column-320-dark.png`. Bằng chứng bổ sung của bộ tập trung giữ tại `artifacts/column-refinement-layout/`.
- Các lượt đầu đã phát hiện/sửa mất focus khi reset trở thành disabled và danh sách bị co về 0 trên màn hình ngang ngắn; sửa setup mới để đợi workspace đăng nhập xong trước khi seed, selector theo vị trí nút mới và asset BIDV trả HTML ở URL favicon cũ. Chỉ dùng các lượt trên source sau sửa để xác nhận phạm vi tương ứng.
- Đã rà/cập nhật README, catalog, landing/copy/preview, đặc tả Chi tiêu, kiến trúc, UX và phản hồi giao diện. Preview Timo/HSBC vẫn dùng tên/số tiền minh họa cố định, không gọi API tài chính. Giữ các thay đổi Help/theme có sẵn trong workspace và lịch sử validation trước đó.

Toàn bộ kiểm chứng mới dùng production build, PostgreSQL và Auth contract double local với dữ liệu tổng hợp; mobile là mô phỏng. Không ghi/reset cloud, không deploy hoặc xác minh Auth thật/thiết bị vật lý. Không đổi brand key, schema hay công thức tài chính; đợt tinh chỉnh này không cần migration mới.


## Bổ sung Vàng — Kim ngân — 21/10/2026

Mở rộng chủ đề trình duyệt thành Khu vườn/Dòng nước/Kim ngân, giữ cùng Sáng/Tối/Theo hệ thống. Kim ngân có token sáng/tối, tám cảnh SVG, ba cảnh Quỹ theo tỷ lệ, lời dẫn/icon và offline. Không thay đổi schema/API, cách tính số tiền, backup, logo thương hiệu hay emoji người dùng. Chỉ Lửa ấm/Đất lành còn là định hướng chưa triển khai; ghi nhận Kim ngân trong phần validation trước là lịch sử trước lần bổ sung này.

Bằng chứng local với Node 22.12.0 / Next.js 16.4.1:

- `npm test`: **173/173** qua 21 file, gồm chuẩn hóa ba chủ đề, script trước hydrate, offline cùng copy/màu, các mốc Quỹ 0/25/50/75/100%, giới hạn hình khi vượt mục tiêu hoặc phần trăm rất lớn.
- `npm run typecheck`: đạt. `npm run build`: đạt (Turbopack), log `artifacts/gold-theme-build.log`. Các lượt browser cũng biên dịch production bằng Webpack trong app tạm riêng.
- Rà soát catalog, landing copy, preview dùng dữ liệu cố định, README, kiến trúc, UX, themes, Funds, Help, backup và UI feedback; giữ các chỉnh sửa/lịch sử đã có. Preview không thêm API tài khoản; không thêm đồng bộ tài khoản hoặc khả năng nhập tài chính ngoại tuyến.

- Browser hồi quy: `TEST_FIREFOX=1 TEST_WEBKIT=1 npm run test:e2e -- visual-themes.spec.ts funds.spec.ts --grep 'theme|identit|preferences|real progress'`: **36 đạt, 2 bỏ qua, 2 lỗi kiểm thử / 40 ca**; log `artifacts/gold-theme-browser.log`. Toàn bộ **34 ca theme thực thi đạt**, hai ca service worker bỏ qua trên Firefox/WebKit; HTML offline vẫn được kiểm tra ở mọi engine. Hai lỗi là selector Quỹ chọn đồng thời SVG và nhãn lời dẫn (strict-mode), không phải lỗi tính năng; selector đã giới hạn vào `.fund-scene`.
- Chạy lại riêng Quỹ sau sửa selector trên Chromium desktop/mobile, Firefox và WebKit: **4/4 đạt**, log `artifacts/gold-fund-browser.log`. Có kiểm tra 0/25/50/75%, vượt mục tiêu (hình 100%, số vẫn 200%), che tiền, bàn phím và giảm chuyển động. Cộng theo ca riêng biệt, **34 ca theme + 4 ca Quỹ đã đạt** qua các lượt chạy, không diễn giải lượt 40 ca ban đầu thành một lượt chạy không lỗi.
- Khi rà soát bài kiểm tra, phát hiện viewport bị giữ ở desktop sau loạt ảnh settings; đã thêm khôi phục viewport thiết bị đầu mỗi tổ hợp. Chạy lại ma trận sáu tổ hợp trên Chromium iPhone và WebKit iPhone: **2/2 đạt**, log `artifacts/gold-responsive-browser.log`, ảnh ở `artifacts/gold-responsive-images/`. Mỗi ca đi qua 12 workspace, biểu đồ, Help, dialog Quỹ, che tiền và settings ở 320/768/1440px.
- Các ca theme còn kiểm tra radio/bàn phím/focus, tải lại/chuyển trang, nhiều tab, storage bị chặn/không hợp lệ, trước paint/hydration, đổi hệ điều hành và ghi đè, bảo toàn bản nháp, reduced motion, metadata và service worker offline thật trên Chromium. Đo các token chữ trên canvas/surface/surface-alt/primary-soft đạt tối thiểu 4.5:1, nút 4.5:1, focus 3:1; riêng chữ Kim ngân thấp nhất khoảng **4.84:1 sáng / 5.77:1 tối**. Kiểm tra 320px và phóng to bằng CSS zoom 200%.
- Đã xem ảnh bộ chọn Kim ngân sáng desktop, sáng 320px, Tổng quan tối desktop/điện thoại và Quỹ sáng; minh họa, lựa chọn và bố cục hiển thị đúng. Ảnh ở `artifacts/themes/` và `artifacts/gold-responsive-images/`. `artifacts/gold-theme-validation-source.json` ghi hash 14 file theme khớp app production tạm và không đổi qua các lượt kiểm tra; lưu hash bài kiểm tra trước/sau hai sửa đổi kiểm thử trên.
- Kiểm tra đường dẫn Markdown nội bộ và `git diff --check`: đạt. Lịch sử validation và các chỉnh sửa bộ chọn cột/logo từ công việc trước được bảo toàn.

Giới hạn: bằng chứng từ trình duyệt local, viewport/motion/color-scheme mô phỏng, PostgreSQL tạm và Auth contract double. Không xác nhận Supabase Auth thật, cloud/deployment hay thiết bị vật lý; không chạy lại toàn bộ browser suite của các nghiệp vụ khác trong lần bổ sung theme này.

## Rà soát form, trạng thái lưu và dialog toàn ứng dụng — 21/10/2026

Đã áp dụng toast sau ghi nhận cho Chi tiêu, Thu nhập, Tiết kiệm, Đầu tư, Quỹ an toàn, Hồ sơ và khôi phục trong Cài đặt; lỗi giữ tại form. Mất phản hồi ghi được báo là chưa xác nhận, giữ nội dung/mã yêu cầu để thử lại; lỗi tải lại sau ghi được báo riêng. Các ô tiền VND có dòng đọc số, các ô lượng/hệ số không mang định dạng tiền. Dấu `*` sát nhãn, lỗi dưới trường và focus đến trường lỗi đầu. Footer dialog giữ vị trí; xem trước Quỹ cho bảng Trước–Sau và chênh lệch của mục thực sự đổi. Nút thu gọn sidebar, Help, logo mobile và bố cục Hồ sơ được rà trên màn hình hẹp.

Bằng chứng local trên Node 22.12.0, Next.js 16.4.1, PostgreSQL tạm và Auth double:

- `npm test`: **173/173**; `npm run test:db`: **67/67**; `npm run typecheck` và `npm run build`: đạt trên source cuối. `git diff --check` và kiểm tra đích liên kết Markdown tới tài liệu nội bộ: đạt. Tám liên kết ảnh lịch sử trong `artifacts/browser` là file tạm và hiện không còn sau khi runner dọn thư mục giữa các lượt; số liệu validation lịch sử vẫn được giữ nguyên.
- `TEST_FIREFOX=1 TEST_WEBKIT=1 npm run test:e2e -- profile.spec.ts funds.spec.ts`: **48/48** trên Chromium desktop/mobile, Firefox desktop và WebKit mô phỏng iPhone. Có lưu/hủy, conflict, mất phản hồi, bản nháp, số đọc dưới ô, preview và theme Kim ngân.
- Hồi quy toàn bộ `npm run test:e2e`: **182/186** đạt trên Chromium desktop/mobile. Bốn lỗi còn lại là bộ chọn test cũ tìm `.expense-error` trong Thu nhập; giao diện thực dùng `.form-error-summary` và ảnh trạng thái cho thấy lỗi vẫn ở form. Đã sửa bộ chọn. Lượt chọn lọc sau sửa trên bốn cấu hình: **42/44**; hai lỗi đếm cả hàng tiêu đề bảng Quỹ bằng accessibility role trên mobile, khi hàng này bị CSS ẩn trực quan. Đã giữ header trong cây truy cập và đổi test đếm hàng dữ liệu; chạy lại ca giao dịch Quỹ **4/4 đạt** trên bốn cấu hình. Các ca Thu nhập đã sửa đều đạt trong lượt 42/44.
- Bộ browser bao phủ 320/375/768/1440px, màn hình ngang ngắn, chữ phóng lớn, bàn phím, reduced motion, ba chủ đề Sáng/Tối, modal lồng nhau và Privacy Mode. Kiểm trường hợp backup mất phản hồi sau commit và thử lại cùng mã yêu cầu, không nhân bản dữ liệu.

Đã rà/cập nhật catalog, landing copy, preview minh họa cố định, README, kiến trúc UX và đặc tả Chi tiêu/Thu nhập/Tiết kiệm/Đầu tư/Quỹ/Hồ sơ/backup/phản hồi giao diện. Preview không gọi API tài chính, trạng thái triển khai module và schema/API tài chính không đổi. Kết quả trên là local và trình duyệt mô phỏng; chưa kiểm trên Supabase Auth/cloud thật hoặc thiết bị vật lý. Những lỗi ở hai lượt browser ban đầu là giả định của test đã được sửa và kiểm riêng; không diễn giải các lượt đó thành một lần chạy toàn bộ không lỗi.


## Bổ sung Đỏ — Lửa ấm — 22/10/2026

Thêm `fire` vào danh sách theme dùng chung, bộ chọn bốn thẻ (hai cột desktop/tablet, một cột dưới 561px), token sáng/tối, lời dẫn/icon, tám cảnh SVG và ba cảnh Quỹ. Theme dùng đỏ gạch/san hô, lửa/đèn lồng/than hồng và núi lửa tĩnh cách điệu. Không có hoạt ảnh nền lặp; giữ tỷ lệ Quỹ, mốc tiến độ, giới hạn hình, che tiền, bản nháp, thuật ngữ tài chính, logo, emoji và token cảnh báo/lỗi. Cache offline lên `fm-offline-v5`, vẫn chỉ chứa fallback HTML. Không thêm API, schema, đồng bộ tài khoản hoặc trường backup.

Bằng chứng local, Node 22.12.0 / Next.js 16.4.1:

- `npm test`: **174/174** qua 21 file; log `artifacts/fire-theme-unit.log`. Có kiểm tra bootstrap bốn theme, giá trị lạ/storage bị chặn, offline cùng copy/màu, ánh sáng/tiến độ lửa tăng dần và giới hạn hình khi vượt 100%/phần trăm rất lớn.
- `npm run typecheck`: đạt; log `artifacts/fire-theme-typecheck.log`. `npm run build` trên workspace hiện tại: đạt (Turbopack), log `artifacts/fire-theme-integrated-build.log`.
- Lượt build đầu dừng vì công việc landing song song đang tham chiếu `marketing-landing` và `marketing.css` trước khi hai file xuất hiện. Để tiếp tục kiểm tra theme, tạo bản chụp `artifacts/fire-theme-validation-8eios7vh`, chỉ dùng public page/layout đã staged trước thay đổi marketing; không thay thế hai file trong workspace thật. Các file khác được chụp cùng source/test. Build bản chụp đạt, log `artifacts/fire-theme-snapshot-build.log`.
- Sau khi landing mới đầy đủ, kiểm tra tích hợp trên source hiện tại bằng `visual-themes.spec.ts --grep-invert 'eight theme combinations'`: **34 đạt, 2 bỏ qua / 36 ca**, log `artifacts/fire-theme-integrated-browser.log`. Chạy Chromium desktop/iPhone mô phỏng, Firefox desktop, WebKit iPhone mô phỏng. Bao phủ radio/bàn phím/focus, tải lại/chuyển trang/nhiều tab, storage bị chặn/giá trị lạ, đổi hệ điều hành/ghi đè, giữ bản nháp, reduced motion, tương phản, 320px/CSS zoom 200%, metadata, offline HTML và service worker thật trên Chromium. Hai ca bỏ qua là service worker trên Firefox/WebKit; HTML offline được kiểm tra ở mọi engine.
- Kiểm tra landing thành viên với Water/Gold/Fire sau đăng nhập: nhánh SVG đúng theme, không có lỗi hydration trong ca kiểm tra, preview không gọi API dữ liệu tài chính. Cho phép request phiên/hồ sơ. Marketing khách dùng palette riêng theo công việc landing song song; theme đã lưu và login/ứng dụng không bị đổi bởi palette này.

## Phân loại trang chủ khách/thành viên — 22/10/2026

Phạm vi: landing marketing độc lập theme cho khách tại `/`, giữ landing theo theme cho người đăng nhập; preview minh họa dùng chung dữ liệu, biến thể trung tính; metadata/ảnh Open Graph cùng nhận diện marketing. Không thay API, schema hoặc page guard.

- `npm test`: **174/174**, 21 files; `npm run typecheck` đạt. Log: `artifacts/marketing-unit.log`, `artifacts/marketing-typecheck.log`.
- Bộ landing và ba theme thành viên: **48/48 ca đạt trong một lượt** trên Chromium desktop, Chromium mô phỏng mobile, Firefox desktop và WebKit mô phỏng iPhone. Log `artifacts/marketing-verified-browser.log`, output `artifacts/marketing-verified-browser/`. Kiểm login/logout, toàn bộ route riêng, bearer giả, safe next, callback/phiên thu hồi, Auth outage, no-JS, preview không gọi API tài chính, màu khách độc lập bốn theme × ba mode, theme thành viên giữ nguyên, 320/375/768/1024/1440px, landscape, zoom 200%, reduced motion và bàn phím tab preview.
- Production build Webpack với Node **22.12.0**, Next **16.4.1** đạt trong runner PostgreSQL/Auth local riêng. Log: `artifacts/marketing-verified-next.log`; source snapshot `artifacts/browser-app-QyfdjK`, manifest `artifacts/marketing-source-manifest.json`.
- Bộ không cấu hình Auth: **1/1** desktop, kiểm nội dung marketing, preview, metadata/ảnh OG trả PNG, redirect private page và thông báo thiết lập login. Log `artifacts/marketing-unconfigured-browser.log`; lượt này trước tinh chỉnh hàng tab preview mobile, dùng cùng phân loại phiên và metadata.
- Đã xem ảnh desktop và 320px: `artifacts/landing/marketing-verified-desktop.png`, `marketing-verified-320.png`, `marketing-verified-preview-320.png`. Sửa cột hero và preview dùng minmax(0, 1fr), tab preview xuống hàng, chỉ số xếp dọc để không bị shell overflow che nội dung. Kiểm thử đo bounds/scrollWidth của các khối bên trong, không chỉ document; vòng trang trí được phép vượt khung.
- Các cặp màu chữ chính/phụ/CTA trên nền marketing có tỷ lệ tương phản **4,87:1–15,58:1** theo tính toán sRGB từ token; không tuyên bố đây là audit accessibility đầy đủ.
- Lượt trung gian có một lỗi dọn trace `ENOENT` do hai runner dùng chung outputDir. Lượt xác nhận dùng `--output=artifacts/marketing-verified-browser` riêng. Một kỳ vọng Auth outage và selector trùng hình/lời dẫn được sửa để kiểm đúng phiên có sẵn; không tăng timeout hoặc nới quyền truy cập.
- Đã rà/cập nhật catalog, landing hai nhóm, preview, README, kiến trúc, UX, đặc tả landing/theme và ảnh Open Graph. Giữ nguyên lịch sử validation trước đó.

Giới hạn: tất cả là local production build và PostgreSQL/Auth contract double; mobile/WebKit là mô phỏng, không phải thiết bị vật lý hay Supabase Auth/PKCE thật. `/` trả marketing trong HTML ban đầu và khi không có JavaScript; provider có user thì chuyển sang bản thành viên. Không deploy, không ghi dữ liệu cloud.
- Hồi quy đầy đủ trên bản chụp cố định: `visual-themes.spec.ts funds.spec.ts --grep 'theme|identit|preferences|real progress'`: **46 đạt, 2 bỏ qua / 48 ca**, log `artifacts/fire-theme-snapshot-browser.log`. Mỗi engine đi qua tám tổ hợp theme × sáng/tối, 12 workspace, Help, dialog, biểu đồ và settings 320/768/1440px; phục hồi viewport thiết bị ở đầu mỗi tổ hợp. Có tám ca Quỹ Gold/Fire trên bốn cấu hình, kiểm 0/25/50/75%, vượt mục tiêu (hình 100%, số 200%), riêng tư và giảm chuyển động. Đây là hồi quy bản chụp với landing trước refactor; không diễn giải nó thành một lượt 48 ca trên landing marketing cuối.
- `artifacts/fire-theme-validation-source.json` ghi source, hai public-file overlay và hash kiểm chứng: 11 file triển khai theme/Quỹ/offline không đổi qua các lượt kiểm tra. Tích hợp landing mới được kiểm riêng trong lượt 34 ca ở trên; metadata, token và các nhánh SVG tương ứng đúng lựa chọn.
- Đo chữ thường trên các bề mặt canvas/surface/surface-alt/primary-soft ≥4.5:1, nút ≥4.5:1, focus ≥3:1; riêng Fire chữ thấp nhất khoảng **4.79:1 sáng / 6.07:1 tối**. So sánh token danger/warning và nền trạng thái giữa bốn theme trong cùng chế độ cho kết quả giữ nguyên. Không chỉ dựa vào màu để mô tả lỗi.
- Đã xem ảnh bộ chọn desktop sáng, Tổng quan tối desktop và bộ chọn 320px tối; ảnh ở `artifacts/fire-theme-images/`. Bốn thẻ khiến ảnh element ở viewport cao 1600px cắt phần chế độ cuối; đã nâng chiều cao chụp lên 2400px trong test hiện tại, không đổi code UI. Kiểm tra bổ sung bằng `artifacts/fire-theme-manual-capture.mjs` đạt ở 320px: chọn Fire, System, Dark; chụp đủ bốn thẻ và cả ba chế độ sau khi chuyển màu hoàn tất, ảnh `artifacts/fire-theme-settings-phone-full.png`.
- Đã cập nhật/rà catalog, landing thành viên và preview minh họa cố định, README, kiến trúc, UX, themes, Funds, Help, backup và UI feedback; giữ lịch sử và các sửa đổi từ công việc song song. Liên kết tới tài liệu mới/cập nhật hợp lệ, `git diff --check` đạt. Các ảnh lịch sử đã thiếu trong thư mục artifact tạm từ trước vẫn được ghi nhận trong phần validation trước, không tái tạo hoặc thay thế bằng bằng chứng mới.

Giới hạn: trình duyệt local và mô phỏng viewport/color-scheme/motion, PostgreSQL tạm, Auth contract double; chưa xác nhận Supabase Auth/cloud/deployment hoặc thiết bị vật lý. Không chạy lại toàn bộ browser suite của các nghiệp vụ không liên quan.
