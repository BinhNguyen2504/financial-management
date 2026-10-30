# Xác minh

## Sao lưu tương thích schema phân loại cũ — 29/10/2026

- Kiểm tra chỉ đọc trên database được `.env.local` cấu hình: runtime `expense_api` không có quyền CREATE; thiếu `expense_labels.brand_key`/`icon_key`, projection cũ tái hiện PostgreSQL `42703`. Sau sửa, `postgresDataRepository.backup` đọc đủ **35 bảng, schemaVersion 2** trong snapshot read-only bằng owner UUID giả không có dữ liệu. Không xuất dữ liệu tài khoản thật, không ghi/migrate database đang cấu hình và chưa xác minh phiên Auth/trình duyệt của người dùng.
- `npm run test:db`: **76/76** qua trên PostgreSQL local cô lập, log `artifacts/backup-legacy-schema-db.log`. Bốn regression mới kiểm tra thiếu cả hai/từng cột logo/icon: xuất đủ bảng, khôi phục và đối soát toàn bộ dữ liệu, chặn metadata không thể lưu trước mọi ghi, giữ đích trống/không tạo biên nhận; schema đủ cột giữ nguyên logo/icon. Các ca sẵn có tiếp tục kiểm tra RLS, đích đã có dữ liệu, mất response, rollback và thiếu bảng nghiệp vụ.
- `npm test`: **267/267** qua, log `artifacts/backup-legacy-schema-unit.log`. Typecheck chưa qua do key trùng trong thay đổi Đầu tư đang có ở `src/i18n/messages/investments.ts:263` (`TS1117`); log `artifacts/backup-legacy-schema-typecheck.log`. Giữ nguyên phần công việc song song này. Không chạy production build hoặc browser suite trong lượt sửa repository.
- ESLint và Prettier cho hai file repository/test đã sửa qua; architecture **268 source files, 0 violations** và `git diff --check` qua tại thời điểm kiểm tra.
- Đã cập nhật README, kiến trúc, xử lý lỗi và đặc tả backup; rà soát catalog, copy hai landing, preview cố định và UX. Phạm vi module, thao tác UI và dữ liệu minh họa không đổi. Không deploy, đổi quyền runtime hoặc kiểm chứng thiết bị vật lý.

## Cuộn đến nội dung trong trang và dialog — 27/10/2026

- `html` và `.dialog-body` dùng cuộn mượt mặc định. Help, xem trước, phân trang, khôi phục vị trí tab và liên kết tới ô lỗi dùng cùng hành vi; đưa focus với `preventScroll` tránh nhảy trước khi cuộn. Reduced motion giữ cuộn tức thời. Attribute `data-scroll-behavior="smooth"` cho Next.js giữ quy tắc cuộn khi chuyển route.
- `npm test`: **221/221** qua; `npm run typecheck` qua; hai production build Next.js webpack cô lập có TypeScript qua. Log: `artifacts/scroll-navigation-unit.log`, `artifacts/scroll-navigation-typecheck.log`, `artifacts/scroll-navigation-next.log` và `artifacts/scroll-navigation-confirmed-next.log`. Prettier các file source/test đã sửa và `git diff --check` qua.
- Lượt browser đầu đạt **63/72**. Tám lỗi thuộc test mới chọn nhầm hai tiêu đề preview hoặc ID Help; một assertion cũ yêu cầu nút đầu của hàng một/hai thao tác có cùng tọa độ thay vì căn giữa cả nhóm. Đã sửa test theo đúng đích/nhóm thao tác. Source hành vi cuộn không cần sửa thêm.
- Lượt xác nhận cuối đạt **24/24** trên Chromium desktop, Chromium mô phỏng iPhone, Firefox và WebKit mô phỏng iPhone; `artifacts/scroll-navigation-confirmed/.last-run.json` có `status: passed`. Log `artifacts/scroll-navigation-confirmed.log`. Kiểm tra ghi lại các sự kiện cuộn thực: cuộn xuống/lên bằng anchor, liên kết Next.js cùng trang trên desktop, mục lục Help trong vùng cuộn riêng, vị trí trang/focus sau đóng, reduced motion, lỗi biểu mẫu Tiết kiệm/Đầu tư và căn nhóm nút.
- Tổng cộng **76 ca browser khác nhau được xác nhận qua các lượt chạy**, bao gồm 12 ca dialog và 28 ca Help đã qua ở lượt đầu: phân trang dữ liệu dài, xem trước/lưu, dialog lồng nhau, giữ bản nháp/bộ lọc/focus, 12 trang Help, màn hình hẹp/ngang/chữ lớn và không gọi API tài chính khi đọc Help. Đây không phải một lượt chạy sạch toàn bộ suite. Đã xem ảnh dialog và Help desktop/mobile trong `artifacts/scroll-navigation-browser/` và `artifacts/scroll-navigation-confirmed/`.
- Đã cập nhật README, UX, Help và đặc tả phản hồi/landing. Rà catalog, copy hai landing và preview: khả năng/trạng thái và dữ liệu minh họa giữ nguyên, nội dung vẫn phù hợp. Môi trường PostgreSQL/Auth double cô lập local; không deploy, ghi cloud hoặc xác minh thiết bị vật lý.

## Nhận diện liên kết ngoài — 26/10/2026

- Áp dụng `.external-link` dùng chung cho hướng dẫn cài đặt, CFPB/MoneyHelper trong Quỹ an toàn và Mở Supabase trong Thu nhập: màu theo theme, chữ đậm và gạch chân luôn hiện; hover/focus tăng độ dày gạch chân, giữ viền focus bàn phím.
- Production build riêng, gồm TypeScript, thành công. Ca có sẵn `navigation, persistent appearance, installation guidance and profile return` đạt **4/4** trên Chromium desktop/mobile, Firefox và WebKit; log `artifacts/external-links-browser.log`, build log `artifacts/external-links-next.log`. Đây là hồi quy luồng liên quan, không phải toàn bộ browser suite.
- Đo trực tiếp app local ở Chromium/Firefox đạt **180 tổ hợp**: hai trình duyệt × ba bề mặt (Cài đặt tiếng Việt/English, hướng dẫn Quỹ tiếng Việt) × năm theme × sáng/tối × 320/375/1440px. Gạch chân, chữ đậm, xuống dòng và đích tab mới đúng; độ tương phản chữ thấp nhất **5,72:1**. Kết quả `artifacts/external-links-layout.json`; đã xem ảnh chú thích mobile. Nhánh Thu nhập chưa cấu hình được rà soát source và dùng cùng CSS, chưa mở nhánh này trong lượt đo app.
- WebKit đạt **30 tổ hợp trên fixture CSS riêng**, lấy CSS trực tiếp từ source, cùng kiểm tra focus bàn phím và Enter mở tab mới với đích giả lập; log `artifacts/external-links-webkit-fixture-confirmed.log`, kết quả `artifacts/external-links-webkit-fixture.json`. Fixture này không thay thế kiểm tra app/Auth đầy đủ. Lượt đo app bổ sung trên cả ba trình duyệt chưa hoàn tất: script ban đầu sai tên nhãn English và giả định thứ tự Tab; lượt tiếp theo gặp ô đăng nhập bị disabled trên dev server. Không tính các lượt này là đạt.
- Prettier cho các file source sửa và `git diff --check` qua. Đã cập nhật README, UX và đặc tả UI/Thu nhập/Quỹ; rà soát catalog, landing copy và preview cố định, nội dung hiện tại vẫn phù hợp vì khả năng và dữ liệu minh họa không đổi.
- PostgreSQL/Auth double cô lập local, kiểm tra CSS trên trình duyệt mô phỏng; không ghi dữ liệu cloud hoặc xác minh triển khai/thiết bị vật lý.

## Khoảng cách chú thích hướng dẫn cài đặt — 26/10/2026

- Chú thích dưới cụm card có khoảng cách phía trên 24px và phía dưới 12px, dùng chung cho iPhone/iPad, Android và máy tính.
- Production build riêng (Next.js webpack và TypeScript) thành công. Ca có sẵn `navigation, persistent appearance, installation guidance and profile return` đạt **4/4** trên desktop/mobile Chromium, Firefox và WebKit; log `artifacts/install-caption-browser.log`, build log `artifacts/install-caption-next.log`.
- Kiểm tra hình học trực tiếp trên production app local đạt **72/72** tổ hợp: ba trình duyệt × sáng/tối × 320/375/812/1440px × ba tab thiết bị. Khoảng cách lần lượt 24px/12px trong dung sai subpixel, không tràn ngang trang. Kích thước 812 × 375 kiểm tra màn hình ngang. Kết quả `artifacts/install-caption-geometry.json`; đã xem ảnh `artifacts/install-caption-375.png` và `artifacts/install-caption-1440.png`.
- Prettier cho hai file source và `git diff --check` qua. Đã cập nhật README, hướng dẫn UX và đặc tả phản hồi; rà soát catalog, landing copy và preview cố định, nội dung hiện tại vẫn phù hợp với chỉnh sửa khoảng cách.
- Môi trường PostgreSQL/Auth double cô lập local; không ghi dữ liệu cloud. Bằng chứng mô phỏng này không xác nhận deploy hay cài PWA trên thiết bị vật lý.

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


## Bổ sung Nâu — Đất lành — 22/10/2026

Hoàn thành bộ năm theme bằng `earth`: nền cát/nâu đất sáng–tối, icon địa hình, lời dẫn, tám cảnh SVG và ba cảnh Quỹ. Địa hình, lớp đất, đá cuội, bình đất nung và ruộng bậc thang tạo khác biệt với hình cây lá của Khu vườn. Bộ chọn ba cột desktop, hai cột 561–900px và một cột dưới 561px. Cùng Sáng/Tối/Theo hệ thống, đổi tức thời, giữ bản nháp và đồng bộ trình duyệt giữa tab; cache offline `fm-offline-v6` chỉ chứa fallback HTML. Không thêm API/migration, đồng bộ tài khoản hoặc dữ liệu vào backup; logo/emoji và ngữ nghĩa tài chính/cảnh báo giữ nguyên. Landing marketing khách tiếp tục dùng nhận diện riêng.

Bằng chứng local với Node 22.12.0 / Next.js 16.4.1:

- `npm test`: **176/176**, 21 file, log `artifacts/earth-theme-unit.log`. Bao phủ registry năm theme, parser bootstrap/storage, offline cùng copy/màu, tám cảnh địa hình riêng biệt, nền/mái trú tăng dần và đá tiến lên đích. Kiểm giới hạn hình ở 100% với phần trăm vượt mục tiêu hoặc rất lớn dùng chung mọi nhánh SVG.
- `npm run typecheck`: đạt, log `artifacts/earth-theme-typecheck.log`; `npm run build`: đạt (Turbopack), log `artifacts/earth-theme-build.log`. Browser chạy build production Webpack riêng, PostgreSQL tạm và Auth contract double.
- Bản chụp source/test đầy đủ `artifacts/earth-theme-validation-gl6lj5r1` dùng đúng public layout/page hiện tại, không có overlay. `artifacts/earth-theme-validation-source.json` ghi hash, phạm vi và source của lượt kiểm tra đầu; bản mã cuối sau sửa Tab được ghi riêng bên dưới.


### Hoàn tất thao tác bàn phím và hồi quy cuối — 22/10/2026

- Lượt đầu: **53 đạt, 2 bỏ qua, 1 lỗi / 56 ca**, log `artifacts/earth-theme-browser.log`. Lỗi nằm ở Tab từ Chủ đề sang Chế độ hiển thị trên WebKit. Sửa giả định “phải focus Tối” thành “focus một radio chế độ” vẫn còn **3 đạt, 1 lỗi / 4 ca** (`artifacts/earth-theme-keyboard.log`), vì Tab thực sự bỏ qua cả nhóm trong cấu hình WebKit này.
- Tái hiện bằng HTML radio tối giản trên WebKit desktop/iPhone: Tab mặc định rời nhóm; khai báo `tabIndex=0` trên lựa chọn đang chọn đưa focus vào nhóm kế tiếp. Sửa cả hai nhóm trong `ThemePicker`: lựa chọn đang chọn có `tabIndex=0`, các lựa chọn khác `-1`; vẫn dùng radio và phím mũi tên native. Ca hồi quy kiểm Tab, đổi chế độ bằng mũi tên/Space, dữ liệu lưu và nhiều tab. Kiểm riêng sau sửa: **4/4 đạt**, log `artifacts/earth-theme-keyboard-final.log`.
- `npm run check` trên mã cuối đạt: **176/176 unit test**, typecheck và build Turbopack, log `artifacts/earth-theme-final-check.log`.
- Lượt hồi quy cuối trên bản mã cố định `artifacts/earth-theme-final-oai3sf0y`: **54 đạt, 2 bỏ qua / 56 ca**, log `artifacts/earth-theme-final-browser.log`; không có ca lỗi. Chạy `TEST_FIREFOX=1 TEST_WEBKIT=1 TEST_THEME_MATRIX=earth` với `visual-themes.spec.ts funds.spec.ts --grep 'theme|identit|preferences|real progress'`. Hai ca bỏ qua là service worker trên Firefox/WebKit; offline HTML được kiểm tra ở mọi engine, service worker thực được kiểm trên Chromium.
- Phạm vi: cả năm theme trong registry, radio/ảnh thu nhỏ, bàn phím, lưu/tải lại/nhiều tab, giá trị lạ, storage bị chặn, Theo hệ thống/ghi đè và tương phản đủ mười tổ hợp sáng/tối. Riêng Earth sáng/tối đi qua 12 workspace, Help, dialog, biểu đồ, che tiền và settings 320/768/1440px; không diễn giải thành ma trận mọi module của cả năm theme. Có 12 ca Quỹ Gold/Fire/Earth trên bốn cấu hình, kiểm 0/25/50/75%, vượt mục tiêu (hình 100%, số 200%), riêng tư và giảm chuyển động.
- Landing thành viên Water/Gold/Fire/Earth giữ đúng nhánh minh họa, không thấy lỗi hydration trong ca kiểm tra và preview không gọi API dữ liệu tài chính; request phiên/hồ sơ được phép. Theme và display mode độc lập, bản nháp đang mở được giữ khi tab khác đổi sang Earth.
- Đo token chữ trên canvas/surface/surface-alt/primary-soft ≥4.5:1, nút ≥4.5:1, focus ≥3:1; Earth thấp nhất khoảng **4.72:1 sáng / 5.81:1 tối**. Token cảnh báo/lỗi giữ nguyên giữa các theme trong cùng mode. Có kiểm CSS zoom 200% và reduced motion.
- Đã xem ảnh bộ chọn Earth sáng desktop/tối 320px và Tổng quan tối desktop; đủ năm thẻ, đúng chủ đề riêng, không thấy tràn ngang. Ảnh lượt cuối ở `artifacts/earth-theme-final-images/`. `artifacts/earth-theme-final-source.json` ghi source/test không có overlay và hash 14 file triển khai/kiểm thử vẫn khớp workspace sau hồi quy.
- Đã rà/cập nhật catalog, landing/preview số liệu cố định, README, kiến trúc/UX, themes, Quỹ, Help, backup và UI feedback; không đổi trạng thái nghiệp vụ hoặc đọc dữ liệu tài khoản trong preview. Bổ sung hướng dẫn điểm Tab của mỗi nhóm radio vào tài liệu theme/UX, bảo toàn lịch sử validation và các sửa đổi đã có. Liên kết tài liệu nội bộ hợp lệ, `git diff --check` đạt; các link PNG artifact lịch sử đã thiếu từ trước được giữ nguyên.

Giới hạn: bằng chứng local, PostgreSQL tạm, Auth contract double, trình duyệt/viewport/color-scheme/motion mô phỏng. Chưa xác nhận Supabase Auth/cloud/deployment hoặc thiết bị vật lý; không chạy lại toàn bộ browser suite của các nghiệp vụ ngoài phạm vi theme.

## Logo trung tính và Anh/Việt trong app — 22/10/2026

Đổi logo sang hũ tích lũy/đồng xu màu than–ngà, độc lập năm theme; đồng bộ sidebar/mobile, public header/preview, favicon và bộ icon PWA/Apple. Thêm lựa chọn Tiếng Việt/English trong Cài đặt, mặc định vi, lưu trình duyệt/cookie, cập nhật giữa tab và giữ workspace/bản nháp/bộ lọc. Toàn bộ workspace, trang dự kiến, hồ sơ, Help, biểu đồ, tooltip và lỗi/thông báo có hai ngôn ngữ. Landing, preview công khai và đăng nhập giữ tiếng Việt. English dùng en-GB, vẫn VND và giờ Việt Nam. Không có migration hoặc thay đổi dữ liệu cloud.

### Bằng chứng local

- `npm test`: **187/187** qua trên 22 file. Kiểm tra khóa/tham số dịch, namespace, đủ bài và anchor Help Anh/Việt, định dạng tiền lớn/số lượng chính xác, parser phân nhóm/thập phân, metadata lỗi và CSV giữ dữ liệu người dùng/chống công thức.
- `npm run test:db`: **67/67** qua trên 11 file, PostgreSQL local cô lập với role/RLS thực. Không dùng database cloud để thử ghi.
- `TEST_WEBKIT=1 TEST_FIREFOX=1 npm run test:e2e -- tests/browser/localization.spec.ts --output=artifacts/localization-verified`: **28/28** qua, một lượt sạch trên Chromium desktop, Chromium iPhone mô phỏng, Firefox desktop và WebKit iPhone mô phỏng. Mỗi cấu hình kiểm tra 5 theme × 3 mode × 2 ngôn ngữ, bàn phím radio, reload/SSR, nhiều tab, storage bị chặn, giao diện từ 320px, mọi trang và Help, giữ tên/ghi chú, bản nháp số lỗi theo ngôn ngữ lúc nhập, trạng thái chưa xác nhận ghi và retry cùng ID. Kiểm tra trang công khai/đăng nhập vẫn tiếng Việt, preview không gọi API tài chính.
- `TEST_WEBKIT=1 TEST_FIREFOX=1 npm run test:e2e -- tests/browser/localized-gold.spec.ts --output=artifacts/localized-gold-browser`: **4/4** qua. Tạo danh mục vàng bằng English với nhãn `chi`/`luong/tael` nhưng lưu enum `chỉ`/`lượng/cây`; đổi locale trong form giữ lượng `1.25`/`1,25`, request gửi `1.25` và giá trị VND đối chiếu chính xác. Chỉ dịch nhãn option, không dịch giá trị hợp đồng dữ liệu.
- `npm run test:e2e -- expenses.spec.ts income.spec.ts savings.spec.ts investments.spec.ts funds.spec.ts profile.spec.ts backup.spec.ts help.spec.ts landing.spec.ts dialogs.spec.ts --output=artifacts/localization-regression-verified`: **124/124** qua trong lượt sạch desktop/mobile. Bao gồm nhập/sửa/xóa, lịch sử, chốt/mở lại, xung đột/retry, backup/restore, nested dialogs/focus/scroll, Auth/origin/owner và landing độc lập dữ liệu.
- TypeScript strict/typegen và production build Next.js 16.4.1/Node 22.12.0 qua. Browser runner tạo checkout riêng dưới `artifacts/`, build `next build --webpack` rồi chạy `next start`; giữ server phát triển hiện có trên cổng 3000. Log build: `artifacts/localization-next-verified.log`, `artifacts/localization-regression-verified-next.log`, `artifacts/localized-gold-next.log`.
- Dữ liệu và Auth là mẫu/double local. Fallback service worker được kiểm tra với kết nối tắt thật trong Chromium/WebKit; Firefox xác nhận cache rồi thực thi tài liệu offline bằng mô phỏng response vì Playwright Firefox chặn navigation trước service worker khi bật offline. Cache vẫn chỉ chứa `/offline.html`; không có nhập/đồng bộ tài chính offline.

Ảnh kiểm tra nằm tại `artifacts/localization/settings-{desktop,mobile,firefox,webkit}.png`. Các thư mục output riêng lưu `.last-run.json` và trace lỗi nếu có; các lượt sạch cuối đều không có failed tests. Những lượt dò lỗi ban đầu không được tính thành bằng chứng pass: đã sửa lỗi thông báo field chưa có nội dung, khôi phục lựa chọn sau storage bị chặn, giữ ID cột qua locale và tách nhãn đơn vị vàng khỏi giá trị lưu.

Đã rà soát/cập nhật catalog, landing/preview cố định, README, kiến trúc, UX, theme, Help và các đặc tả liên quan. Source implementation và kiểm chứng mô phỏng local không chứng minh deploy, Supabase Auth/email thật, cài PWA thật hoặc thiết bị vật lý.

## Bố cục mobile, tab và vùng cuộn bảng — 23/10/2026

Sửa bốn nhóm lỗi từ phản ánh Thu nhập và áp dụng cho các thành phần tương ứng toàn ứng dụng: mũi tên hai đầu bộ chọn kỳ, tab một hàng cuộn ngang, hàng nhập thiếu không nở do padding và toolbar cột đứng ngoài vùng cuộn dữ liệu. Đồng thời sửa đồng bộ hiển thị số hợp lệ khi blur (`000777` → `777`), giữ nguyên bản nháp lỗi. Xem [ma trận rà soát](features/layout-scroll-2026-10-23.md).

- `npm test`: **187/187** qua trên 22 file ở source hiện tại. `npm run typecheck`: qua.
- Production build Next.js 16.4.1/Node 22.12.0 trong runner cô lập qua, chạy bằng `next start`. Log bản kiểm chứng cuối: `artifacts/layout-scroll-complete-next.log`. Các lượt gián đoạn hoặc đang dò selector không được tính thành lượt pass đầy đủ.
- `TEST_FIREFOX=1 TEST_WEBKIT=1 npm run test:e2e -- layout-scroll.spec.ts expense-presentation.spec.ts income.spec.ts dialogs.spec.ts interface-feedback.spec.ts localization.spec.ts --workers=2 --max-failures=2 --output=artifacts/layout-scroll-complete-browser`: **104/104 browser tests qua trong một lượt sạch**, không có failed tests; `.last-run.json` xác nhận `passed` và danh sách lỗi rỗng. Chromium desktop/mobile, Firefox desktop và WebKit iPhone mô phỏng. Những lượt dò selector trước đó không được gộp vào con số này.
- Năm ca mới trong `layout-scroll.spec.ts` kiểm tra 320/375/390/430/768/1440px, xoay ngang, chữ lớn, Việt/Anh, sáng/tối, Forest/Water, tài khoản trống và có dữ liệu, số 0/số tiền lớn, đủ 12 tháng, chuyển trang bằng liên kết client và Help. Đo vị trí mũi tên, độ rộng chữ trong ô chọn, hàng bảng lệch tối đa 1px, toolbar lệch tối đa 1px khi cuộn và tab đang focus nhìn thấy mà trang không nhảy. Có tab workspace/dialog/preview và mở nhập bổ sung. Hồi quy cũ bao phủ lưu/xung đột/retry, ẩn tiền, chọn/khôi phục cột, nested dialogs, giữ bản nháp và năm theme × ba mode × hai ngôn ngữ.
- Đã xem ảnh Thu nhập 320px và popover 320px; ảnh kiểm chứng cuối nằm dưới `artifacts/layout-scroll-complete-browser/`, gồm `income-vi.png`, `income-en.png`, `public-preview.png` và ảnh dialog/popover theo project. Bộ chọn Năm/Tháng hiện đủ giá trị ở 320px; bảng cuộn trong khung và nút cột vẫn ở mép phải của khung.
- Rà soát/cập nhật catalog và bản dịch, FAQ landing, preview cố định, README, kiến trúc, UX, đặc tả Thu nhập/Chi tiêu/Tiết kiệm/Đầu tư/Quỹ/landing và ngôn ngữ. Kiểm tra liên kết tài liệu liên quan: **108 liên kết / 12 file**, không có liên kết hỏng. Khi mở rộng sang toàn bộ trang validation, có sáu liên kết ảnh của các mốc cũ không còn file artifact trên ổ đĩa; giữ nguyên lịch sử và không dùng chúng làm bằng chứng hiện tại. Giữ lịch sử validation các ngày trước.

Môi trường kiểm thử dùng production build, PostgreSQL/Auth double và tài khoản/dữ liệu tổng hợp local riêng. Không ghi/reset dữ liệu cloud. Bằng chứng local không xác nhận triển khai cloud, Supabase Auth/email thật hoặc thiết bị vật lý.


## Vị trí nút thu gọn sidebar — 26/10/2026

Chuyển nút thu gọn/mở rộng từ hàng logo sidebar sang đầu header sticky, trước nhãn “Tài chính cá nhân”. Logo và tên có trọn hàng; nút giữ vùng bấm 44 × 44px, aria-expanded/aria-controls, bàn phím và tùy chọn trình duyệt. AppShell dùng chung áp dụng cho mọi workspace; dưới 960px dùng menu mobile.

- Typecheck/typegen và Prettier các file source liên quan đạt. Production build Webpack trong runner cô lập đạt; log `artifacts/sidebar-toggle-final-next.log`.
- Kiểm tra menu có sẵn `interface-feedback.spec.ts --grep 'navigation, persistent appearance'`: **4/4 đạt** trên Chromium desktop/mobile, Firefox desktop và WebKit iPhone mô phỏng. Kiểm thu gọn/mở rộng và trạng thái sau reload. Output `artifacts/sidebar-toggle-browser/`; lượt production sau cập nhật copy cũng đạt cả bốn ca này.
- Kiểm tra trực tiếp trên dev snapshot cô lập: **48 tổ hợp bố cục đạt**, gồm ba engine × Việt/Anh × sáng/tối × 960/1024/1440px và ba engine × 320/375/768/959px mobile. Đo vùng chữ tên ứng dụng nằm trong sidebar, nút nằm ngoài sidebar và đủ 44 × 44px, trang không tràn ngang; kiểm Space để thu gọn, reload giữ trạng thái, click mở rộng và menu mobile. Ghi nhận ở `artifacts/sidebar-toggle-geometry.json`; đã xem ảnh mở/thu gọn Chromium, ảnh ba engine ở `artifacts/sidebar-toggle-images/`. Kiểm ngôn ngữ bằng cookie/storage rồi reload; kiểm màu bằng data-theme. Hai lượt dò radio ban đầu không hoàn tất chuyển locale và không được tính vào bằng chứng đạt.
- Hồi quy mở rộng production `interface-feedback.spec.ts landing.spec.ts --grep 'navigation, persistent appearance|landing|preview'`: **36 đạt, 4 lỗi / 40**, output `artifacts/sidebar-toggle-final-browser/`. Bốn lỗi cùng assertion tại `landing.spec.ts:271`, coi `.scroll-tabs.preview-tabs` có scrollWidth lớn hơn clientWidth là bị cắt. Snapshot trước bổ sung copy cũng có tab cuộn ngang chủ ý ở 320px: 424px nội dung trong khung 260px, overflow-x:auto và toàn trang vẫn vừa màn hình; `artifacts/sidebar-toggle-preview-baseline.json`. Không sửa assertion hoặc coi toàn bộ lượt này là pass. Các ca còn lại kiểm preview độc lập API, Auth/server guards, đăng nhập/callback, no-JavaScript và theme khách đều đạt.
- Đã cập nhật mô tả dùng chung trong catalog, FAQ cả hai landing, ghi chú preview, README, hướng UX, đặc tả landing và phản hồi giao diện. Preview giữ dữ liệu hằng số; không đổi trạng thái module hoặc thêm API tài chính. Bảo toàn các cập nhật song song khác trong workspace và lịch sử validation.

Giới hạn: production/dev snapshot local, PostgreSQL tạm và Auth contract double; viewport mobile là mô phỏng. Không triển khai cloud hoặc kiểm tra thiết bị vật lý. Không chạy lại toàn bộ bộ kiểm thử nghiệp vụ.

## Minh họa riêng cho Tiết kiệm và Đầu tư — 26/10/2026

- Thay hai tiêu đề dùng chung `grove` bằng `AssetScene`: mười bố cục riêng cho hai module × năm theme. Hỗ trợ sáng/tối bằng semantic tokens và CSS chọn cảnh trước paint; hình tĩnh, không nhận số tiền, kết quả hoặc tiến độ. Trạng thái trống Đầu tư đổi sang cảnh khởi đầu; hình tiêu đề Đầu tư cũng hiện trên điện thoại. Preview thành viên dùng cùng bộ SVG, preview khách giữ nhận diện marketing.
- `npm test`: **187/187** qua trên 22 file; `npm run typecheck`, Prettier cho các file code/test liên quan và `git diff --check` qua. Kiểm tra **68 liên kết local** trong README, UX và bốn đặc tả liên quan: không thiếu đích. Log: `artifacts/asset-scenes-unit.log`, `artifacts/asset-scenes-typecheck.log`.
- `TEST_FIREFOX=1 TEST_WEBKIT=1 TEST_BROWSER_LOG=artifacts/asset-scenes-complete-next.log npm run test:e2e -- asset-scenes.spec.ts landing.spec.ts --workers=2 --output=artifacts/asset-scenes-complete-browser`: **40/40 qua trong một lượt sạch** trên Chromium desktop/mobile, Firefox và WebKit iPhone mô phỏng. Production build qua; `.last-run.json` là `passed`, không có failed test. Bao phủ mười cảnh × sáng/tối, 320px và 740×375px, cỡ chữ gốc 125%, reduced motion, hình trạng thái trống, preview khách/thành viên không gọi API tài chính; hồi quy landing/auth/zoom/không JavaScript. Log: `artifacts/asset-scenes-complete-browser.log` và `artifacts/asset-scenes-complete-next.log`.
- Các lượt dò trước không được tính thành lượt pass đầy đủ: ca mới trên Chromium mobile từng chuyển trang trước khi đăng nhập hoàn tất, đã thêm điểm chờ giao diện/networkidle; assertion landing cũ từng coi vùng tab cuộn ngang là nội dung bị cắt, đã cho phép phần cuộn bên trong khi CSS là auto/scroll và vẫn kiểm tra biên ngoài khung. Không đổi hành vi cuộn của sản phẩm trong lượt này.
- Đã xem trực tiếp [bảng mười hình sáng](../artifacts/asset-scenes/gallery-light.png), [bảng tối](../artifacts/asset-scenes/gallery-dark.png) và ảnh tiêu đề WebKit ngang. Các cảnh phân biệt bằng vật thể/hình học, không chỉ đổi màu. Hình nằm trong viewBox; nhánh theme khác ẩn, hình trang trí không nhận focus và không hoạt ảnh.
- Rà soát/cập nhật catalog và bản dịch Anh, preview thành viên, README, UX, đặc tả Tiết kiệm/Đầu tư/theme/landing. Copy nghiệp vụ và trạng thái triển khai hiện có vẫn phù hợp; dữ liệu preview giữ cố định và không đọc API tài chính. Giữ toàn bộ lịch sử validation trước đó.

Môi trường: production build Next.js 16.4.1/Node 22.12.0 với PostgreSQL/Auth double và tài khoản thử nghiệm local cô lập. Không ghi/reset dữ liệu cloud, deploy hoặc xác minh Supabase Auth/email thật hay thiết bị vật lý.


## Nút thao tác và góc bo bảng Chi tiêu — 26/10/2026

- Bảng hũ căn giữa nhóm thao tác theo số nút thực tế; Dùng tiền dùng icon ví cùng kích thước 44px với nút sửa, khoảng cách 8px. Cả hai có tên truy cập và tooltip. Khung `expense-table-scroll` cắt nền theo góc bo cho bảng hũ, tổng kết, báo cáo và bảng dữ liệu biểu đồ; scroller con và popover chọn cột giữ hoạt động.
- `npm test`: **187/187** qua; `npm run typecheck` qua; `git diff --check` qua. Production build local dùng Next.js 16.4.1/Node 22.12.0, chạy `next start`; log `artifacts/expense-actions-next.log`. Bản build kiểm chứng chứa phần sửa CSS/handler/icon; catalog và copy landing bổ sung sau đó được kiểm bằng unit/TypeScript.
- Bộ có sẵn `expense-presentation.spec.ts` và ca `monthly balances` trong `expenses.spec.ts`: **12/12** qua trong một lượt sạch, Chromium desktop/mobile, Firefox desktop, WebKit iPhone mô phỏng. Gồm ghi sử dụng tích lũy, sáng/tối, cuộn bảng, chọn/khôi phục cột, popover phía trên dialog và Escape/focus. Output: `artifacts/expense-actions-browser/`, `.last-run.json` passed, danh sách lỗi rỗng.
- Kiểm tra trực tiếp trên dữ liệu review local: 18 hàng × sáng/tối × 1440/768px × Chromium/Firefox/WebKit; nhóm một/hai nút lệch tâm **0px**, nút tối thiểu 44×44px, icon có tên/tooltip, mở đúng form sử dụng tích lũy. Card ở 320/375px không gây tràn trang. Số đo: `artifacts/expense-actions-visual/measurements.json`.
- Đã xem ảnh bảng tối Chromium/WebKit và hàng tích lũy có hai nút. Nền tiêu đề nằm trong góc bo. WebKit hit-test ở điểm sát góc vẫn trả phần tử tiêu đề dù ảnh đã được cắt đúng; không dùng riêng hit-test để kết luận hình ảnh. Ảnh sáng/tối và hàng hai nút nằm trong `artifacts/expense-actions-visual/`.
- Rà catalog, landing/copy preview cố định, README, UX và đặc tả Chi tiêu/landing. Nhóm thao tác của các bảng khác đã dùng quy tắc căn giữa chung; không đổi chúng. Giữ toàn bộ lịch sử và thay đổi có sẵn của workspace.

Môi trường local cô lập, PostgreSQL và Auth double, dữ liệu tổng hợp và viewport mô phỏng. Không ghi/reset dữ liệu cloud hoặc xác nhận deploy, Supabase Auth thật hay thiết bị vật lý.

## Tỷ lệ minh họa và tiêu đề Chi tiêu/Quỹ an toàn — 26/10/2026

- Chi tiêu và Quỹ an toàn trước đó không render minh họa trong tiêu đề; các header còn lại dùng kích thước rời rạc 180–200px, nhỏ hơn trên điện thoại. Thêm cảnh hũ cho Chi tiêu và năm cảnh bảo vệ riêng của `SafetyScene` cho Quỹ. Minh họa Quỹ là trang trí tĩnh, không nhận số tiền hoặc phần trăm; các cảnh tiến độ thật trong thẻ giữ nguyên.
- Áp dụng `illustrated-heading` cho năm trang tài chính và bốn trang dự kiến. Khung hình 240–320px bên chữ trên desktop/tablet; <=700px thì chữ rộng toàn hàng, hình 216px nằm dưới. Tách hàng thao tác, giữ các điều kiện chỉ đọc/đã thiết lập. Rà soát Tổng quan (đã có khối hình lớn), Cài đặt/Hồ sơ (tiêu đề chức năng) và giữ bố cục phù hợp từng tác vụ.
- `TEST_FIREFOX=1 TEST_WEBKIT=1 TEST_BROWSER_LOG=artifacts/illustrated-headings-next.log npm run test:e2e -- illustrated-headings.spec.ts asset-scenes.spec.ts --workers=2 --max-failures=2 --output=artifacts/illustrated-headings-browser`: **8/8 browser tests qua trong một lượt sạch**, `.last-run.json` là `passed`, failedTests rỗng. Chromium desktop/mobile, Firefox desktop và WebKit iPhone mô phỏng. Production build Next.js 16.4.1/Node 22.12.0 qua trong runner cô lập.
- Ca header mới chạy cả chín trang × năm theme × sáng/tối, đo ở 320/375/768/1024/1440px với font-size gốc 125%; hình tối thiểu 210px trên điện thoại, >=238px trên desktop/tablet, không chồng chữ, không vượt khung/tràn trang. Kiểm tra SVG trang trí/không focus/không hoạt ảnh, nhánh theme ẩn đúng; mở/đóng Help trên cả chín trang, Phân loại ở Chi tiêu và Điều chỉnh mục tiêu ở Quỹ. Bộ cũ tiếp tục kiểm tra 320px/ngang, trạng thái trống và mười cảnh Tiết kiệm/Đầu tư riêng.
- Preview thành viên có minh họa ở cả năm tab, vẫn không gọi API tài chính; preview khách giữ marketing và dữ liệu cố định. Đã xem ảnh [Quỹ desktop](../artifacts/illustrated-headings/desktop-funds-1440.png), [Chi tiêu mobile](../artifacts/illustrated-headings/mobile-budgets-375.png) và [Tiết kiệm desktop](../artifacts/illustrated-headings/desktop-savings-1440.png). Ảnh tiêu đề các trang và năm cảnh bảo vệ sáng/tối trong `artifacts/illustrated-headings/`.
- `npm test`: **187/187** qua trên 22 file; typecheck, Prettier và `git diff --check` qua. Kiểm tra **112 liên kết local** trong mười tài liệu liên quan: không thiếu đích. Log: `artifacts/illustrated-headings-unit.log`, `artifacts/illustrated-headings-typecheck.log`, `artifacts/illustrated-headings-browser.log`, `artifacts/illustrated-headings-next.log`.
- Rà soát/cập nhật catalog và bản dịch Anh, preview, README, UX, đặc tả năm module/theme/landing và quy chuẩn phản hồi UI. Copy nghiệp vụ hiện có vẫn phù hợp, không đổi trạng thái triển khai, số liệu preview, API, dữ liệu tài chính hoặc quyền truy cập. Giữ lịch sử validation trước.

Môi trường: PostgreSQL/Auth contract double, tài khoản và dữ liệu tổng hợp local cô lập, trình duyệt mô phỏng. Không ghi/reset dữ liệu cloud, deploy, xác minh Supabase Auth/email thật hoặc thiết bị vật lý.


## Hoàn tất nút chevron ở mép sidebar — 26/10/2026

Theo lựa chọn sau khi xem phương án header, đặt chevron trái/phải trên đường phân cách bên phải sidebar, ngang tâm logo. Hình tròn 28px dùng nền surface và viền nhẹ, vùng bấm 44 × 44px; hover/focus tăng độ rõ, focus có vòng riêng và reduced motion tắt chuyển màu. Nút nằm ngoài phần tử sidebar cuộn, fixed theo chiều rộng 232/80px. `tabIndex=0` giữ điểm Tab rõ ràng cả trên WebKit; nhãn Việt/Anh, aria-expanded/aria-controls và lựa chọn trình duyệt được giữ. Menu mobile dưới 960px tiếp tục dùng menu riêng.

- Bản production Next.js 16.4.1/Node 22.12.0 build/typecheck đạt trong runner PostgreSQL/Auth double cô lập. Log `artifacts/sidebar-edge-verified-next.log`. Prettier các file code liên quan và `git diff --check` đạt. Hash bốn file sidebar hiện tại khớp snapshot đã build, ghi ở `artifacts/sidebar-edge-source.json`.
- `TEST_BASE_URL=<local review origin> TEST_FIREFOX=1 TEST_WEBKIT=1 npx playwright test interface-feedback.spec.ts landing.spec.ts --grep 'navigation, persistent appearance|public landing and preview|landing supports small' --output=artifacts/sidebar-edge-verified-browser`: **12/12 đạt trong một lượt sạch**, Chromium desktop/mobile, Firefox desktop, WebKit iPhone mô phỏng. `.last-run.json` passed, failedTests rỗng; log `artifacts/sidebar-edge-verified-browser.log`. Kiểm thu gọn/mở rộng, reload, theme, menu, preview độc lập API và landing responsive/zoom/reduced motion. Assertion tab preview đã được cập nhật trong đợt minh họa riêng, xem lịch sử cùng ngày; không sửa test đó trong phần việc nút này.
- Kiểm trực tiếp trên cùng production server: **105 tổ hợp bố cục đạt**. Có 96 tổ hợp desktop = ba engine × Việt/Anh × sáng/tối × 960/1440px × cao 720/900px × mở/thu gọn; thêm chín tổ hợp menu mobile = ba engine × 320/768/959px. Tâm nút lệch tối đa 1px so với mép sidebar và tâm logo; tên đầy đủ cách vùng bấm ít nhất 8px, target >=44px, hit-test cả hai phía tại tâm ±20px, không tràn ngang. Kiểm Tab/focus ring, Space, vị trí khi cuộn sidebar/trang và reload giữ lựa chọn. Kết quả: `artifacts/sidebar-edge-geometry.json`, script `artifacts/sidebar-edge-inspect.mjs`, log `artifacts/sidebar-edge-geometry.log`. Locale dùng cookie/storage rồi reload; mode đặt data-theme cho phép đo hình học cả hai chế độ.
- Đã xem ảnh Chromium mở/thu gọn và WebKit mở; ảnh cuối ở `artifacts/sidebar-edge-images/`. Các lượt dò phát hiện lớp header chặn nửa ngoài của nút, sai lệch do padding Zen và điểm Tab trên WebKit đã được sửa trước lượt sạch cuối. Lượt bị gián đoạn và lượt dò lỗi không được tính vào bằng chứng pass.
- Đã rà/cập nhật catalog, FAQ hai landing và ghi chú preview dùng chung, README, hướng UX, đặc tả landing và phản hồi giao diện. Không thay trạng thái module hoặc số liệu preview cố định; preview không đọc API tài chính. Bảo toàn các thay đổi song song và lịch sử validation trước.

Giới hạn: production local, PostgreSQL/Auth contract double và dữ liệu tổng hợp cô lập; viewport/trình duyệt mobile là mô phỏng. Không deploy, ghi dữ liệu cloud hoặc kiểm chứng thiết bị vật lý. Không chạy lại toàn bộ bộ kiểm thử nghiệp vụ.


### Xác minh lại trên workspace hiện tại — 26/10/2026

Sau khi workspace có thêm tiêu đề minh họa và chevron sidebar, đã build lại toàn bộ source hiện tại trong runner cô lập rồi chạy `expense-presentation.spec.ts` cùng ca `monthly balances` của `expenses.spec.ts`: **12/12 qua trong một lượt sạch** trên Chromium desktop/mobile, Firefox desktop và WebKit iPhone mô phỏng. Gồm dùng tiền tích lũy, sáng/tối, responsive, chọn cột và popover/dialog/Escape/focus. Production build và TypeScript qua; log `artifacts/expense-actions-current-next.log`, output `artifacts/expense-actions-current-browser/`, `.last-run.json` passed và không có failedTests.

Đã xem ảnh desktop tối của lượt mới, có cả hàng một/hai nút và góc bo tiêu đề bảng. Sáu file source liên quan Chi tiêu/catalog/preview/landing khớp byte với snapshot production mới (`artifacts/expense-actions-current-source.json`). Prettier và `git diff --check` qua; **81 liên kết tài liệu Markdown** trong năm file liên quan không thiếu đích (`artifacts/expense-actions-current-docs.json`). Giữ các bằng chứng trước để phân biệt lượt kiểm chứng. Không phát hiện lỗi cần sửa thêm trong phạm vi ba phản ánh.

Môi trường vẫn là production local với PostgreSQL/Auth double và dữ liệu tổng hợp cô lập; không deploy hoặc ghi dữ liệu cloud, không xác minh thiết bị vật lý.


## SEO landing công khai — 27/10/2026

- `npm test`: **223/223** qua, 24 file. Bao gồm cấu hình index mặc định/production/preview/development, kiểm tra origin HTTPS hợp lệ, canonical/JSON-LD, robots/sitemap và proxy không gọi Auth cho tài nguyên công khai. Log: `artifacts/seo-unit.log`.
- Ba production build **Next.js 16.4.1 webpack**, gồm bước TypeScript, qua trong thư mục cô lập: tắt index, bật index và Vercel preview. Không sao chép `.env` hoặc kết nối DB/Auth trong runner SEO. Log: `artifacts/seo-disabled-next.log`, `artifacts/seo-enabled-next.log`, `artifacts/seo-preview-next.log`.
- **24 ca SEO qua trên ba cấu hình**: mặc định noindex 16/16 (Chromium desktop/mobile, Firefox desktop, WebKit iPhone mô phỏng); production bật index 4/4 và preview bật cờ nhưng vẫn noindex 4/4 (Chromium desktop). Các cấu hình được hoàn tất bằng các lần chạy riêng sau gián đoạn. Output có `.last-run.json` passed, không failedTests: `artifacts/seo-disabled-browser/`, `artifacts/seo-enabled-confirmed-browser/`, `artifacts/seo-preview-browser/`. Log kiểm thử: `artifacts/seo-matrix.log`, `artifacts/seo-enabled-confirmed.log`, `artifacts/seo-preview-matrix.log`.
- Kiểm HTML gốc với user agent thường/Googlebot/Twitterbot; không JavaScript; một H1; canonical duy nhất bỏ query; metadata và JSON-LD đúng origin/ngôn ngữ; robots/sitemap public; ảnh Open Graph/Twitter trả PNG 1200 × 630. Đã đọc lại alt của cả hai ảnh (`artifacts/seo-enabled-metadata.json`). Next chuẩn hóa URL gốc có thể bỏ dấu `/` cuối; phép so sánh dùng URL chuẩn hóa. Ảnh Twitter dùng URL có mã băm do Next tạo từ Open Graph, không hard-code endpoint.
- Kiểm 320/390/768/1440px, không tràn trang hoặc câu dẫn/tiêu đề tính năng; chuyển tab preview không gọi `/api/v1/`. Đã xem ảnh desktop và 320px; ảnh trong các output SEO. Đối chiếu 9 file source SEO/landing/proxy của cả ba snapshot với workspace đều khớp byte (`artifacts/seo-source-snapshots.json`).
- Hồi quy landing/Auth: lượt đầu **32 qua, 4 lỗi** trong 36 ca, đều ở tình huống nhập sai OTP. Auth contract double thiếu header phiên bản nên SDK không đọc `error.code`. Đã bổ sung header và CORS expose vào bộ giả lập local; chạy lại nhóm sai OTP/Auth gián đoạn **8/8 qua** trên bốn cấu hình trình duyệt. Như vậy 36 ca được xác nhận qua lượt đầu và chạy lại, **không phải một lượt full-suite sạch**. Log/output giữ riêng: `artifacts/seo-landing.log`, `artifacts/seo-landing-browser/`, `artifacts/seo-landing-auth.log`, `artifacts/seo-landing-auth-browser/`. Không thay đổi logic Auth production trong phần sửa này.
- Production build ban đầu còn phát hiện khóa dịch “Ví liên quan” bị khai báo trùng trong thay đổi Tiết kiệm có sẵn. Đã bỏ bản khai báo trùng và giữ bản dịch đang có hiệu lực. Prettier các file code/script liên quan và `git diff --check` qua. Rà soát catalog, copy marketing, preview, README, kiến trúc, deployment và đặc tả landing cùng thay đổi; không đổi trạng thái module/số liệu minh họa hoặc truy cập API tài chính.

Giới hạn: toàn bộ bằng chứng là production local, viewport/trình duyệt mobile mô phỏng. Bộ SEO dùng Auth chưa cấu hình; hồi quy có PostgreSQL/Auth contract double cô lập. Không deploy, ghi dữ liệu cloud, dùng tài khoản Auth thật, kiểm thiết bị vật lý hoặc xác nhận Google đã index/thứ hạng. Hiện chưa có tên miền chính thức; giữ `SEO_INDEXABLE=false`, chỉ bật sau khi đặt `APP_ORIGIN` HTTPS công khai và build/deploy lại theo hướng dẫn deployment. Domain example.com trong bằng chứng chỉ là fixture.


## Đăng nhập bằng mã email — 27/10/2026

- Luồng mới: email → mã 6 chữ số → xác nhận phiên → đích đến hợp lệ. Tách Gửi lại mã/Đổi email, chờ gửi lại 60 giây theo địa chỉ trong biểu mẫu; lỗi mã không đúng/hết hạn/đã dùng, mạng và giới hạn gửi giữ email để thử lại. Ô mã có kiểm định 6 chữ số, giữ số 0 đầu, hỗ trợ dán/autocomplete và focus; giữ khóa trước hydration và chống submit trùng. Callback cũ và chính sách tạo tài khoản giữ nguyên.
- `npm run check` trên Node **22.12.0**: **223/223 unit test**, 24 file; `next typegen && tsc --noEmit` và production build **Next.js 16.4.1** qua. Log cuối: `artifacts/auth-otp-check-final.log`. Đây là kết quả toàn workspace hiện tại, gồm các thay đổi khác đang có sẵn.
- Bộ hồi quy gồm **76 ca duy nhất** (19 ca × Chromium desktop/mobile, Firefox desktop, WebKit iPhone mô phỏng): **75/76 qua ở lượt chính**, một ca Tab trên WebKit không đến nút vì khác hành vi điều hướng bàn phím macOS. Đổi thao tác trong test thành Option-Tab cho WebKit theo [Apple](https://support.apple.com/en-gb/guide/safari/cpsh003/mac); không sửa tabindex/logic production để ép hành vi trình duyệt. Chạy lại nhóm bố cục/bàn phím trên cả bốn cấu hình: **4/4 qua**. Như vậy 76 ca được xác nhận qua lượt chính và chạy lại, **không phải một lượt 76/76 sạch**. Log/output: `artifacts/auth-otp-verified.log`, `artifacts/browser-auth-otp-verified/` (giữ lỗi ban đầu); `artifacts/auth-otp-keyboard.log`, `artifacts/browser-auth-otp-keyboard/` (`.last-run.json` passed, failedTests rỗng).
- Trong 76 ca có **32 ca OTP**: mã thiếu/sai/hết hạn/đã dùng, số 0 đầu, gửi lại/đổi email, hạn 1.800 giây và rate limit của double, lỗi mạng/429, phục hồi, phản hồi thiếu phiên, chống gửi/xác nhận trùng, Việt/Anh, focus/bàn phím và không tràn 320/375/768/1440px với sáng/tối/reduced motion. Hồi quy còn lại bao gồm mọi page guard, đích đến/URL ngoài, callback PKCE cũ, refresh/reload, logout/hết phiên/Auth gián đoạn, hydration chậm và landing/preview không đọc API tài chính.
- Hai lượt thăm dò trước bị dừng sau timeout dọn browser context ở ca đồng hồ giả kết hợp đăng nhập/điều hướng. Trace cho thấy các assertion chức năng đã qua. Ca cooldown cuối dùng Date cố định để kiểm UI, xác nhận challenge gửi lại qua Auth contract double; ca đăng nhập/SSR dùng đồng hồ bình thường. Bài cooldown riêng cuối **4/4 qua** (`artifacts/auth-otp-cooldown.log`, `artifacts/browser-auth-otp-cooldown/`), sau đó qua trong lượt hồi quy chính. Không tăng timeout hoặc bật retry để che lỗi.
- Đã xem ảnh desktop và mobile chế độ tối; ảnh của cả bốn cấu hình nằm trong output chạy lại bàn phím. Kiểm dán xác nhận paste event không bị chặn và mô phỏng giá trị bằng Playwright; autocomplete kiểm thuộc tính `one-time-code`. Không coi đây là bằng chứng clipboard hệ điều hành hoặc tự điền mã từ email thật trên điện thoại vật lý.
- **10/10 file source** Auth/landing/catalog/Help khớp byte với snapshot production của lượt chính (`artifacts/auth-otp-source-verification.json`). Prettier code/script/template liên quan và `git diff --check` qua; **68 liên kết Markdown nội bộ** trong README và sáu tài liệu liên quan có đích hợp lệ (`artifacts/auth-otp-doc-links.json`). Đã cập nhật catalog, hai FAQ landing, README, Help và kiến trúc/deployment/cloud/localization/đặc tả Auth. Preview đã rà soát, giữ dữ liệu minh họa cố định và không đọc dữ liệu tài khoản.

Giới hạn: PostgreSQL và Auth contract double local cô lập, production build local; thiết bị mobile là mô phỏng. Mẫu `supabase/templates/email-otp.html` dùng Token cho Magic Link/OTP và Confirm sign up; cần áp dụng cấu hình **Email OTP expiration = 1800 giây**, 6 chữ số và khoảng cách gửi tối thiểu 60 giây trên đúng Supabase project theo [hướng dẫn OTP](features/email-otp.md). **Chưa đổi cấu hình cloud, gửi email thật, deploy hoặc kiểm chứng thiết bị vật lý**; thời hạn 30 phút trên cloud chưa được xác nhận.


## Bảng danh mục và giao dịch Tiết kiệm — 27/10/2026

Typecheck đạt; unit 223/223. Production build local (webpack) với PostgreSQL tạm/Auth contract double đạt 28/28 ca Tiết kiệm trên Chromium desktop/mobile, Firefox và WebKit. Kiểm bố cục ba bảng với bộ lọc, dòng trống, tên/ghi chú dài, số tiền lớn, che tiền, lưu cấu hình cột, thao tác và Anh/Việt; thêm 320px, tablet và landscape. Đã sửa tràn chú giải phân bố với số tiền dài ở 320px. Đợt đầu 27/28, đợt cuối sạch 28/28 sau dựng lại. Xem [biên bản và giới hạn bằng chứng](features/savings-ledgers-2026-10-27.md). Không xác nhận deploy, Auth thật hoặc thiết bị vật lý.


## Mã email 8 số, ô vuông và tự xác nhận — 27/10/2026

Yêu cầu mới thay thế độ dài 6 số và hành vi xác nhận thủ công của phần Auth phía trên: người dùng cung cấp ảnh email thực tế có **8 số**, yêu cầu 8 ô vuông và tự xác nhận khi nhập ô cuối hoặc dán đủ mã. Không dùng lại mã thật trong ảnh để kiểm thử hoặc đưa vào fixture.

- UI dùng 8 input riêng, focus ô đầu sau gửi/gửi lại, chuyển ô khi nhập; dán/tự điền đủ mã tự xác nhận. Giữ số 0 đầu, vị trí các số khi Backspace/Delete; hỗ trợ mũi tên/Home/End, sửa số đã có và Tab. Paste từ bất kỳ ô nào nhận đủ mã sẽ thay toàn bộ 8 số; mã thiếu/chứa chữ/quá dài không tự gửi. Nút xác nhận thủ công vẫn dùng để thử lại. Khóa đồng bộ ngăn gửi trùng; lỗi không tự lặp xác nhận.
- Đã sửa lỗi thực tế trên WebKit: click ô có số có thể làm caret mất selection, khiến số mới chèn cạnh số cũ và đẩy sang ô sau. Click chọn lại nội dung và sự kiện gõ một số được xử lý như thay số tại ô đó; các ca sửa/xóa được chạy lại trên cả bốn cấu hình.
- `npm run check` với Node **22.12.0** qua: **223/223 unit test**, 24 file; typegen/TypeScript và production build **Next.js 16.4.1** qua. Log: `artifacts/pin-eight-final-check.log`. Số unit test là toàn workspace hiện tại, bao gồm các thay đổi có sẵn khác.
- Lượt hồi quy production local cuối gồm **88 ca**, với **84 ca qua**, 4 lỗi ở bài dữ liệu mẫu do matcher còn tìm tháng `2025-12` trong khi bảng Tiết kiệm hiện hiển thị `Tháng 12/2025`. Đã sửa matcher thành rowheader đúng tháng/năm, chạy lại bài dữ liệu mẫu trên cả bốn cấu hình: **4/4 qua**. Như vậy **88 ca duy nhất được xác nhận qua lượt chính và chạy lại, không phải một lượt 88/88 sạch**. Log/output giữ riêng: `artifacts/pin-eight-final-browser.log`, `artifacts/browser-pin-eight-final/`; `artifacts/pin-eight-review.log`, `artifacts/browser-pin-eight-review/` (`.last-run.json` passed, failedTests rỗng).
- 84 ca Auth/UI bao gồm **40 ca OTP** (10 × Chromium desktop/mobile, Firefox desktop, WebKit iPhone mô phỏng) và 44 ca hồi quy: từng số/focus/auto-submit, paste có dấu phân cách, autofill, số 0 đầu, xóa/sửa/điều hướng, lỗi/mã đã dùng/hết hạn, cooldown/đổi email/gửi lại, chống trùng, thiếu phiên, Việt/Anh; thêm page guards/đích đến/callback cũ/phiên/logout, loading/hydration và landing/preview độc lập API. Đã cập nhật tất cả helper đăng nhập sang fixture **12345678**, đưa các hook lấy owner lên trước khi điền mã để phù hợp auto-submit; bài review read-back xác nhận đúng owner sau đăng nhập tự động.
- Lượt thăm dò trước ghi nhận 82/84 qua, hai lỗi là sửa ô trên WebKit nói trên và test reload ngay sau URL commit khi tài liệu đích chưa tải xong. Test reload đã chờ biểu mẫu hồ sơ và load trước khi reload, không thêm retry hoặc tăng timeout. Giữ log/trace cũ tại `artifacts/pin-eight-browser.log`, `artifacts/browser-pin-eight/`.
- Kiểm ô vuông cùng hàng, mỗi ô rộng ít nhất 24 CSS px, không tràn tại **320/375/768/1440px**, sáng/tối và reduced motion. Ảnh sáng/tối 320/768/1440px trong output cuối; đã xem ảnh 320px sáng và 1440px tối. Paste kiểm sự kiện DOM có clipboardData; autofill mô phỏng qua input event, chưa phải clipboard/đề xuất mã email trên thiết bị vật lý.
- Prettier Auth/CSS/fixture và toàn bộ browser spec, `git diff --check` qua. **83 liên kết tài liệu nội bộ** có đích hợp lệ (`artifacts/pin-eight-doc-links.json`). **9/9 file source** Auth/catalog/landing khớp snapshot production của lượt chạy lại (`artifacts/pin-eight-source-verification.json`); so với lượt chính chỉ khác sửa ngữ pháp “an 8-digit” trong bản dịch catalog. Logic Auth, input và CSS khớp cả hai snapshot.

Đã rà soát/cập nhật catalog, hai landing, README, kiến trúc, UI/UX, cloud/deployment, dữ liệu preview và đặc tả OTP. Mẫu email Token hiện có không ép độ dài; giữ nội dung và cấu hình 8 số đang gửi, không yêu cầu đổi về 6. Preview tài chính vẫn dùng dữ liệu minh họa cố định và không đọc tài khoản/API.

Giới hạn: toàn bộ test của agent dùng Auth double/PostgreSQL local cô lập và trình duyệt/viewport mô phỏng. Ảnh email 8 số là bằng chứng do người dùng cung cấp; agent chưa xác minh đăng nhập bằng Auth/email thật, thiết bị vật lý, thời hạn cloud hoặc deployment. Không thay cấu hình Supabase, schema, tài khoản hoặc dữ liệu tài chính cloud trong thay đổi này.

## Trang chủ giữ đúng trạng thái đăng nhập từ HTML đầu tiên — 27/10/2026

- Root layout xác minh `pageSession()` và khởi tạo `UserProvider` bằng user đã xác minh; chia sẻ kết quả request-scoped với public layout và page guards. Không truyền access/refresh token, không gọi lại getUser khi hydrate user đã xác minh. Proxy refresh cookie trên `/` và đặt `private, no-store`; trang chủ vẫn công khai khi chưa đăng nhập hoặc Auth lỗi. Liên kết noscript đến hồ sơ hoặc đăng nhập theo kết quả server.
- `npm test`: **221/221 qua**, 24 file (`artifacts/home-session-unit.log`). Hai trường hợp `/` chuyển từ nhóm tài nguyên crawler sang nhóm refresh cookie, nên tổng giảm hai so với 223 lịch sử, không xóa phạm vi kiểm homepage. Sau khi bổ sung assertion cache, nhóm proxy **4/4 qua** (`artifacts/home-session-proxy-unit.log`). Typecheck đạt (`artifacts/home-session-typecheck.log`); production build Next.js 16.4.1 webpack/Node 22.12.0 đạt trong runner cô lập (`artifacts/home-session-verified-next.log`).
- Landing + OTP: **80/80 qua trong một lượt sạch** trên Chromium desktop/mobile, Firefox và WebKit iPhone mô phỏng (`artifacts/home-session-verified.log`, `artifacts/home-session-verified-browser/.last-run.json`). Ca mới kiểm HTML thành viên khi tắt JavaScript, `no-store`, liên kết hồ sơ, trì hoãn bundle JS, giữ Water/Dark, không marketing/spinner tài khoản trong lúc chờ, chỉ có audience `member` suốt hydration và menu hoạt động sau đó. Hồi quy gồm guest/no-JS, login/logout, đích đến/PKCE, Auth gián đoạn/thu hồi phiên, viewport 320–1440px, sáng/tối/reduced motion và preview độc lập API tài chính.
- Loading/hồ sơ: **8/8 qua** trên cùng bốn cấu hình trình duyệt, dùng chính server production của lượt trên, output riêng (`artifacts/home-session-loading.log`, `artifacts/home-session-loading-browser/.last-run.json`). Các workspace vẫn báo tiến độ khi API chậm; hồ sơ hiển thị user từ server mà không gọi getUser phía browser khi mở trang. Cập nhật bài kiểm profile cũ vốn chờ spinner của lookup đã được loại bỏ.
- Lượt thăm dò đầu **38/40**, hai lỗi thuộc bài kiểm mới: Firefox bị kẹt khi khôi phục localStorage bằng `storageState` vào context không JS; WebKit chờ font trong screenshot khi bundle JS đang bị giữ. Đã đối chiếu trace/error-context, chuyển context no-JS sang chỉ copy cookie và chụp ảnh sau khi giải phóng bundle; assertions trước hydration vẫn giữ nguyên. Không tăng timeout/retry. Lượt cuối 80/80 ở trên dùng bài kiểm đã sửa, không cộng dồn thành một lượt pass giả.
- Đã xem ảnh desktop và WebKit Water/Dark sau hydration, cùng ảnh Chromium mobile trước hydration của lượt thăm dò. Ảnh HTML không JS và ảnh sau hydration của cả bốn cấu hình nằm trong output lượt cuối. **10/10 file source** khớp snapshot production (`artifacts/home-session-source-verification.json`).
- Rà catalog, copy hai landing và preview: mô tả/trạng thái vẫn phù hợp, giữ dữ liệu minh họa cố định. Cập nhật README, kiến trúc, UX và đặc tả landing để bỏ mô tả cũ “luôn marketing trước”. Bảo toàn lịch sử và các thay đổi có sẵn của workspace.

Giới hạn: toàn bộ bằng chứng dùng PostgreSQL/Auth contract double local cô lập, production build local và viewport/trình duyệt mobile mô phỏng. Không deploy, ghi dữ liệu cloud, xác minh Supabase Auth/email thật hoặc thiết bị vật lý. Xác minh phiên server có thể ảnh hưởng thời gian chờ HTML của phiên đăng nhập khi Auth chậm; Auth lỗi vẫn trả nội dung công khai, không cấp quyền workspace.

## Đổi ngôn ngữ toàn bộ trang chủ — 28/10/2026

Bổ sung select Tiếng Việt/English cạnh đăng nhập/tài khoản, dùng chung `fm-locale` với Cài đặt và login. Hai landing khách/thành viên, navigation/footer, CTA/FAQ, nội dung theo theme, accessibility và preview đều đổi ngay; số minh họa dùng chuỗi nguyên chuẩn với vi-VN/en-GB, vẫn VND. Layout công khai có một provider chung, giữ bản nháp email, tab preview và trạng thái che tiền. Header hẹp xuống dòng; select giữ chiều cao 44px trên WebKit và toast xác nhận nằm phía dưới để không che bộ chọn. HTML lang, title, metadata và JSON-LD theo locale; canonical/indexing gate và các page guard giữ đúng phạm vi đã duyệt.

- `npm test`: **222/222 qua**, 24 file, gồm kiểm tra từ điển/tham số, Help, số tiền chính xác và metadata English cùng canonical. `npm run typecheck` đạt (`artifacts/landing-language-typecheck.log`). Production build Node 22.12.0/Next.js 16.4.1 webpack đạt trong runner cô lập (`artifacts/landing-language-verified-next.log`).
- Bộ landing-language + landing + auth-otp + localization: **128/128 qua trong một lượt sạch**, Chromium desktop/mobile, Firefox và WebKit iPhone mô phỏng (`artifacts/landing-language-verified.log`, `artifacts/landing-language-verified-browser/.last-run.json`). Bao phủ hai audience, năm theme/từng tab preview, không còn copy tiếng Việt ngoài tên riêng/nhãn ngôn ngữ trong bản English, giữ tab/che tiền, tải lại, đồng bộ nhiều tab/Cài đặt, đăng nhập, bản nháp email, storage bị chặn, cả cookie và localStorage bị chặn, HTML không JS, keyboard/focus và viewport 320/390/1440px. Hồi quy tiếp tục kiểm quyền server, Auth/OTP, Help, giữ bản nháp tiền/bộ lọc, lỗi mạng và kết quả lưu chưa chắc chắn.
- SEO: **30/30 qua**; disabled **20/20** trên bốn cấu hình trình duyệt, enabled **5/5** và preview **5/5** trên desktop (`artifacts/seo-disabled-browser`, `artifacts/seo-enabled-browser`, `artifacts/seo-preview-browser`). Crawler/user-agent và context không JS nhận metadata Việt/Anh theo cookie; canonical/robots/JSON-LD đúng cấu hình, không thêm hreflang. Các production build SEO đều đạt; ảnh chia sẻ hiện có vẫn tiếng Việt như phạm vi đã chốt.
- Đã đối chiếu **213/213 file nguồn** với snapshot production của lượt 128 ca, tất cả khớp (`artifacts/landing-language-source-verification.json`). Đã xem ảnh English Chromium desktop/320px và WebKit 320px, cùng trang thành viên theo theme. Ảnh lượt cuối cuộn tức thời về đầu trước khi chụp để CSS smooth-scroll không làm sai vị trí minh chứng.
- Giữ lịch sử thăm dò: lượt đầu **118/124**, gồm nhãn tài khoản trong test chưa khớp, assertion focus chưa thiết lập bàn phím trên Firefox và select native WebKit bỏ qua min-height. Đã sửa test và chiều cao select. Lượt tiếp theo **127/128**: trace cho thấy test rời Cài đặt ngay sau OTP khi fetch kiểm tra dữ liệu chưa kết thúc, WebKit phát pageerror lúc document bị hủy. Helper nay chờ response thành công và trạng thái kiểm tra hoàn tất trước navigation; giữ nguyên kiểm tra lỗi JavaScript, không thêm retry hoặc lọc lỗi này. Lượt focused trung gian **20/20** (`artifacts/landing-language-focused-browser`) không được cộng dồn thành kết quả lượt sạch; kết quả cuối là 128/128 ở trên.
- Đã rà và cập nhật catalog, copy hai landing, dữ liệu preview, README, kiến trúc, UX, Help và đặc tả landing/localization. Giữ các đoạn lịch sử, chỉ rõ cập nhật thay thế giới hạn trang giới thiệu chỉ có tiếng Việt.

Giới hạn: bằng chứng dùng production build, PostgreSQL/Auth contract double và dữ liệu tổng hợp local; điện thoại là viewport/trình duyệt mô phỏng. Không deploy, ghi dữ liệu cloud, xác minh Supabase Auth/email thật hoặc thiết bị vật lý. Preview không đọc API tài chính hoặc dữ liệu tài khoản. Không đổi schema, backup hoặc tiền tệ.

## Phản hồi Chi tiêu và rà lỗi dùng chung — 28/10/2026

- Unit: **222/222**. PostgreSQL local: **68/68**, có test mới xác nhận một sửa phương thức trong sổ 20 hũ chỉ có **4 câu lệnh ghi SQL** và đọc lại đủ lịch sử; giữ RLS, retry/version conflict, rollback, schema compatibility và backup/restore.
- Typecheck qua. Hai build production webpack trong browser runner qua, dùng bản sao source riêng; không tác động server dev, Auth hoặc database cloud.
- Bộ browser source cuối gồm `expense-feedback`, `expense-presentation`, `dialogs`, `ui-feedback`, `interface-feedback`: **62/64 qua trong lượt chạy chính** trên Chromium desktop/mobile, Firefox desktop và WebKit iPhone giả lập. Hai ca desktop/mobile còn lại là selector `getByLabel` exact trong harness; ảnh/trace xác nhận combobox đang có và operable. Sau đổi sang role/name, toàn bộ tập mới **12/12 qua**, gồm cả hai ca đó. Tổng **64 ca riêng biệt đã được xác nhận qua lượt chạy chính và chạy lại**, không ghi nhận đây là một lượt sạch 64/64. Lượt đầu trước sửa harness đo cả tab hidden có 60/64; giữ artifact để truy nguyên.
- Evidence source cuối: `artifacts/expense-feedback-final/`, `artifacts/expense-feedback-focused/`; production logs `artifacts/expense-feedback-final-next.log`, `artifacts/expense-feedback-review-next.log`. Screenshot trước/sau phân loại ở `artifacts/feedback-labels-before.png`, `artifacts/feedback-labels-after-*.png`; đã xem ảnh hai tab, sáng/tối và preview ở các engine.
- Inspector app đã đăng nhập qua Auth double ở **1440/768/390px**, **0 findings sau allowance** cho thiết kế shell/theme có sẵn và tiêu đề nền bị modal cố ý che. Allowance và giới hạn ghi rõ trong [ma trận rà soát](features/expense-feedback-2026-10-28.md); không coi đây là thiết kế mới hoặc bỏ qua lỗi tương tác.
- Đã rà/cập nhật README, catalog, landing/preview, đặc tả Chi tiêu, kiến trúc và UX/UI; liên kết tài liệu mới hợp lệ. `git diff --check` và Prettier qua.

Mọi phép thử dùng PostgreSQL local riêng, Auth contract double và trình duyệt/thiết bị mô phỏng. Không chứng minh cloud deployment, Supabase Auth thật, thiết bị vật lý hoặc thời gian lưu thực tế trên cloud. GET vẫn đọc toàn sổ; tối ưu xác nhận ở số lần ghi SQL, không tuyên bố mức tăng tốc theo giây/phần trăm trên mạng thật.

Kiểm tra liên kết phân biệt tài liệu và ảnh tạo bởi test: liên kết tài liệu hiện tại/mới đều hợp lệ. Tám liên kết ảnh lịch sử dưới `artifacts/browser/` hiện không có file trong checkout local sau các lượt runner dùng thư mục mặc định; giữ nguyên mốc lịch sử, không thay bằng ảnh mới mang nhãn cũ. Các bằng chứng đợt này dùng thư mục riêng nêu trên để tránh ghi đè tiếp.


## Menu, chú thích bắt buộc và toast — 28/10/2026

- Lượt xác nhận cuối: **16/16** trên Chromium desktop/mobile, Firefox desktop và WebKit iPhone mô phỏng, gồm `feedback-polish.spec.ts` và ca `income network retry` trong `income.spec.ts`. Chạy bằng PostgreSQL local tách biệt, Auth contract double và Next production build `--webpack`; log build: `artifacts/feedback-polish-confirmed-next.log`, ảnh: `artifacts/feedback-polish-confirmed/`.
- Kiểm menu ở 1440×480 (mở/thu gọn), 375×400, sáng/tối; Tab tới mục cuối và kiểm toàn bộ link nằm trong viewport. WebKit cần `tabIndex=0`; Firefox chỉ tự hiện dòng đầu của link có nhãn trạng thái, đã bổ sung cuộn tối thiểu sau native focus. Firefox headless macOS trả `scrollbar-width: none` cả với fixture chỉ có `thin`, nên kiểm thêm gutter và cuộn thật; không suy thành bằng chứng scrollbar trên máy/thiết bị khác.
- Kiểm chú thích mới trên đăng nhập, hồ sơ và năm editor tài chính; bản dịch Required trên hồ sơ. Toast lỗi 400, mất kết nối dùng warning, giữ bản nháp/thử lại, success, nút đóng 44px, nội dung dài không tràn, không đè header/body dialog, reduced motion và timeout dừng khi focus dù chuột đã rời. Đã xem ảnh sáng/tối desktop/mobile.
- Lượt hồi quy 44 ca trước đó đạt 40/44: ba lỗi do ca hai phiên chưa reset cooldown gửi OTP của Auth double, một lỗi Firefox chỉ cuộn hiện một phần link cuối. Sau chỉnh test fixture và focus menu, các ca liên quan đã đạt ở lượt 16/16. Các ca landing song ngữ/giữ state, hồ sơ giữ bản nháp và lost-response sau commit trong lượt 44 đều đạt. Không diễn giải thành một lượt toàn bộ 44/44.
- `npm run typecheck`, build production của runner, định dạng source, `git diff --check` và kiểm link tài liệu nội bộ đạt. Không thay backend hoặc schema; không chạy lại toàn bộ unit/database suite cho tinh chỉnh giao diện này.
- Skill UI/UX: lint ba component dùng chung đạt 0 FAIL/0 WARN; inspector trang đăng nhập ở 1440/768/390 đạt sau allowance cho button shadow, micro-label, palette cream và kích thước tiêu đề public login — đây là đặc điểm Zen hiện có ngoài phạm vi ba tinh chỉnh. Không dùng kết quả allowance để khẳng định toàn bộ app đạt bộ tiêu chí thiết kế.
- Đã rà catalog, landing copy và preview: không thêm khả năng nghiệp vụ hoặc đổi trạng thái module; preview tiếp tục dùng hằng số, không đọc API tài chính. README, kiến trúc, hướng UX, đặc tả landing và phản hồi UI được cập nhật.

Bằng chứng chỉ thuộc môi trường local và trình duyệt mô phỏng, chưa kiểm Supabase Auth/cloud thật hoặc thiết bị vật lý; không thực hiện ghi dữ liệu cloud.

## Vị trí trợ giúp chỉ số Tổng quan — 28/10/2026

- Nút Đọc các chỉ số tháng chuyển vào cụm tiêu đề tháng: bên phải trên desktop/tablet, hàng riêng với gap 16px ở màn hình không quá 639px. Số hũ/trạng thái chuyển xuống dưới tên tháng.
- Script kiểm tra tạm `artifacts/verify-overview-help.mjs` đạt **24/24** trường hợp: Chromium, Firefox, WebKit × 1440/768/390/320px × chưa có hũ/có hũ. Đo khoảng cách với dung sai số thập phân 0,1px, vùng bấm ít nhất 44px và không tràn ngang; kiểm mở đúng mục terms bằng Enter, Escape đóng và trả focus về nút. Thêm bản tiếng Anh 320px trên cả ba engine; không có pageerror. 390px dùng dark mode, các chiều rộng còn lại light mode, reduced motion bật.
- Đã xem ảnh desktop, tablet, mobile sáng/tối và bản tiếng Anh. Ảnh và số đo ở `artifacts/overview-help/`, gồm `geometry.json` và ảnh `*-heading.png`. Lượt cuối qua toàn bộ sau khi sửa script kiểm tra: tăng thời gian chờ compile dev, thêm phân loại bắt buộc cho hũ mẫu, đổi locale bằng cả cookie/storage và chấp nhận sai số dấu phẩy động; không sửa sản phẩm để đáp ứng các lỗi harness này.
- `npm run typecheck`, Prettier hai file source và `git diff --check` đạt. Không chạy lại unit/database suite hoặc production build cho thay đổi bố cục nhỏ này. Browser dùng Next dev webpack trong bản sao source tách biệt, PostgreSQL local riêng, Auth contract double và dữ liệu tổng hợp; không ghi cloud và chưa có bằng chứng thiết bị vật lý.
- Skill lint component: 0 FAIL, 2 WARN cho eyebrow Zen có sẵn. Inspector chạy trên bản chụp HTML đã render có đăng nhập, bỏ script, ở 1440/768/390px; bản chụp này có giới hạn font khác origin. Allowance trong `inspection-scoped/report.json` giữ các đặc điểm có sẵn ngoài phạm vi nút: micro-label, emoji, button-fx, icon-chips, tiny-text, palette-cream, rainbow-chart, panel-void, app-title-size; font-fallback là giới hạn bản chụp HTML, không dùng làm bằng chứng font của app thật. Ảnh và số đo app đang chạy là bằng chứng chính cho thay đổi; không diễn giải inspector có allowance thành đánh giá toàn ứng dụng.
- Rà `src/features/catalog.ts`, copy landing và `product-preview.tsx`: vị trí nút trong app không đổi mô tả, trạng thái Tổng quan `partial`, tab preview hoặc số liệu minh họa cố định; không cần đổi nội dung quảng bá. README, hướng UX và đặc tả Help được cập nhật cùng thay đổi.


## Bộ chọn kỳ Thu nhập — 28/10/2026

- Bỏ nút tháng trước/sau và logic chuyển kỳ, giữ trực tiếp select Năm/Tháng cùng hàng như Chi tiêu. Rà toàn bộ workspace: không tìm thấy nút chuyển tháng tương tự còn lại; Tiết kiệm dùng input tháng, Đầu tư dùng input ngày.
- Ba ca browser liên quan chạy trên Chromium desktop/mobile, Firefox desktop và WebKit iPhone mô phỏng: lượt đầu **11/12** đạt. Ca hình học Firefox dừng ở vùng bấm nhập thiếu có sẵn, đo `43.9998779296875px` thay cho CSS 44px; thêm dung sai 0,01px cho assertion đó, chạy lại đúng ca Firefox đạt **1/1**. Không gọi đây là một lượt 12/12. Logs: `artifacts/income-period-next.log`, `artifacts/income-period-firefox-next.log`; kết quả/ảnh/trace: `artifacts/income-period/`, `artifacts/income-period-firefox/`.
- Kiểm hai select không kèm button, cùng hàng ở 320/375/768/1024/1440/1920px, vùng bấm ít nhất 44px, thứ tự Tab/Shift+Tab, chọn biên năm 2000/2099. Ca bố cục bổ sung 390/430px, tiếng Việt/Anh, nhãn không cắt, hàng có/thiếu dữ liệu và giữ tab/bộ lọc. Ca qua năm chọn trực tiếp Năm/Tháng và xác nhận tháng tương lai chỉ xem. Đã xem ảnh desktop sáng/mobile tối và báo cáo tiếng Anh.
- `npm run typecheck`, production build webpack của runner, Prettier các file source/test thay đổi và `git diff --check` đạt. Không đổi backend/schema và không chạy lại toàn bộ unit/database suite cho tinh chỉnh này. Runner dùng PostgreSQL riêng, Auth contract double và dữ liệu tổng hợp local; không ghi cloud, không chứng minh Supabase Auth thật hay thiết bị vật lý.
- Skill lint hai file Thu nhập: 0 FAIL, 2 WARN cho `padStart` của tháng chuẩn và eyebrow Zen hiện có. Inspector trên HTML đã render từ production ở 1440/768/390px có 0 FAIL/0 WARN sau allowance giới hạn cho phong cách sẵn có ngoài phạm vi bộ chọn: `micro-label`, `gradient`, `button-fx`, `tiny-text`, `palette-cream`, `app-title-size`. Đã xem toàn bộ sáu ảnh scoped; báo cáo `artifacts/income-period/inspection-scoped/report.json`. Bản chụp đóng băng HTML/CSS/font, không giữ state select động hoặc chứng minh tương tác; ảnh và assertions từ app đang chạy là bằng chứng chính. Không suy kết quả scoped thành đánh giá toàn ứng dụng.
- Đã rà catalog, copy landing và preview: mô tả/trạng thái module còn đúng; preview giữ kỳ minh họa 06/2026, không có nút tháng và không đọc API tài chính. README, hướng UX, đặc tả Thu nhập và landing được cập nhật; giữ lịch sử bố cục có mũi tên ngày 23/10.

## Refactor source để bảo trì — 28/10/2026

- Baseline bắt đầu ở `d795ad7` với working tree sạch; unit 222/222 và PostgreSQL 68/68 đạt trước thay đổi. Source refactor hiện ở commit `acebb0c`; tài liệu được cập nhật cùng đợt. Không thay HTTP API, schema/migration, dữ liệu tài khoản hoặc capability/status module.
- Lượt `npm run check` trên Node 22.12 đạt: ESLint không warning, kiểm kiến trúc 249 file/0 vi phạm, Prettier, 29 file/253 unit test, TypeScript và production build Turbopack. PostgreSQL integration đạt 11 file/68 test. Logs: `artifacts/refactor/final-check.log`, `final-unit.log`, `final-db.log`. CI hiện có nhận các gate mới qua cùng npm script; chưa xác minh lượt chạy trên GitHub.
- Đối chiếu phần thực thi của 61 hàm domain với baseline sau khi bỏ type/comment/format: 61/61 giống nhau, gồm các hàm đã chuyển model/replay và CSV. Đây là so sánh thân hàm, được bổ sung bằng kiểm thử nghiệp vụ/API/RLS, không phải chứng minh hình thức toàn chương trình. Kết quả: `artifacts/refactor/domain-equivalence.json`.
- So sánh cascade của stylesheet tương tác sau khi mở các import: 172 rule/at-rule theo đúng thứ tự (175 node nếu tính comment), declaration và specificity không đổi. Kết quả: `artifacts/refactor/css-equivalence.log`. Đã xem ảnh dialog Chi tiêu desktop, toast Income mobile tối và cặp Quỹ mobile; 9/10 ảnh editor của năm module trên desktop/mobile trùng byte với baseline. Ảnh Quỹ mobile còn lại lệch 176 pixel mép viền (0,0076%, tối đa 5/255 mỗi kênh), không thấy khác bố cục/nội dung. JSON và ảnh đối chiếu ở `artifacts/refactor/`.
- Lượt browser đầy đủ dùng production build webpack, PostgreSQL/Auth double riêng, Chromium desktop/mobile, Firefox desktop và WebKit iPhone mô phỏng: **579 đạt, 2 bỏ qua, 3 WebKit timeout** trong một lượt 584 ca với 2 workers. Hai ca bỏ qua là service worker offline ở Firefox/WebKit theo cấu hình test hiện có. Không gọi lượt này là 584/584 đạt. Log: `artifacts/refactor/final-browser.log`; ảnh/trace: `artifacts/refactor/final-browser/`.
- Trace của các timeout WebKit có những thao tác nhỏ kéo dài bất thường: navigation khoảng 578 giây và phép đọc hình học khoảng 925 giây; các assertions trước đó vẫn đạt. Chạy lại đúng ba ca với worker mặc định 1, không tăng timeout, bỏ assertion hoặc sửa source: **3/3 đạt**. Preview cuộn/focus 3,1 giây; English/Help 18,8 giây; đủ năm theme trên workspace/Help/chart/dialog 2,3 phút. Rerun tổng 2,7 phút; log `artifacts/refactor/webkit-rerun.log`, production build `webkit-rerun-next.log`, output `webkit-rerun/`. Tổng cộng xác nhận 582 ca khác nhau qua lượt chính và rerun, còn 2 bỏ qua; không diễn giải thành một lượt 584/584 sạch.
- Bản source, CSS, public assets và cấu hình được so với bản sao dùng cho lượt browser đầy đủ: 312 file/0 khác biệt, hash trong `artifacts/refactor/source-snapshot.json`. Các ca bao phủ draft/filter, preview/commit, retry và lost response, Auth/origin/owner/RLS, tiền lớn/decimal vàng, CSV/backup, locale/theme, keyboard/focus, scroll và hình học responsive.
- Baseline browser đã phát hiện các fixture có trước: nhiều phiên xin OTP trong cooldown của Auth double và thông báo giả lập “Mạng…” bị bộ dịch thành “Tạng…”. Helper test mới chỉ reset quyền gửi lại trên double local cho các ca nhiều phiên; auth-otp vẫn kiểm cooldown. Fixture foreground refresh đổi sang chuỗi “Kết nối kiểm thử tạm gián đoạn”, giữ các assertions bảo toàn draft/dữ liệu/Auth. Vấn đề dịch chuỗi tùy ý được ghi riêng trong [hướng dẫn bảo trì](11-source-maintenance.md), không sửa kèm refactor.
- Đã rà catalog, landing copy/preview và trạng thái module: giữ nguyên vì capability không đổi; preview vẫn dùng hằng số, không gọi API tài chính. README, kiến trúc, hướng UX, domain README, Help, UI feedback và tài liệu năm module được cập nhật. Lịch sử validation trước đây được giữ nguyên.

Bằng chứng chỉ thuộc local PostgreSQL/Auth doubles và trình duyệt mô phỏng; không ghi cloud, áp migration, deploy hoặc kiểm trên thiết bị vật lý.

## Dialog phân loại, emoji riêng và thương hiệu Chi tiêu — 28/10/2026

Môi trường: Node 22.12.0; production build local; PostgreSQL riêng với migration thật và Auth contract double; profile Chromium desktop/mobile, Firefox và WebKit iPhone giả lập. Không ghi cloud, không xác nhận Supabase Auth thật hay thiết bị vật lý.

- `npm run check`: lint, architecture (249 source files, 0 violations), Prettier, **255/255 unit tests**, typecheck và production build đạt.
- `npm run test:db`: **68/68** đạt, gồm lưu emoji gia đình ghép qua PostgreSQL với idempotency và giữ nguyên inputs/số tiền.
- Bộ focused `expense-presentation.spec.ts` và các ca emoji trong `zen.spec.ts`: **20/20** trên bốn profile. Kiểm tra cột bảng dùng chung vẫn giữ vị trí, danh sách phân loại với tên dài, phân trang, tìm kiếm, tab bàn phím, focus quay về sau form con; emoji tùy nhập, lỗi nhiều emoji, thay đổi sau preview, tải lại, xuất backup và chọn/lưu thương hiệu mới.
- Sau rà hình ảnh, thay favicon WordPress của SHB bằng biểu trưng SHB từ PNG nhúng chính thức; TPBank/VNPT Money dùng phần biểu trưng gốc. Ca emoji/brand chạy lại trên asset cuối: **4/4** đạt, kiểm tra tải đủ 14 logo mới và lưu Viettel Money.
- Sau sửa chuẩn hóa chữ `Đ/đ`, ca emoji/brand cuối chạy lại **4/4**: tìm `dau tu` ra “Đầu tư”, trạng thái không có kết quả và đủ 90 gợi ý khi xóa từ khóa.
- Ca danh sách phân loại cuối chạy lại **4/4**, bổ sung trạng thái tìm kiếm rỗng và màn hình ngang 844×390; footer vẫn trong viewport, dialog không tràn ngang.
- UI kiểm tra tại 320/390/768/1440px, sáng/tối, nút sửa/xóa tối thiểu 44px và không tràn ngang dialog. Bằng chứng hình ảnh/nhận xét tại `artifacts/expense-labels-2026-10-28/`, ảnh brand cuối `expanded-brands-review-final.png`; hình UI cuối tại `artifacts/expense-labels-final-browser/`. Các favicon độ phân giải thấp giữ giới hạn nguồn gốc.

Đã rà và cập nhật catalog, preview/landing cố định, README, Help và bản dịch Việt/Anh, hợp đồng API/backup, kiến trúc và UX trong cùng thay đổi. Preview tiếp tục dùng số liệu minh họa cố định, không đọc API tài khoản. Không cần migration database.

## Chuẩn hóa nội dung và trải nghiệm toàn ứng dụng — 28/10/2026

Đặc tả/phạm vi: [usability consistency](features/usability-consistency-2026-10-28.md). Giữ nguyên các kết quả có ngày trước đó.

- `npm test`: **260/260**, gồm giới hạn kỳ tháng/năm, lỗi phổ thông và lỗi dịch nhầm mẫu tháng vào chuỗi tự do.
- `npm run test:db`: **68/68** trên PostgreSQL local riêng; kiểm tra owner/RLS, lịch sử, transaction, conflict/retry và backup/restore hiện có.
- Lint, kiểm kiến trúc (**253 source files, 0 violations**), Prettier, typecheck và production build Webpack trong runner riêng đạt. Không ghi đè server dev hoặc Auth thật.
- Hồi quy mở rộng **376 ca** trên Chromium desktop/mobile, Firefox và WebKit: lượt rộng ban đầu **361 đạt, 15 lỗi**. Các lỗi tập trung ở geometry/focus menu, kỳ vọng Help cũ và các test usability còn thay đổi trong quá trình sửa. Không trình bày đây là một lượt chạy sạch 376/376.
- Lượt acceptance trên source đã sửa: **55/56 đạt** (`artifacts/usability-acceptance/`); ca WebKit còn lại đo trước sự kiện `visualViewport.resize`. Harness được sửa để chờ chính resize listener cập nhật; không nới giới hạn geometry hoặc bỏ assertion.
- Lượt cuối `tests/browser/usability.spec.ts`: **20/20 đạt trong 2,2 phút**, cả bốn project, source production hiện tại. `artifacts/usability-final-proof/.last-run.json` có `status: passed`, không có failed tests. Tất cả 15 ca thất bại trong lượt rộng được bao phủ và xác nhận lại bằng lượt acceptance/lượt cuối; bằng chứng hồi quy được tổng hợp qua các lượt chạy lại.
- Bộ mới bao phủ menu chạm ngoài/focus/Escape/resize/chuyển trang và màn hình ngang thấp; form và Help của năm module ở 390×844, 320×568, 844×390 và 390×360; dialog lồng nhau, dữ liệu mẫu, 5 chủ đề, 2 ngôn ngữ, chữ 200%; chọn kỳ trong workspace/form, giới hạn thời gian và lưu thật qua API local; cỡ chữ và overflow của 12 route; lỗi hạ tầng không lộ thông tin cấu hình.
- Đã đọc 36 ảnh production ở 390/768/1440px và contact sheets, form/Help; không có tràn ngang trong số đo. Lỗi toolbar Chi tiêu ở tablet được tìm qua ảnh dù không tràn: sau sửa, cặp select rộng lần lượt 136px tại 320px, 171px tại 390px và 188px tại 768/959/1440px; cao 44px, cùng hàng. Ảnh thay thế và số đo: `artifacts/usability-reviewed/budgets-period-final-*.png`, `period-final.json`. Manifest source/test: `artifacts/usability-source-manifest.json`.

Tài liệu đã rà/đồng bộ: catalog và trạng thái module, landing copy, preview minh họa, README, kiến trúc/UX, đặc tả năm module, Help, hồ sơ, bản địa hóa, backup và bảo trì source. Preview giữ số liệu minh họa cố định; trạng thái module không thay đổi.

Môi trường: production build local, PostgreSQL riêng, Auth double và browser/device profiles mô phỏng. Không chứng minh cloud deployment, Auth/PKCE thật hoặc thiết bị vật lý. Chưa thử bàn phím/thanh địa chỉ/vùng an toàn và chế độ màn hình chính trên iOS/Android thật; viewport 390×360 chỉ kiểm tra vùng hiển thị thấp.


## Responsive landing và phần mở rộng toàn ứng dụng — 29/10/2026

Phạm vi và hành vi: [đặc tả responsive/disclosure](features/responsive-disclosures-2026-10-29.md). Giữ các kết quả có ngày trước đó.

- `npm test`: **261/261**. Bộ HTTP client giữ loại lỗi, mã và status, đồng thời kiểm thông báo phản hồi không đọc được bằng ngôn ngữ phổ thông.
- Lint, Prettier, typecheck, `git diff --check` và kiểm liên kết tài liệu source mới đạt; architecture **255 TypeScript source files, 0 violations**.
- Production build Webpack thành công trong thư mục app và PostgreSQL/Auth local riêng. Manifest xác nhận **285 source files** khớp snapshot production đang kiểm tra, không thay source ứng dụng giữa lượt hồi quy.
- Hồi quy rộng **332/332** trong một lượt sạch (**15,8 phút**) trên Chromium desktop/mobile, Firefox và WebKit: landing/ngôn ngữ, layout/scroll, Help, usability, interface feedback, Thu nhập, Chi tiêu, Tiết kiệm, Đầu tư, Quỹ và backup. Bao phủ dữ liệu mẫu, dialog lồng nhau, năm theme, hai ngôn ngữ, chữ 200%, conflict, retry và mất phản hồi sau khi ghi. Log: `artifacts/landing-refinement/final-browser.log`.
- Acceptance cuối **20/20** trên Chromium desktop/mobile, Firefox và WebKit. Gồm tên tài khoản dài, header cùng hàng ở 320/390/600/768/1440px, hai ngôn ngữ, preview đủ năm mục, cuộn tới cuối, che tiền độc lập, bàn phím, FAQ nhiều câu, vị trí trung gian khi mở, bấm nhanh, nội dung tăng trong animation, `inert` khi đóng, giảm chuyển động, năm theme và no-JavaScript. Lượt này chạy riêng sau khi siết helper chờ đúng pathname đăng nhập và thêm tên dài; không cộng như 20 ca khác biệt với bộ hồi quy.
- Đo riêng header/hero/preview ở 320–1440px, chữ 100%/200%: không có khối được đo vượt khung hoặc cắt nội dung. Xem `artifacts/landing-refinement/final-geometry.json`.
- Đã mở **36 ảnh** của 12 route ở 390/768/1440px với tài khoản local trống, cùng ảnh preview/FAQ khách và thành viên. Không tràn ngang hoặc cắt tiêu đề trong số đo `final-app-headings.json`; dữ liệu mẫu, bảng và dialog lồng nhau được kiểm riêng trong regression usability/layout và các module.
- **100 phép đo** chữ FAQ trên năm theme sáng/tối: tương phản nhỏ nhất **4,55:1**, không mẫu nào dưới 4,5:1 (`faq-contrast.json`).
- Inspector cuối ở 1440/768/390px đạt **0 FAIL / 0 WARN với danh sách ngoại lệ nhận diện được ghi rõ**. Bản mặc định trước đó có 14 FAIL / 6 WARN theo heuristic gallery về palette, slogan, nhãn, thẻ, ảnh/video và mật độ motion; không coi đây là bằng chứng thiết kế mới đạt toàn bộ quy tắc mặc định. Đã xem đủ tám ảnh fold/sheet cuối. Tự chấm thị giác 7,1/10 theo rubric skill, có giới hạn do giữ thiết kế hiện tại. Xem `artifacts/landing-refinement/visual-review.md` và `inspection-final/report.json`.

Hai lỗi trong lượt thăm dò đầu tiên là harness: helper tìm nút tiếng Việt sau khi đã đổi sang English, và kiểm chart trong viewport khi cả khung điện thoại còn nằm một phần bên dưới màn hình. Đã sửa helper/ngữ cảnh cuộn và chạy lại; lượt landing/ngôn ngữ trước hồi quy rộng đạt 80/80. Không đổi nghiệp vụ để làm test đạt.

Tài liệu đã rà/đồng bộ: catalog, hai landing và preview, README, kiến trúc, hướng UX, UI feedback, Help, bản địa hóa, Thu nhập, Chi tiêu, Tiết kiệm, Đầu tư, Quỹ và backup. Trạng thái module, số liệu mẫu và quyền truy cập không đổi.

Môi trường: production local, PostgreSQL riêng, Auth double và browser/device profiles mô phỏng. Không ghi cloud và không chứng minh deployment, Supabase Auth/PKCE thật hoặc thiết bị vật lý. Chưa thử bàn phím, thanh địa chỉ thu/phóng, vùng an toàn và cảm giác cuộn lồng trên iOS/Android thật.

Bốn liên kết ảnh Zen trong các mục validation lịch sử không còn file tương ứng trong output cache `artifacts/browser/` sau lượt chạy này. Giữ nguyên ghi nhận có ngày; không thay bằng ảnh mới rồi coi đó là bằng chứng của lượt cũ. Các liên kết tài liệu source vừa bổ sung đều trỏ tới file hiện có.


### Đối chiếu thay đổi workspace trong lúc kiểm thử

Trong khi lượt 332 ca chạy trên snapshot production cố định, workspace có thêm thay đổi về vị trí tag trạng thái, accessory của bộ chọn tháng/năm và heading trang dự kiến. Các thay đổi được giữ nguyên; kết quả 332 ca không được coi là bằng chứng cho phần source thêm sau snapshot đó.

Đã build production mới và chạy bổ sung **36/36** trên bốn cấu hình trình duyệt: acceptance landing, tag trạng thái, dữ liệu mẫu/nested dialog/chữ 200% và typography/lỗi phổ thông của 12 route. Log và ảnh riêng tại `artifacts/landing-refinement/integration-browser*`, giữ bộ 332 ca độc lập. Các ca bổ sung có giao nhau với acceptance/hồi quy, không cộng như số ca khác biệt.

Lượt chốt sau các tinh chỉnh tag cuối đạt **10/10** trên Chromium mobile và WebKit (production build mới): header với tên dài, preview điện thoại, tag trên các module/trang dự kiến, onboarding Quỹ và luồng Đầu tư đầy đủ. Log: `artifacts/landing-refinement/latest-browser.log`. Typecheck, lint và format check đã đối chiếu lại; `latest-manifest.json` ghi snapshot cuối và các khác biệt nếu có.

## Thu nhập: xóa danh mục và bố trí tag — 29/10/2026

- Quy tắc đã chốt: chỉ chặn Xóa danh mục khi còn bản ghi số thu ở bất kỳ tháng/năm nào, kể cả 0 đồng. Khi đã xóa hết số thu thì được xóa danh mục bằng cờ deleted; audit và command vẫn được giữ. UI và server dùng chung hasMonthlyIncome, kiểm tra trong transaction và giữ version conflict/idempotency. Không đổi API/schema/backup hoặc cần migration.
- Tag dùng StatusBadge chung: nền nhẹ, viền rõ, chữ đậm, icon trang trí, sắc thái semantic sáng/tối. Bổ sung theo feedback 29/10: trạng thái nguồn đi cùng tên; ngày bắt đầu riêng; trạng thái Tiết kiệm gắn nhãn kỳ; ngày/phạm vi báo cáo và tag cùng nhóm, câu giải thích riêng; ngày/tag trong ô xếp có gap; tag tổng kỳ ngắn; footer tag căn phải theo tiền. Không thay dữ liệu hoặc phép tính tài chính.
- Gate cuối `npm run check` bằng Node 22.12 đạt: ESLint 0 warning, kiến trúc 255 source files/0 vi phạm, Prettier, 30 file/261 unit tests, TypeScript và production build Turbopack. Log: `artifacts/badge-placement/check.log`. PostgreSQL integration ở pha đổi quy tắc xóa đạt 11 file/70 tests trên cluster local riêng, gồm xóa sau clear toàn bộ, chặn 0 ở năm khác, audit và stale deletion; pha bố trí chỉ đổi UI.
- Lượt browser cuối: **44/44 đạt trong một lượt**, production build webpack riêng, Chromium desktop/mobile, Firefox desktop, WebKit iPhone mô phỏng, 1 worker. Chạy `income.spec.ts`, `status-badges.spec.ts`, `usability.spec.ts` với grep `income|status badges|status labels|status placement|shared month-year`. Gồm 28 ca Thu nhập, 12 ca màu/nhãn/vị trí và 4 ca bộ chọn kỳ dùng chung. Output/ảnh: `artifacts/browser-badge-placement/`; build log: `artifacts/badge-placement-next.log`; `.last-run.json` ghi passed, không có failedTests.
- Màu và geometry: năm visual themes, sáng/tối, Việt/Anh, 320/375/1440px; phép đo bố trí thêm 768px và tên nguồn dài. Kiểm tra label/badge không đè nhau, ngày nằm dưới nhóm tên, tag không chen vào số tiền/thao tác, status kỳ nằm trong legend và controls có khoảng cách, giải thích báo cáo không chứa tag giữa câu. Các cặp token tag có tương phản tối thiểu 6,035:1; `artifacts/status-badge-contrast.json`. Kiểm tra phần tử render yêu cầu tối thiểu 4,5:1, font >=12px, border >=1px và không tràn trang.
- Đã xem ảnh crop Thu nhập, bộ chọn kỳ Tiết kiệm, phạm vi báo cáo Đầu tư và tiêu đề trang dự kiến ở 320/1440px, cả sáng/tối. Nhóm tên dài xuống dòng cùng tag nguyên khối, ngày và actions giữ tách biệt. Ghi chú review: `artifacts/badge-placement/critique.md`. Đối chiếu 340 file source/public/config với bản dùng cho lượt browser cuối: 0 khác biệt; manifest `artifacts/badge-placement/source-manifest.json`.
- Lịch sử lượt trước được giữ: hồi quy module/Help/landing/locale/keyboard có 114/116 đạt, hai ca Tiết kiệm dùng selector cũ `.pill`; sau cập nhật selector sang `.status-badge`, lượt tập trung Tiết kiệm và tag trên bốn browser profiles đạt 12/12. Bộ test tag mới cũng đã sửa việc đọc Auth response sau chuyển trang, fixture thiếu trạng thái và selector summary có subline trước lượt cuối 44/44. Không dùng các lượt lỗi harness làm bằng chứng app đã đạt.
- Đã rà/đồng bộ catalog, Help Việt/Anh, README, đặc tả Thu nhập, quy chuẩn tag và bảo trì source; landing copy/preview vẫn phản ánh quy tắc hiện tại, số minh họa cố định và không đọc API tài chính tài khoản. Giữ các thay đổi khác đang có trong workspace.

Môi trường là PostgreSQL local, Auth double và trình duyệt mô phỏng. Không triển khai/ghi cloud, không chứng minh Supabase Auth/PKCE thật hoặc thiết bị vật lý. Xem [quy tắc và vị trí tag](features/income-tags-2026-10-28.md).

## Tổng quan cá nhân hóa — 29/10/2026

Môi trường: Node 22.12, PostgreSQL local do runner sở hữu, Supabase Auth contract double, Next.js production build. Không ghi cloud, không coi browser emulation là kiểm chứng thiết bị vật lý.

- Unit: **267/267**; PostgreSQL: **72/72**, gồm cấu hình mặc định không tạo dữ liệu, FORCE RLS/cách ly owner, revision xung đột và hai lần lưu đầu đồng thời. Cấu hình widget không ảnh hưởng tài khoản trống/backup.
- Browser chấp nhận cuối: **28/28** qua Chromium desktop/mobile, Firefox và WebKit tại `artifacts/overview-acceptance-browser`; build log `artifacts/overview-acceptance-next.log`. Số liệu Tổng quan được đối chiếu với API của cả năm module, response không chứa book/audit.
- Bao phủ thêm/ẩn/đổi thứ tự bằng bàn phím, chọn tối đa 5 hũ, xem thử/Hủy/khôi phục mặc định/Lưu, tài khoản trên trình duyệt thứ hai, lỗi lưu và xung đột, lỗi từng nguồn, giữ số lần tải trước, hết phiên, short/stale foreground, retry có spinner/aria-busy và không đổi vị trí nội dung khi refresh.
- UI: 320/390/768/1440px, năm theme, sáng/tối, Việt/Anh, Privacy Mode và reduced motion. Dialog cấu hình tại 320px được đo toàn viewport, hỗ trợ Escape và trả focus về nút tùy chỉnh. Screenshots gồm `customize-320.png`, `overview-mobile.png`, `overview-desktop.png` trong từng project của thư mục chấp nhận.
- Kiểm tra hồi quy landing public/preview độc lập, đăng nhập, Help preview, loading và cuộn preview điện thoại cũng đã qua trên bốn project trong vòng kiểm tra trước; nguồn preview luôn cố định, không gọi API tài chính.
- Lint, architecture (**267 source files, 0 violations**), format check và typecheck qua. Production Webpack build trong runner qua; `npm run build` mặc định với Turbopack cũng qua (compile, TypeScript, static generation và tối ưu hóa).
- Inspector trên bản production với fixture local: **0 FAIL, 1 WARN** tại 1440/768/390. Giữ palette ứng dụng có sẵn bằng exception `palette-claude`; cảnh báo còn lại là nhãn sidebar hiện hữu. Đã mở cả sáu ảnh để review. Critique hai vòng: **7.6/10**, tại `artifacts/overview-review/critique.md`; số đo/ảnh tại `artifacts/overview-review/final-inspect/`.

Các lỗi phát hiện trong quá trình kiểm chứng đã được sửa: serialization JSON của cấu hình, CSS dialog mobile bị luật dùng chung ghi đè, khoảng cách danh sách cũ và tiến độ quỹ mặc định của trình duyệt, trả focus WebKit, refresh đẩy nội dung và trạng thái chờ của nút thử lại. Kết quả chấp nhận nêu trên được lấy sau các sửa liên quan.

Đã rà soát/cập nhật catalog, Help Việt/Anh, README, landing khách/thành viên và preview mẫu, tài liệu Tổng quan, kiến trúc, UX, khám phá tính năng và triển khai. Migration `202610290001_overview_layouts.sql` mới chỉ áp dụng vào database kiểm thử local; cloud/deployment và thiết bị thật chưa được xác nhận cho thay đổi này.

## Dialog Đầu tư và tùy chọn cột — 29/10/2026

Môi trường: Node 22.12, production Next.js, PostgreSQL và Supabase Auth double local do runner sở hữu. Không seed/migrate/reset cloud, không deploy và không kiểm chứng thiết bị thật.

- Tái hiện baseline: hàng tùy chọn cột ~89px/công tắc 44px, select form 57–142px so với input 46px; submit trống hiện JSON Zod/UUID. Ảnh `artifacts/investment-feedback-before-*.png`.
- Form chia nhóm, input/select mặc định 46px, tăng chiều cao theo cỡ chữ. Tách kiểu checkbox/radio và hàng chọn cột khỏi CSS form Đầu tư/Tiết kiệm/Quỹ. Lỗi schema dùng thông báo tại trường và toast tóm tắt; số tiền không bị bọc trong khối cảnh báo lớn.
- Bỏ browser confirm, dùng Modal ứng dụng có Tiếp tục nhập/Bỏ thay đổi; bảo vệ cả raw numeric draft không hợp lệ. Thêm initialFocusRef, giữ focus khi cha/xác nhận đóng cùng lúc, sửa chiều cao dialog-confirm mobile theo nội dung.
- `npm test`: **271/271**; PostgreSQL local: **76/76**. Typecheck, ESLint, format check, architecture (**268 source files, 0 violations**) và `git diff --check` qua. `npm run build` mặc định Turbopack qua; runner browser dùng production Webpack.
- Probe của design-taste chạy trong phiên Playwright đã đăng nhập: 1440/768/390, **0 FAIL / 4 WARN** sau các exception đã nêu tại `artifacts/investment-feedback-review/critique.md`: palette sẵn có, emoji là metadata danh mục, phản hồi/focus của nút và bóng của modal/toast thực sự nổi. Cảnh báo còn lại ở shell nền. Static app lint vẫn nhận diện năm emoji preset có sẵn; giữ vì đây là dữ liệu có thể sửa, không thêm biểu tượng trang trí.
- Đã rà/cập nhật catalog và bản dịch, Help của preview cố định, README, UX, đặc tả Đầu tư, dialog, Help và bản địa hóa. Các copy landing còn lại tiếp tục phù hợp. Kiểm tra **115 liên kết / 6 file**, không có đường dẫn hỏng. Giữ lịch sử và chỉnh sửa tài liệu không liên quan có sẵn.

Hai test cũ được đối chiếu lại với source hiện tại: no-JavaScript landing vẫn mong tiêu đề preview trước lần bổ sung Tổng quan; test cảnh báo kết quả ghi chưa rõ vẫn mong bản dịch Anh cũ. Cập nhật assertion theo nội dung hiện hành, không đổi hành vi sản phẩm để khớp test. Các giả định sai ban đầu của test mới (thời điểm áp dụng giới hạn 24 chữ số, chờ cuộn kết thúc, mở tab báo cáo trước khi tìm picker) cũng được sửa trước lượt chấp nhận.

Kết quả chấp nhận:

- Hồi quy rộng **196/196** trong một lượt sạch (**11,2 phút**) trên Chromium desktop/mobile, Firefox và WebKit: Đầu tư, dialog, Help, feedback, layout/scroll, landing và localization. Log `artifacts/investment-feedback-accepted.log`.
- Sau bổ sung duy nhất bản dịch `Mua → Buy`, chạy lại nhóm dialog **20/20** (**1,3 phút**) trên production build mới. Lượt này xác nhận đầy đủ tám nhãn loại giao dịch ở vi/en và focus trở về nút mở sau khi Bỏ thay đổi. Log `artifacts/investment-feedback-final-label.log`.
- Đo đủ tám loại × năm kích thước (320/390/768/1440 và 812×375) trên bốn project; chụp 160 trạng thái vi/en × năm theme × sáng/tối × desktop/mobile. Kiểm tra chữ 200%, lỗi thiếu trường/24–25 chữ số, không có JSON kỹ thuật, đóng bằng X/nút/Escape/backdrop, tiếp tục nhập, bỏ thay đổi, raw draft lỗi, chọn cột giữa các module và đổi route. Các luồng sửa/hủy, bán hết, Privacy Mode, conflict/retry và mất phản hồi sau ghi tiếp tục qua.
- Đối chiếu **354 file source/public/config** với snapshot của lượt chốt: **0 khác biệt**; manifest `artifacts/investment-feedback-review/source-manifest.json`. Ảnh sau sửa, probe và critique nằm trong cùng thư mục; ma trận ảnh từng trình duyệt có sheet riêng. Bằng chứng browser là local/emulation, không thay cho Supabase Auth cloud, deployment hoặc thiết bị vật lý.

## Tối ưu tải Tổng quan — 29/10/2026

Môi trường: Node 22.12.0, production build Next.js 16.4.1, PostgreSQL 14.2 cô lập do runner sở hữu và Auth contract double local. Không dùng dữ liệu tài khoản/cloud. Không suy ra Supabase Auth/RLS trên cloud, tốc độ Vercel, email thật hoặc thiết bị vật lý từ kết quả này.

- Unit: **272/272**, gồm projection tháng Chi tiêu đối chiếu reader đầy đủ với chuyển số dư qua năm đã chốt/chưa chốt.
- PostgreSQL: **80/80**, gồm đối chiếu năm nguồn với reader module, revision sửa/hủy, dữ liệu khác owner, đọc Chi tiêu dùng chung với Quỹ, Quỹ khi Chi tiêu bị ẩn và giữ nguyên bố cục sáu widget đã lưu. `scripts/test-postgres.mjs` chỉ tạo cluster local; runtime vẫn dùng `expense_api`/RLS.
- Browser: **208 ca hiện hành được chọn đã qua**, trên Chromium desktop, Chromium mobile, Firefox và WebKit. Gồm Tổng quan, foreground refresh, loading, Zen/privacy, backup, Help và landing. Bản cuối riêng Tổng quan đạt **52/52**: 0/2/8 widget đúng ngay lần hiển thị đầu, một request dữ liệu, không tải mặc định khi lỗi cấu hình, tùy chỉnh không tải thừa, bỏ cảnh báo module ẩn, làm mới danh sách phụ, giữ bản nháp và hết phiên khi lưu.
- Cách tính browser: vòng mở rộng ghi nhận 200 ca qua; bốn ca còn đòi gợi ý khôi phục cũ được thay bằng luồng đã chốt và chạy riêng đạt 4/4. Vòng Tổng quan cuối đạt 52/52, gồm 48 ca chạy lại và bốn ca mới về hết phiên khi lưu. Tổng là 208 ca hiện hành khác nhau; không cộng 48 lần chạy lại thành ca mới, không coi vòng mở rộng ban đầu là một lần chạy xanh toàn bộ. Hai worker của vòng đang chạy báo không tìm thấy tên ca cũ vì test đã được đổi tên; ca thay thế được kiểm chứng riêng trên cả bốn cấu hình.
- Kiểm tra source: lint, format, architecture (**269 files, 0 violations**), typecheck, unit, production build và `git diff --check`. Catalog, landing/preview cố định, README, Help, đặc tả Tổng quan/backup, kiến trúc và UX đã được rà soát/cập nhật.

### Đo đọc dữ liệu trước/sau

Đối chiếu reader/DTO trước tối ưu với projection mới trên cùng dữ liệu mẫu năm module và cùng bố cục. Warm cả hai đường đọc rồi chạy xen kẽ **12 mẫu mỗi đường**. Số câu lệnh gồm transaction và thiết lập owner; byte DB là kích thước JSON tuần tự hóa các hàng trả về cho ứng dụng, không phải số hàng DB đã quét. JSON response gồm bố cục và số liệu. Thời gian chỉ đo service đọc DB và tính số liệu, **không gồm HTTP/Auth**.

| Chỉ số local | Trước | Sau |
| --- | ---: | ---: |
| Câu lệnh DB | 69 | 31 |
| Byte dữ liệu trả từ DB | 240.751 | 117.333 |
| Byte JSON bố cục + số liệu | 4.672 | 823 |
| Thời gian trung vị | 12,98 ms | 4,93 ms |
| p95 trong mẫu local | 15,32 ms | 6,12 ms |

Mức giảm tương ứng khoảng 55% số câu lệnh, 51% byte DB và 82% byte response. Đây là benchmark mẫu local, không phải cam kết độ trễ cloud. Danh sách hũ/phân bổ/đáo hạn chỉ tính và trả khi bật widget; các revision cần tính đúng số dư vẫn được đọc.

Bằng chứng: `artifacts/overview-performance/database.json`, `db-final.log`, `final-check.log`, `acceptance-check.log`, `browser-final.log`, `backup-final.log`, `overview-accepted.log` và screenshots/traces trong output browser tương ứng. Không thêm migration hoặc thực hiện deploy cloud.

## Khôi phục có chẩn đoán và làm trống có sao lưu — 29/10/2026

Đã hoàn thành source cho trạng thái chặn theo 5 phân hệ/35 bảng, thao tác làm trống riêng có backup và xác nhận bắt buộc, snapshot chống xóa dữ liệu chưa sao lưu, transaction/RLS/trigger chuyên biệt, receipt retry và generation chặn tab/lệnh/import cũ. Đã rà soát/cập nhật README, catalog vi/en, landing copy vi/en, Help, kiến trúc, UX, triển khai và troubleshooting. Preview tài chính không có màn Cài đặt; dữ liệu minh họa giữ cố định và các kiểm thử xác nhận không gọi API tài chính.

Bằng chứng cuối trên Node **22.12.0**, PostgreSQL cô lập và Auth double local; browser chạy production Next.js **16.4.1**:

- `npm run check`: lint, format, architecture **275 source files / 0 violations**, **274/274 unit**, typecheck và production build đều qua. Kiểm tra kiểu cuối cũng qua sau khi mở rộng fixture Fund trong test.
- `npm run test:db`: **87/87** qua. Fixture reset có dữ liệu cả 5 phân hệ, kỳ Chi tiêu đã chốt và giao dịch Fund đã hủy. Kiểm chứng backup/restore khớp, xóa sạch 35 bảng, giữ bố cục/tài khoản khác; stale/expired/cross-owner, rollback khi lỗi ở bảng giữa luồng; concurrent retry không xóa dữ liệu mới; receipt/generation cũ bị chặn ở cả 5 repository; xóa lịch sử trực tiếp, nâng role và gọi RPC từ session ngoài runtime bị từ chối. Migration Fund chưa tồn tại trong một bài kiểm thử được dựng có chủ đích; bài này bỏ migration reset phụ thuộc Fund.
- `reset.spec.ts`, `backup.spec.ts`, `landing.spec.ts`, `help.spec.ts`: **120/120** qua trên Chromium desktop/mobile, Firefox và WebKit. Gồm **24 ca reset**, **28 backup**, **40 landing**, **28 Help**. Kiểm tra giữ bản nháp/tab khác nhưng command trả 409 sau reset, command mới từ UI gửi generation mới, restore lại file đã tải, backup/xác nhận/phrase bắt buộc, snapshot thay đổi, mất phản hồi và retry cùng request, vi/en, focus Hủy và dialog không tràn tại 320px. Landing/Help kiểm tra thêm theme, zoom, reduced motion và biên Auth/public preview.
- Request JSON backup hợp lệ với whitespace padding **11 MiB** đi qua Next proxy đến preview đầy đủ, trả 200; request vượt ngưỡng vẫn 413. Đây là bằng chứng đường truyền local vượt mặc định proxy 10 MB, không phải benchmark restore dữ liệu tài chính 20 MiB hoặc xác minh giới hạn hosting.
- `git diff --check` qua.

Bằng chứng ở `artifacts/financial-reset-validation/{check-final,database-final,types-final,browser-final}.log`, ảnh `reset-confirm-320-{desktop,mobile,firefox,webkit}.png` và `source-manifest.json`. Lượt browser trước có lỗi locator dùng tên region tiếng Việt sau khi đổi English; đã đối chiếu screenshot/error context, sửa locator theo tên đã dịch, rồi chạy lại đủ ma trận với các assertion nghiệp vụ giữ nguyên.

**Giới hạn:** không migrate/reset dữ liệu cloud, không deploy, không xác minh Auth cloud/hosting hay thiết bị vật lý. Cloud cần migration `202610290002_financial_data_reset.sql` sau schema đủ 5 phân hệ/data_imports; kết nối migration phải có quyền tạo role và chuyển owner hàm. Chưa xác minh quyền migration trên tài khoản quản trị Supabase đích. Khi thiếu migration, reset bị khóa và backup vẫn hoạt động.

### Kiểm tra migration biên nhận trước reset — 29/10/2026

Sau lỗi `42P01: public.data_imports does not exist` do chạy migration reset trước migration biên nhận, đã thêm preflight đầu file reset, trước mọi DDL. Thiếu biên nhận trả `FINANCIAL_RESET_PREREQUISITE_MISSING` kèm hướng dẫn chạy toàn bộ `202610180002_data_imports.sql` trước. Regression dựng database local không có biên nhận: xác nhận migration dừng mà chưa tạo bảng/hàm reset; áp dụng migration biên nhận rồi reset thành công, giữ nguyên bản ghi tài chính đã có.

`npm run test:db`: **88/88** qua; lint cho test mới, typecheck và `git diff --check` qua. Log: `artifacts/financial-reset-validation/prerequisites-database.log`, `prerequisites-types.log`. Không đổi UI/API, catalog, landing hoặc preview; đã cập nhật hướng dẫn triển khai và troubleshooting. Không áp dụng migration hoặc thay đổi dữ liệu cloud.

### Ownership migration với tài khoản không phải superuser — 29/10/2026

Đã sửa lỗi `42501` khi ALTER FUNCTION OWNER cần SET ROLE trên Supabase. ACL được cấu hình trước ownership transfer. Một DO block cấp quyền SET tạm cho migration actor nếu thiếu, chuyển owner và chỉ thu hồi phần quyền đã thêm; grant bootstrap/admin có sẵn được giữ nguyên. Không cấp quyền role reset cho runtime ứng dụng.

Regression dùng kết nối LOGIN NOSUPERUSER CREATEROLE NOINHERIT NOBYPASSRLS, sở hữu schema tài chính trong database cô lập và có quyền grant cần thiết trên Auth. Trên PostgreSQL 16 dựng membership bootstrap ADMIN=true/SET=false/INHERIT=false giống trường hợp Supabase: bản migration cũ tái hiện đúng lỗi `must be able to SET ROLE`, transaction không để lại bảng reset. Bản mới áp dụng thành công; xác minh owner SECURITY DEFINER đúng role, ACL authenticated/anon đúng, quyền SET sau chạy vẫn false, membership trước/sau khớp và bản ghi tài chính được giữ.

**89/89 kiểm thử PostgreSQL qua trên PostgreSQL 14.2 và 16.4**. PostgreSQL 16.4 được dựng từ source release chính thức, kiểm SHA-256, cài riêng dưới `artifacts/postgresql-16-ownership-check/` để kiểm thử; không thay PostgreSQL đang dùng hoặc cấu hình hệ thống. Lint test, typecheck và diff check qua. Log: `artifacts/financial-reset-validation/ownership-database.log`, `ownership-postgres16.log`, `ownership-types.log`; build PG16 ở `artifacts/postgresql-16-ownership-check/build.log`. Không đổi giao diện/API/catalog/landing/preview; tài liệu deployment/troubleshooting đã cập nhật. Không thao tác migration/schema/dữ liệu cloud; kiểm chứng local không thay bằng chứng áp dụng trên Supabase đích.

## Bố cục Quỹ an toàn — 30/10/2026

Đã tinh chỉnh giao dịch, nơi giữ tiền, lịch sử, card Nền tảng sinh hoạt và bước chọn nguồn khi Điều chỉnh. Thành phần chung áp dụng cả ba quỹ và danh sách ngoài trang. Đã rà soát/cập nhật README, đặc tả Quỹ, UX, kiến trúc, catalog và phần giải thích preview vi/en. Số liệu public preview vẫn cố định và API-free.

Kiểm tra trên Node **22.12.0**, PostgreSQL cô lập và Auth double local:

- **274/274 unit test** qua, gồm kiểm tra đủ bản dịch literal và nội dung catalog/preview; lint, format, typecheck và architecture **276 source files / 0 violations** qua.
- **44/44 browser test** qua trên production build Next.js **16.4.1**: Chromium desktop/mobile, Firefox và WebKit, với `funds.spec.ts` và `fund-review.spec.ts`. Kiểm chứng chọn/giữ nguồn sinh hoạt, mô tả trợ năng, khóa/mở danh sách hũ, bộ lọc đóng vẫn giữ tác dụng, căn cột số tiền, Sửa có chữ, dialog con giữ tab, lịch sử trước/sau và hủy, nơi đã ngừng, privacy, vi/en; thêm cả ba tab ở **320px, dark mode và font 125%**, không tràn ngang. Các ca chuyển tiền, phân trang, conflict/retry và nguồn đổi chờ xác nhận tiếp tục qua. Log cuối: `artifacts/fund-layout-after/browser-final.log`, `production-build.log`, `unit-final.log`; ảnh 320px ở `artifacts/browser/fund-layout-*-320-dark-*.png`.
- Chụp và xem trực tiếp ba tab ở **1440/768/375px** trước/sau. Chiều rộng client/scroll lần lượt **910/910**, **702/702**, **309/309px** ở cả hai bản: không tràn ngang. Ảnh mobile sau tinh chỉnh cho thấy tìm kiếm và dòng giao dịch đầu xuất hiện trong vùng đọc ban đầu.
- App-style source scanner không có FAIL; WARN ở eyebrow và shadow có sẵn trong hệ thống theme được giữ. Chạy `probe`/`app` của skill trong phiên Playwright đã đăng nhập; standalone inspector không hỗ trợ luồng đăng nhập. Ảnh, phép đo, đối chiếu và manifest source ở `artifacts/fund-layout-before/` và `artifacts/fund-layout-after/`.

Không thay schema/công thức tài chính hoặc thao tác dữ liệu cloud. Production build trong runner là build local riêng; kết quả không xác minh deployment, Auth/RLS cloud hoặc thiết bị vật lý.

## Reset trên hosted Auth schema — 30/10/2026

Đã xác định bằng query catalog read-only trên database cấu hình (PostgreSQL 17.11): role financial_data_reset có EXECUTE auth.uid nhưng thiếu USAGE auth; reset SECURITY DEFINER gọi auth.uid ngay ở khai báo owner. Không đọc số liệu tài chính/owner của tài khoản, không gọi reset hoặc ghi schema/data cloud. Bằng chứng đã lược bỏ thông tin kết nối tại `artifacts/financial-reset-validation/cloud-auth-access-readonly.json`.

Đã thêm forward migration `202610300001_reset_owner_claims.sql`: helper SECURITY INVOKER đọc owner từ JWT context server, không cần Auth schema; sửa các policy/trigger/hàm của reset theo cùng identity. DDL chỉ cập nhật định nghĩa/quyền, không gọi xóa. Runtime/owner/RLS không được nới. File hỗ trợ chạy lại và bảo toàn quyền SET/CREATE/membership trước đó. API phân loại SQLSTATE 42501 thành RESET_PERMISSION_REQUIRED sau rollback; UI hiển thị dữ liệu chưa bị xóa và cho đóng, còn lỗi mất phản hồi tiếp tục giữ cùng request.

Kiểm chứng cuối:

- **91/91 PostgreSQL** qua trên 14.2 và 16.4. Test mới dựng Auth không cho custom role USAGE, admin NOSUPERUSER/NOINHERIT có USAGE nhưng không có GRANT OPTION Auth, schema public không cấp CREATE cho PUBLIC. Tái hiện lỗi trước sửa, apply repair hai lần, xác minh quyền/membership khôi phục, reset/retry bằng request cũ rồi import lại backup khớp. Test riêng thu hồi DELETE ở một bảng giữa luồng, xác nhận rollback cả các bảng đã xóa trước đó và thông báo lỗi quyền chắc chắn.
- **56/56 browser** qua trên Chromium desktop/mobile, Firefox, WebKit, chạy production Next.js và PostgreSQL 16.4/Auth double. Gồm luồng giữ nguyên dữ liệu khi lỗi quyền và đóng dialog; mất xác nhận vẫn retry đúng request; restore cùng tài khoản, tab cũ, vi/en, backup/layout/API guards.
- `npm run check` qua: **274/274 unit**, lint, format, architecture **276 files / 0 violations**, typecheck và build. `git diff --check` qua. Bản test cuối chỉ thêm mô phỏng hạn chế CREATE mặc định của PG14 để khớp hosted schema; không đổi code sản phẩm sau lượt browser/gates đã qua.

Log: `artifacts/financial-reset-validation/auth-access-{check,browser,postgres14,postgres16}.log`. Đã cập nhật README, backup, architecture, UX, deployment và troubleshooting. Catalog/landing/preview cố định/Help đã rà soát; phạm vi nghiệp vụ và dữ liệu minh họa không đổi nên giữ copy hiện tại. Việc áp dụng repair trên database đích vẫn cần SQL Editor/admin; chưa kiểm chứng reset dữ liệu thật hoặc thiết bị vật lý.

## Mục tiêu — 31/10/2026

Hoàn tất triển khai bắt đầu 30/10. Node 22.12.0; PostgreSQL cô lập do runner tạo, Auth double local; không dùng tài khoản thật, không ghi cloud. Các thay đổi chưa commit đã có của luồng reset/owner-claims được giữ và tích hợp.

- npm run check: PASS; lint, architecture (292 source files, 0 violations), format, 287/287 unit, typecheck và production build. Log: artifacts/goals-check-release.log.
- npm run test:db: 100/100 PASS trên trạng thái source cuối. Gồm phân bổ/khóa, nguồn cùng owner và FK chống xóa nguồn, Tiết kiệm/Đầu tư/Quỹ, V3 round-trip, reset và generation, replay sửa/hủy, retry và kiểm tra 26 biên nhận không nhân bản toàn bộ lịch sử. Log: artifacts/goals-db-release.log.
- Lượt trình duyệt cuối: 84/84 PASS, gồm goals.spec.ts, backup.spec.ts, reset.spec.ts; Chromium desktop/mobile, Firefox desktop và WebKit mobile. Riêng Goals 28/28; số 84 đã gồm 28, không cộng lại. Log: artifacts/goals-browser-release.log; traces/failures nếu có ở artifacts/goals-browser-release.
- Lượt tích hợp trước khi làm gọn payload biên nhận: 114/116 PASS với năm spec Goals/backup/reset/landing-language/status-badges. Hai ca status cũ còn đòi badge tại Tổng quan; thay bằng trang planned Tài khoản theo contract hiện tại, giữ Goals bằng mục tiêu thật trong fixture. Rerun toàn bộ bốn cấu hình của ca đó: 4/4 PASS (artifacts/goals-status-rerun.log). Các số này là lượt trước/focused, không phải một lượt 116/116 sạch trên source cuối. Landing và trình bày badge không đổi trong bước làm gọn biên nhận.
- Ảnh Goals: 320/768/1440px, năm theme, sáng/tối, cả bốn project. Ví dụ artifacts/goals-firefox-forest-light-1440.png và artifacts/goals-webkit-earth-dark-320.png. Dữ liệu giả do test tạo: Mua xe 40/100 triệu; thứ tự ưu tiên, tiến độ, số tiền, ngày và điều khiển được kiểm tra. Luồng còn bao gồm bỏ nháp, lỗi nguồn sau preview, mất phản hồi lưu, che tiền và vi/en.
- Design skill lint: 0 FAIL, 1 WARN về dấu gạch ngang. Các dấu này biểu diễn dữ liệu chưa có/không áp dụng, phù hợp quy tắc app; không dùng thay văn xuôi. Hướng Achromatic ledger, seed 1650097295, giữ palette/type/shell hiện tại; không thay thương hiệu.

Đã rà và cập nhật catalog, public summary và preview minh họa, Help Goals/Funds, README cùng tài liệu sản phẩm, dữ liệu, kiến trúc, UX, backup và deployment. Preview không gọi API tài chính tài khoản; không thêm Goals vào Tổng quan.

Giới hạn: chưa áp migration 202610300002_goals.sql hoặc triển khai cloud, chưa xác minh Supabase Auth/RLS thực qua triển khai này, không phải bằng chứng iPhone/Android vật lý. Kiểm thử RLS dùng PostgreSQL local và danh tính Auth double.
