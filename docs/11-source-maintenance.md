# Bảo trì source và thêm module

Refactor ngày 28/10/2026 giữ UI/UX, quy tắc tài chính, HTTP API v1, schema database, CSV và backup hiện có. Đây là tổ chức source và công cụ phát triển; không triển khai cloud hoặc ứng dụng Flutter.

## Trách nhiệm và chiều phụ thuộc

| Khu vực | Trách nhiệm |
| --- | --- |
| `app` | Route/page, metadata và chuyển HTTP request/response; từng page private await `pageAccess` trước workspace |
| `features/<module>` | State giao diện, bản nháp, form và cách trình bày module |
| `domain/<module>` | Validation nghiệp vụ, tính toán và lịch sử thuần TypeScript; không phụ thuộc framework/UI/i18n |
| `domain/shared` | Primitive có cùng nghĩa giữa các module; giữ biến thể validation cũ khi khác thông báo/quy tắc |
| `application` | Preview/command, version, idempotency và repository interfaces; phụ thuộc domain |
| `server` | Xác minh danh tính, HTTP boundary, SQL adapter, transaction và RLS |
| `i18n/report-exports` | Dịch CSV; nhận kết quả báo cáo domain, không tính lại nghiệp vụ |

Quỹ sử dụng source Chi tiêu; backup kiểm tra các module. Hai quan hệ này là nghiệp vụ thật, không chuyển vào một engine tổng quát. Component trình bày dùng chung đặt trong components; tránh nhập editor để lấy nhãn/type, dùng editor-config của module.

## Editor và workspace

- `editor-config`: mode, tên giao dịch và tiêu đề; không import component/hook.
- `editor-action`: chuyển draft thành action, giữ ID/thời điểm/decimal string; không gửi HTTP hoặc sửa draft. ID tạo mới của Chi tiêu được truyền qua callback.
- `use-…-editor`: sở hữu draft, preview, command đang chờ, submit, lỗi/conflict/uncertain và retry cùng ID. Các thao tác reload sau conflict và lưu phân loại lồng nhau nằm tại đây.
- `editor-fields` và `editor-preview`: trình bày từ controller; không sở hữu bản sao state tài chính. `editor` ghép dialog, form, footer và các phần này.
- `use-…-workspace`: tải dữ liệu, chọn kỳ, lọc và tạo view; `workspace` trình bày. Không áp thêm foreground refresh cho module chỉ vì chúng dùng cùng mẫu cấu trúc.

Native Modal dùng chung giữ một dialog stack, inert, scroll lock, chuyển focus và toast viewport. Alias ExpenseModal vẫn được giữ cho import cũ. Hồ sơ tách form khỏi workspace; Settings tách controller backup/restore khỏi phần hiển thị; Help tách provider khỏi panel. Nội dung landing/Help và các component nhỏ được giữ theo trách nhiệm hiện có.

## Hợp đồng cần giữ khi tái sử dụng

- HTTP client giữ wrapper và error class từng module. Chi tiêu có chính sách status cho lỗi transport khác bốn module còn lại; HTTP error vẫn giữ status ngay cả khi code trùng tên lỗi transport. Serialize request nằm trong cùng error boundary như trước.
- HTTP route dùng chung headers, kiểm origin, đọc JSON và ánh xạ lỗi; endpoint, filter, thông báo và schema vẫn thuộc module. Quỹ giữ full-path field errors và chính sách Content-Length cũ. Backup giữ parser streaming, giới hạn byte và Auth riêng.
- Repository dùng chung việc đặt role/claims, nhưng tự giữ kiểm owner/schema và khóa theo nghiệp vụ. Quỹ kiểm migration rồi khóa Chi tiêu trước Quỹ; restore giữ thứ tự khóa toàn cục và transaction; snapshot backup giữ isolation riêng.
- Command fingerprint dùng `localeCompare` như trước. Backup fingerprint dùng comparator theo thứ tự ký tự như trước. Thay đổi một trong hai có thể làm retry/import cũ xung đột; không gộp hai thuật toán.
- Tiền vẫn là BigInt/decimal string; đơn vị vàng, dữ liệu lưu, JSON backup và định dạng số chuẩn trong CSV không đổi. Locale/theme/privacy không reset draft hoặc đổi ý nghĩa tài chính.
- `experience.css` là entrypoint của các phần CSS được import theo thứ tự. Giữ vị trí và specificity khi chuyển rule giữa các phần; không gom các rule tương tự bằng cách thay đổi cascade.

## Công cụ và cách kiểm tra

```bash
nvm use
npm ci
npm run check
npm run test:db
TEST_FIREFOX=1 TEST_WEBKIT=1 npm run test:e2e
```

`check` gồm ESLint, kiểm kiến trúc, Prettier, unit, TypeScript và production build. CI hiện có gọi cùng lệnh, sau đó chạy PostgreSQL integration. Browser là lượt kiểm tra riêng, dùng production build cô lập, PostgreSQL local và Auth double; không dùng tài khoản/cloud thật. Đặt output/log riêng nếu chạy nhiều runner.

Kiểm tra kiến trúc dùng TypeScript Compiler API để resolve alias, re-export và dynamic import. Type import được phân biệt với runtime; domain/application vẫn phải tuân thủ chiều phụ thuộc khi chỉ nhập type. Runtime cycle và client kéo server/Node code bị chặn. Guard page được tìm trong default page function, không chấp nhận await trong callback lồng nhau làm bằng chứng bảo vệ trang.

ESLint dùng flat config của Next.js và TypeScript. Các ngoại lệ cục bộ có giải thích để giữ lịch hydration, account reset, foreground refresh, native dialog và browser preferences đã được kiểm chứng. Không bật React Compiler hoặc thay đổi lịch effect để vượt lint. Node giữ baseline 22.12; `typescript-eslint` trong eslint-config-next được khóa 8.55.0 qua override để tránh visitor-keys 5 yêu cầu Node 22.13. Khi nâng runtime/lint, kiểm tra lại override và lockfile cùng nhau.

## Thêm module tài chính

1. Chốt quy tắc nghiệp vụ và HTTP contract. Tạo types/schema/engine/report trong domain; chỉ đưa primitive thực sự có cùng nghĩa vào shared.
2. Thêm application use case và repository interface. Giữ preview không ghi, version check và idempotency; dùng command fingerprint chung.
3. Thêm SQL migration/RLS và repository adapter có khóa, owner và rollback rõ ràng; giữ quyền migration tách khỏi runtime. Không áp migration hoặc seed cloud từ UI.
4. Thêm route mỏng dùng HTTP helpers khi phù hợp; giữ adapter riêng khi cần streaming, giới hạn hoặc lỗi khác như backup.
5. Xây feature theo cấu trúc editor/workspace ở trên; mỗi page private await `pageAccess`. Tái sử dụng dialog, feedback, input và bảng trước khi thêm primitive khác.
6. Cập nhật catalog, landing/preview minh họa, README và đặc tả tương ứng. Preview dùng dữ liệu cố định; trạng thái source không chứng minh cloud hoặc thiết bị thật.
7. Kiểm nghiệp vụ, API, RLS/idempotency và browser flow liên quan; chạy toàn bộ bộ kiểm tra trước khi hoàn tất. So sánh hình học/ảnh khi DOM hoặc CSS thay đổi.

## Bằng chứng và vấn đề có trước

Chi tiết lượt kiểm tra nằm trong [validation](07-validation.md). Artifacts đợt này ở `artifacts/refactor/`, đã loại khỏi Git. Baseline source là commit `d795ad7`; working tree sạch tại thời điểm bắt đầu.

Baseline browser phát hiện ba ca nhiều phiên xin lại OTP trong cooldown của Auth double. Fixture dùng chung mới chỉ mở lại quyền gửi trên double local cho các ca này; bộ auth-otp tiếp tục kiểm giới hạn gửi lại. Assertions về session, conflict, dữ liệu và tiền được giữ.

Baseline cũng ghi nhận chuỗi lỗi giả lập “Mạng kiểm thử tạm gián đoạn” hiển thị thành “Tạng kiểm thử tạm gián đoạn” trong bộ dịch hiện tại. Hành vi dịch này được giữ ngoài phạm vi refactor; fixture foreground refresh dùng thông báo “Kết nối kiểm thử tạm gián đoạn” để kiểm đúng mục tiêu lỗi tải/bảo toàn draft. Không coi thay fixture là đã sửa vấn đề dịch thông báo tùy ý.

## Cập nhật trải nghiệm — 28/10/2026

Đợt chuẩn hóa nội dung/giao diện bổ sung MonthYearSelect, MobileNavigation, token typography và giới hạn dialog theo visualViewport. HTTP giữ mã/status và định dạng dữ liệu; client đổi cách trình bày lỗi hạ tầng. Bộ dịch đã giới hạn mẫu tháng rút gọn T{0}/M{0} ở số tháng 1–12, khắc phục lỗi chuỗi tự do “Mạng…” bị nhận nhầm và đổi thành “Tạng…” được ghi nhận trong baseline ở trên. Xem [đặc tả và bằng chứng](features/usability-consistency-2026-10-28.md).
