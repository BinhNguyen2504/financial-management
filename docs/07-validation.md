# Xác minh

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
