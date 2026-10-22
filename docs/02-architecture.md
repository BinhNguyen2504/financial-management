# Kiến trúc và công nghệ

**Hiện trạng 17/10/2026:** web Next.js có landing công khai, Auth email, API v1 cho Thu nhập/Chi tiêu/Tiết kiệm và migrations PostgreSQL/RLS. Các mô tả P0 và endpoint dự kiến bên dưới là nền định hướng lịch sử, không phải danh sách chức năng đang thiếu của ba module đã triển khai.

## Trang công khai và kiểm soát truy cập

- Root layout giữ font, token, user provider và PWA. Route group `(public)` chứa `/` và `/login`; `(app)` giữ URL hiện có với sidebar, Privacy Mode và metadata noindex.
- Mỗi page ứng dụng await `pageAccess()` trước khi render. `pageSession()` xác minh qua Supabase `getUser`, chỉ cache trong một lượt render; không dựa vào cookie claim hoặc layout để cấp quyền.
- Proxy refresh cookie cho trang và API, đặt private/no-store. Chỉ request API có Authorization mới bỏ qua refresh cookie; API tự xác minh Bearer và owner/RLS.
- Phiên thiếu/hết hạn chuyển `/login?next=...`; whitelist route dùng chung với catalog, mặc định `/overview`. Auth gián đoạn hiện retry, không coi là logout. `/` luôn công khai.
- Landing HTML và ảnh Open Graph không chờ Auth trong proxy. `/` render marketing công khai ban đầu; `LandingAudience` và `PublicShell` dùng `useUser` chung để chuyển sang landing theo theme khi đã có user. Auth gián đoạn không chặn nội dung công khai; đây chỉ là phân loại trình bày, không cấp quyền workspace. `marketing-shell` chỉ áp cho khách ở `/`, không đổi preference hoặc giao diện login.
- Landing preview là client component với dữ liệu mẫu cố định; không import workspace hoặc gọi API tài chính. Tài khoản công khai dùng user provider/menu hiện có, tách khỏi dữ liệu preview.
- Metadata chia sẻ có ảnh Open Graph sinh bằng Next ImageResponse. App và login noindex; service worker chỉ cache offline.html, PWA mở /overview sau xác thực.
- Catalog là nguồn module/status dùng chung; tài liệu và preview được rà soát cùng thay đổi theo AGENTS.md. Xem [đặc tả landing](features/landing.md).

**Module Chi tiêu đã có source:** Supabase SSR/Auth, API v1, Zod, Postgres.js và transaction/RLS; native form/dialog, biểu đồ HTML/SVG, Vitest/Playwright. Connection server dùng role expense_api và JWT claims theo owner đã xác minh. Chi tiết triển khai và khác biệt so với các công nghệ còn dự kiến bên dưới nằm ở [đặc tả Chi tiêu](features/expenses.md). Mức xác minh cloud theo từng module được ghi riêng trong [validation](07-validation.md); migration Tiết kiệm chưa áp dụng trên cloud.

## Quyết định chính

Dùng một codebase web và backend theo module, tránh tách microservice ở quy mô cá nhân. Tách nghiệp vụ tài chính khỏi framework; cung cấp HTTP API có phiên bản để PWA và iOS dùng chung. Stack bên dưới phân biệt công nghệ đã dùng trong source và những lựa chọn chỉ bổ sung khi cần.

```mermaid
flowchart TD
  Web[Web PWA - điện thoại và desktop] --> API[Next.js Route Handlers - API v1]
  IOS[Flutter iOS - Dart - giai đoạn sau] -.-> API
  Web --> Auth[Supabase Auth]
  IOS -.-> Auth
  API --> App[Application services - kiểm quyền và điều phối]
  App --> Domain[Domain - tính toán thuần TypeScript]
  App --> Repo[Repository - dùng danh tính người dùng]
  Repo --> DB[(PostgreSQL - RLS và ràng buộc)]
  Job[Job định kỳ có idempotency] -.-> App
  DB --> Report[Truy vấn báo cáo và snapshot định giá]
  Report --> API
```

## Stack theo nhu cầu

| Lớp | Công nghệ | Lý do chọn | Trạng thái |
| --- | --- | --- | --- |
| Runtime | Node 22 LTS, npm + lockfile | Có runtime phù hợp sẵn trên máy; kiểm tra nhất quán local/CI/cloud | Đã dùng local |
| Web và API | Next.js App Router + React + TypeScript strict | Routing, rendering và HTTP API trong cùng source; dễ triển khai và tách service về sau | Đã triển khai landing, Auth và ba module |
| Styling | Tailwind CSS 4 + CSS semantic tokens | Giao diện responsive, theme và tái sử dụng style | Đã cài; shell dùng CSS tokens |
| Components | shadcn/ui, bổ sung khi có dialog/form/table thực tế | Sở hữu source component và chuẩn hóa hành vi truy cập | Chưa cài |
| Icon | Lucide React | Cùng một bộ SVG có nhãn đi kèm | Đã dùng |
| Forms | Native form/dialog + Zod | Schema kiểm tra client/server; chưa cần React Hook Form | Đã dùng |
| Biểu đồ/bảng | HTML/SVG và bảng có accessibility | Tương tác bàn phím, bảng thay thế, ít dependency | Đã dùng; Recharts/TanStack chưa cần |
| Số học | BigInt; số lượng vàng có scale cố định | Tránh mất chính xác từ float; API dùng decimal string | Đã triển khai |
| Database | PostgreSQL, Postgres.js và SQL migrations | Transaction, RLS và role expense_api | Source/local đã có; cloud theo module |
| Auth | Supabase Auth + `@supabase/ssr` cho web | Email/OTP, cookie refresh, page/API verification | Đã triển khai |
| Client dữ liệu | HTTP API v1 cho tài chính; Supabase SDK cho Auth | Server xác minh owner và áp RLS | Đã dùng |
| PWA | Manifest của Next.js + service worker giới hạn phạm vi | Bắt đầu nhẹ, offline fallback; hàng đợi offline bổ sung sau | Nền PWA đã dựng |
| Kiểm thử | Vitest, DB integration/RLS, Playwright | Kiểm công thức, transaction, quyền và tác vụ nhiều thiết bị | Unit, DB integration/RLS và browser local đã có |
| Deploy | Vercel + Supabase managed | Hạn chế việc tự vận hành server; preview riêng với production | Mới là kế hoạch |

Khóa phiên bản thực tế trong `package-lock.json`. Dùng TypeScript 5.9 cho bộ khung hiện tại; không tự động chuyển major theo npm latest. Các dependency chưa cần thiết được để ở trạng thái dự kiến.

## Ranh giới source khi mở rộng

- `src/app`: route web và `/api/v1`, chỉ chuyển request/response, không chứa công thức tài chính trong JSX.
- `src/features/<feature>`: component, form và view model của mỗi module.
- `src/domain`: kiểu và hàm thuần phía TypeScript; không import React/Next/Supabase/browser. Flutter sử dụng kết quả qua API, không import TypeScript trực tiếp.
- `src/application`: use case như `recordExpense`, `transferFunds`, `executeTrade`, kiểm quyền, idempotency và transaction boundary.
- `src/server`: session, repository và adapter DB; chỉ server được import.
- `supabase/migrations`: SQL có phiên bản, RLS, constraints và RPC nguyên tử.
- `tests`: bổ sung theo nghiệp vụ; dữ liệu giả, không dùng tài chính thật.

Trang `[module]` giữ bản đồ phạm vi cho module chưa triển khai; vẫn yêu cầu đăng nhập. Thu nhập, Chi tiêu và Tiết kiệm có route, domain, API và migrations riêng; quy tắc module còn lại tiếp tục được làm rõ theo đặc tả.

## Ghi dữ liệu và API cho iOS

Đề xuất `/api/v1/accounts`, `/transactions`, `/budgets`, `/goals`, `/trades`, `/valuations`, `/reports` và `/imports`. Đây là các hợp đồng mở rộng dự kiến. Hiện đã có `/api/v1/income`, `/api/v1/expenses`, `/api/v1/savings`, `/api/v1/investments` và `/api/v1/funds`; các module có preview/commands, báo cáo tùy module. Viết OpenAPI/schema request-response trước khi app iOS dùng API.

Web dùng session cookie được xác minh phía server; native về sau dùng bearer access token đã kiểm chứng issuer/audience/expiry. Không tin `owner_id` từ request. Mọi use case lấy chủ sở hữu từ danh tính đã xác thực, kiểm quan hệ tài khoản/tài sản thuộc cùng chủ.

Lệnh thay đổi tiền có idempotency key, payload fingerprint và version. Gửi lại cùng key/cùng payload trả lại kết quả cũ; cùng key/khác payload báo xung đột. Ghi nhiều bảng phải đi qua **một DB transaction/RPC**; không gọi nhiều request Supabase độc lập rồi hy vọng tất cả cùng thành công. Không dùng service-role key cho request tài chính thông thường.

React Server Components có thể đọc trực tiếp qua application service khi đã kiểm quyền. Server Actions nếu dùng chỉ là adapter mỏng; các nghiệp vụ cần cho iOS luôn có API HTTP tương ứng. Không để iOS phụ thuộc giao thức Server Actions của web.

## Đồng bộ

P1: server là nguồn dữ liệu chuẩn; sau lệnh thành công thì refetch. Thiết bị khác cập nhật khi mở lại trang và refresh. Tổng quan/Chi tiêu/Thu nhập cập nhật ngầm khi quay lại foreground nếu lần tải thành công đã qua 60 giây; có mạng trở lại hoặc đổi ngày Asia/Ho_Chi_Minh được kiểm tra sớm hơn, với khoảng cách tối thiểu 5 giây giữa các lần tải tự động. Các sự kiện focus/visibilitychange/online dùng chung bộ điều phối riêng cho mỗi view, không tải trùng khi còn request. Lưu, thử lại, đổi năm Thu nhập và timer qua ngày vẫn đọc server ngay; nếu cần cập nhật tức thời, thêm Realtime có lọc quyền. Không coi việc bật Realtime là đã giải quyết xung đột.

P5: bản nháp/offline command có UUID, trạng thái chờ/đã gửi/thất bại, retry có idempotency; version ngăn ghi đè sửa đổi trên thiết bị khác. Xung đột phải cho người dùng chọn hoặc sửa lại, không âm thầm last-write-wins với tiền. Xóa cache dữ liệu riêng khi đăng xuất; xử lý cả khi token hết hạn, thiết bị offline hoặc người dùng đổi tài khoản.

## Hướng app iOS

Theo định hướng bổ sung ngày 15/10/2026: **dùng Flutter/Dart cho app iOS cá nhân**, không đặt mục tiêu phát hành App Store. Flutter là client riêng, dùng cùng HTTP API, Supabase Auth và database với web. Supabase có [SDK Flutter/Dart chính thức](https://supabase.com/docs/reference/dart/introduction).

Điểm cần điều chỉnh so với đề xuất React Native ban đầu: Flutter không dùng lại trực tiếp React components, TypeScript domain hoặc TypeScript API client. Phép tính tài chính và kiểm quyền được thực hiện tập trung trên backend; web/Flutter gọi API và hiển thị kết quả. Dart có model, form và client riêng; tiền/số lượng tiếp tục truyền bằng decimal string, không chuyển tiền sang double để tính.

Hợp đồng dùng chung là OpenAPI/JSON Schema và các kịch bản đầu vào/kết quả mong muốn; có thể sinh Dart client và TypeScript client từ cùng đặc tả. Kiểm tra đầu vào trên client giúp nhập liệu, nhưng server luôn xác thực và tính lại. Offline queue có triển khai riêng cho từng nền tảng, dùng chung quy tắc idempotency/version.

Khi bắt đầu native mới cân nhắc cấu trúc `apps/web`, `apps/mobile` (Flutter), `packages/api-contract`, và phần domain backend. Flutter dùng pub và Flutter toolchain riêng; không giả định npm build sẽ build luôn app iOS. Hiện giữ một app web gọn, chưa cài Flutter/Xcode hoặc tạo app mobile.

Để cài trực tiếp lên iPhone, cần Mac + Xcode, signing và thiết bị thật theo [Flutter iOS setup](https://docs.flutter.dev/platform-integration/ios/setup). Personal Team miễn phí cần ký/cài lại khi provisioning profile hết hạn sau 7 ngày; Developer Program trả phí hỗ trợ thêm cách phân phối. Các phương án và giới hạn được ghi trong [Deploy — cài trên iPhone](05-deployment.md#cài-trên-iphone-cá-nhân).

## Lựa chọn khác

| Phương án | Khi phù hợp | Đánh đổi |
| --- | --- | --- |
| Vite/React + API backend riêng | Đã có backend hoặc cần hai vòng release độc lập | Cần vận hành và cấu hình thêm một dịch vụ |
| Next.js + Postgres tự host | Người dùng ưu tiên quản trị hạ tầng | Tự lo TLS, cập nhật, Auth, backup, monitoring |
| IndexedDB/local-only | Chỉ một máy, ưu tiên dữ liệu không rời thiết bị | Không phù hợp lựa chọn cloud/đồng bộ đã xác nhận |

## Tài liệu kỹ thuật đã đối chiếu

- [Next.js installation](https://nextjs.org/docs/app/getting-started/installation): App Router, TypeScript và yêu cầu runtime.
- [Next.js PWA](https://nextjs.org/docs/app/guides/progressive-web-apps): manifest và service worker; đây là nền cho PWA trong source.
- [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/nextjs): cấu hình client/server cho session web khi triển khai Auth.
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security): kiểm soát truy cập trong PostgreSQL, cần kết hợp grants/policies và kiểm thử.
- [PostgreSQL numeric types](https://www.postgresql.org/docs/current/datatype-numeric.html): dùng kiểu số chính xác cho tiền/số lượng theo schema.
- [shadcn/ui với Next.js](https://ui.shadcn.com/docs/installation/next): hướng tích hợp component khi bắt đầu form/dialog.

## Đầu tư — 18/10/2026

Đầu tư có domain/application/repository/API/UI riêng, theo tổng danh mục VND và nhiều ví tiền chờ. Dùng lại cơ chế Auth, RLS, preview, advisory lock, version và idempotency của các module hiện có; không dùng engine vàng/sổ tiền gửi cho danh mục tổng tiền. Mua/bán là một command cập nhật vốn, định giá và ví trong cùng transaction. Sáu bảng mới giữ metadata có ngày, revisions giao dịch/định giá, audit và command; không có tháng chốt. Trang await kiểm tra truy cập server. Chi tiết [Đầu tư](features/investments.md).

Không tự nối số dư với các module khác hoặc tạo báo cáo tài sản ròng toàn ứng dụng. Migration cloud và kiểm chứng thiết bị thật là bước riêng.


## Bổ sung backup toàn tài khoản — 18/10/2026

API `/api/v1/data` và repository riêng đọc snapshot nhất quán, dùng runtime RLS hiện có. Import khóa bốn module theo thứ tự cố định, kiểm tra tài khoản trống sau khóa, ghi và đối soát trong một transaction kèm biên nhận idempotency. Hồ sơ Auth cập nhật riêng sau commit; xem [backup](features/backup.md).


### Rà soát tải backup và Cài đặt — 18/10/2026

Tách readiness của dữ liệu tài chính khỏi readiness của biên nhận import: export/status không đòi `data_imports`, status thêm `importReady`; chỉ import đòi migration biên nhận. Không giảm kiểm tra đầy đủ 28 bảng hoặc RLS. Xem đặc tả backup.


## Quỹ an toàn — 19/10/2026

Fund dùng domain/application/repository/API riêng tại `/api/v1/funds`; page chờ `pageAccess`. Command version/idempotency, RLS owner, lịch sử append-only. Đọc nguồn Chi tiêu trong cùng transaction và khóa Expenses → Fund. GET không khởi tạo dữ liệu. Client refetch khi foreground bằng helper hiện tại; không lưu tài chính trên thiết bị.

## Thành phần trải nghiệm dùng chung — 19/10/2026

Theme được áp dụng bằng script cố định trước first paint và đồng bộ qua storage/media events; HTML suppressHydrationWarning chỉ giới hạn ở thuộc tính root được script quản lý. Sidebar và cột bảng dùng storage chỉ cho UI preferences, không lưu bản nháp hay số tiền. Tooltip dùng chung giữ key điểm được chọn, format từ dữ liệu hiện hành để tránh lộ tiền sau toggle. Metadata logo dùng cột nullable riêng với RLS/command/version hiện có; xem [quy chuẩn](features/interface-feedback-2026-10-19.md).

## Tương thích schema logo Chi tiêu — 20/10/2026

Repository Chi tiêu đọc `brand_key`/`icon_key` bằng `to_jsonb` của hàng để cột metadata còn thiếu trở thành null. Khi lưu có phân loại, kiểm tra đủ hai cột qua `information_schema.columns` trong cùng transaction: schema cũ lưu các trường cũ; yêu cầu metadata khác null trả `LABEL_VISUALS_MIGRATION_REQUIRED` trước mọi ghi. Không nuốt lỗi SQL khác, không tự migrate, không đổi RLS/version/idempotency. Adapter dùng chung cho nguồn Fund hưởng cùng khả năng đọc tương thích; backup/import vẫn có yêu cầu schema riêng.

## Help theo trang — 20/10/2026

`src/features/help/` quản lý nội dung TypeScript, registry và controller `openHelp(pageId, sectionId?)`. Registry lấy tên/trạng thái từ catalog, thêm Hồ sơ; controller nằm bên trong SessionBoundary. Nội dung tải bằng dynamic import khi mở, có trạng thái tải/lỗi/thử lại, không gọi API tài chính. Route đổi hoặc session boundary gỡ nội dung sẽ đóng Help. Không thêm API, schema, migration hoặc lưu trạng thái Help vào storage.

Help dùng biến thể `help` của dialog chung, giữ cùng stack/inert, khóa cuộn và phục hồi focus khi mở trên form/dialog con. Trang private vẫn tự await pageAccess; public preview chỉ dùng nội dung minh họa cố định độc lập. Xem [đặc tả Help](features/help.md).


### Tinh chỉnh trình đọc Help — 20/10/2026

`HelpPageTitle` gắn nút theo pathname cạnh h1 của từng workspace và trang planned; không phụ thuộc tải dữ liệu nghiệp vụ. `HelpText` chỉ xử lý dấu nhấn biên tập thành React strong, giữ escape mặc định. Biến thể Help của ExpenseModal trì hoãn unmount khi đóng đến animationend hoặc timeout 300ms, dọn timer khi đổi route/unmount; các dialog khác giữ hành vi hiện có.

## Chủ đề độc lập với chế độ hiển thị — 21/10/2026

Danh sách `visualThemeKeys` dùng chung cho bộ chọn, kiểm tra giá trị và script trước paint; cấu hình `visualThemes` định nghĩa `VisualTheme = forest | water | gold | fire | earth`, màu thanh trình duyệt và lời dẫn. `fm-visual-theme` điều khiển `data-visual-theme`; `fm-theme` vẫn giữ light/dark/system để tương thích. PreferenceSync đọc snapshot hiện tại khi hydrate, script parser áp dụng lựa chọn trước lần vẽ đầu. CSS chọn các nhánh SVG/text cùng markup server/client, không remount workspace hay gọi API. Metadata theme-color do React quản lý; system mode dùng media theo color-scheme.

Tùy chọn lưu theo origin trình duyệt, dùng storage event để cập nhật các tab và sự kiện nội bộ cho cùng tab. Storage bị chặn thì giữ trong bộ nhớ phiên của tab. Không thêm cookie, API, migration hay dữ liệu vào backup. Offline HTML độc lập đọc cùng hai khóa; service worker v6 chỉ cache trang này, không cache tài khoản/API. Manifest và biểu tượng cài đặt giữ nhận diện thương hiệu cố định. Xem [themes](features/themes.md).

## Popover chọn cột — 21/10/2026

`ColumnPicker` dùng Popover API (`popover="auto"`, invoker `popoverTarget`) để giữ DOM trong đúng dialog/section mà vẫn nằm trên top layer, tránh clipping bởi overflow của bảng. Tọa độ fixed được tính theo nút mở, giới hạn viewport và cập nhật khi scroll/resize; danh sách bên trong có vùng cuộn riêng. Không portal sang body ngoài dialog đang modal. Trạng thái cột vẫn dùng `usePreference`; `ColumnTable.showColumnPicker=false` cho phép đặt nút bên ngoài bảng mà giữ cùng cơ chế lọc header/body/footer. Escape được xử lý ở popover để không lan sang dialog cha.

## Locale trong app — 22/10/2026

Layout app đọc cookie `fm-locale` bằng async `cookies()` và cung cấp cho `LocaleProvider`; từng page vẫn await kiểm tra quyền server. UI là `AppShell` client và các workspace giữ state qua context. Từ điển TypeScript tách module, có namespace; Help tiếng Anh tải khi mở. Formatter/parser nhận locale, giữ tiền nguyên/số lượng dạng chuẩn. API lỗi thêm metadata dịch tương thích; CSV nhận `locale`, JSON/backup không đổi. Không thêm bảng hoặc migration. Xem [ngôn ngữ và logo](features/localization.md).

## Vùng cuộn bảng và thanh tab — 23/10/2026

`ColumnTable` sở hữu `.column-table-scroll` nằm cạnh toolbar, nhận `scrollClassName` và `scrollLabel`; fallback nhãn lấy từ caption hoặc chuỗi Bảng dữ liệu đã dịch. Props của table và khóa `tableId` vẫn giữ nguyên. Các khung module chỉ giữ trình bày, không tạo thêm scroller. `ScrollTabs` giữ semantics của div/nav, dùng MutationObserver/ResizeObserver để đưa mục được chọn vào vùng nhìn thấy bằng cuộn ngang nội bộ, ưu tiên nút đang focus khi điều hướng bàn phím và cập nhật theo kích thước các nhãn sau đổi ngôn ngữ. Không sửa API tài chính hay schema. Xem [quy chuẩn UI](features/ui-feedback.md).
