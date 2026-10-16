# Kiến trúc và công nghệ đề xuất

**Module Chi tiêu đã có source:** Supabase SSR/Auth, API v1, Zod, Postgres.js và transaction/RLS; native form/dialog, biểu đồ HTML/SVG, Vitest/Playwright. Connection server dùng role expense_api và JWT claims theo owner đã xác minh. Chi tiết triển khai và khác biệt so với các công nghệ còn dự kiến bên dưới nằm ở [đặc tả Chi tiêu](features/expenses.md). Chưa deploy hoặc kết nối Supabase thật.

## Quyết định chính

Dùng một codebase web và backend theo module, tránh tách microservice ở quy mô cá nhân. Tách nghiệp vụ tài chính khỏi framework; cung cấp HTTP API có phiên bản để PWA và iOS dùng chung. Stack cloud bên dưới là đề xuất kỹ thuật, chưa tạo tài nguyên hoặc kết nối tài khoản dịch vụ.

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
| Web và API | Next.js App Router + React + TypeScript strict | Routing, rendering và HTTP API trong cùng source; dễ triển khai và tách service về sau | Đã cài và dựng khung |
| Styling | Tailwind CSS 4 + CSS semantic tokens | Giao diện responsive, theme và tái sử dụng style | Đã cài; shell dùng CSS tokens |
| Components | shadcn/ui, bổ sung khi có dialog/form/table thực tế | Sở hữu source component và chuẩn hóa hành vi truy cập | Chưa cài |
| Icon | Lucide React | Cùng một bộ SVG có nhãn đi kèm | Đã dùng |
| Forms | React Hook Form + Zod | Form ít render lại; schema kiểm tra dùng ở cả client/server | Dự kiến P1 |
| Biểu đồ/bảng | Recharts + TanStack Table | Biểu đồ tương tác và lọc/sắp xếp; thêm khi có dữ liệu | Dự kiến theo module |
| Số học | bigint cho tổng tiền VND và/hoặc decimal.js cho giá/số lượng | Tránh mất chính xác từ float; quyết định theo hợp đồng dữ liệu | Chưa cài/triển khai |
| Database | PostgreSQL qua Supabase, SQL migrations | Quan hệ, ràng buộc và transaction; dữ liệu dễ xuất | Chưa kết nối |
| Auth | Supabase Auth + `@supabase/ssr` cho web | Danh tính dùng chung web/iOS, session và RLS | Chưa cài |
| Client dữ liệu | `@supabase/supabase-js`; gọi DB từ server với token người dùng | RLS vẫn được áp dụng; hạn chế dependency | Dự kiến P1 |
| PWA | Manifest của Next.js + service worker giới hạn phạm vi | Bắt đầu nhẹ, offline fallback; hàng đợi offline bổ sung sau | Nền PWA đã dựng |
| Kiểm thử | Vitest, DB integration/RLS, Playwright | Kiểm công thức, transaction, quyền và tác vụ nhiều thiết bị | P0 typecheck/build và browser smoke; test nghiệp vụ thêm theo module |
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

P0 chỉ tạo những thư mục có nội dung. Trang `[module]` hiện là bản đồ phạm vi; khi triển khai, thay bằng route cụ thể và module tương ứng. Chưa tạo schema SQL vì quy tắc tiền/quỹ/nợ/đầu tư còn mở.

## Ghi dữ liệu và API cho iOS

Đề xuất `/api/v1/accounts`, `/transactions`, `/budgets`, `/funds`, `/goals`, `/trades`, `/valuations`, `/reports` và `/imports`. Đây là hợp đồng dự kiến, **chưa có endpoint tài chính hoạt động**. Khi làm P1, viết OpenAPI/schema request-response trước khi app iOS dùng API.

Web dùng session cookie được xác minh phía server; native về sau dùng bearer access token đã kiểm chứng issuer/audience/expiry. Không tin `owner_id` từ request. Mọi use case lấy chủ sở hữu từ danh tính đã xác thực, kiểm quan hệ tài khoản/tài sản thuộc cùng chủ.

Lệnh thay đổi tiền có idempotency key, payload fingerprint và version. Gửi lại cùng key/cùng payload trả lại kết quả cũ; cùng key/khác payload báo xung đột. Ghi nhiều bảng phải đi qua **một DB transaction/RPC**; không gọi nhiều request Supabase độc lập rồi hy vọng tất cả cùng thành công. Không dùng service-role key cho request tài chính thông thường.

React Server Components có thể đọc trực tiếp qua application service khi đã kiểm quyền. Server Actions nếu dùng chỉ là adapter mỏng; các nghiệp vụ cần cho iOS luôn có API HTTP tương ứng. Không để iOS phụ thuộc giao thức Server Actions của web.

## Đồng bộ

P1: server là nguồn dữ liệu chuẩn; sau lệnh thành công thì refetch. Thiết bị khác cập nhật khi mở lại trang, quay lại foreground và refresh; nếu cần cập nhật tức thời, thêm Realtime có lọc quyền. Không coi việc bật Realtime là đã giải quyết xung đột.

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
