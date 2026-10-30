# Xử lý lỗi phát triển local

## Tải bản sao lưu báo tính năng chưa sẵn sàng — 29/10/2026

Đã kiểm tra chỉ đọc database mà source local đang cấu hình: runtime là `expense_api`, không có quyền CREATE; truy vấn xuất trực tiếp `expense_labels.brand_key` trả PostgreSQL `42703`, hai cột `brand_key`/`icon_key` chưa tồn tại. Thông báo chung ở Cài đặt không đủ để tự kết luận nguyên nhân; kết quả này đến từ truy vấn schema và projection thực tế.

Repository sao lưu hiện đọc riêng hai trường tùy chọn qua `to_jsonb` của hàng, trả null khi cột chưa có và giữ nguyên metadata khi cột tồn tại. Sau sửa, xuất V2 đọc đủ 35 bảng trên cùng database bằng owner giả không có dữ liệu, chỉ trong transaction read-only. Đây chưa phải kiểm chứng file của tài khoản thật hoặc phiên trình duyệt người dùng.

Tải lại source hiện tại rồi vào **Cài đặt → Tải bản sao lưu**. Nếu dùng `npm start`, cần build và khởi động lại. Không cần chạy migration để xuất khi chỉ thiếu hai cột này. Nếu khôi phục file có logo/icon khác null vào schema cũ, import trả `SCHEMA_NOT_READY` trước mọi ghi; cần migration `202610190002_label_visuals.sql` qua công cụ admin để giữ đủ metadata. Không bỏ qua bảng tài chính hoặc lỗi SQL khác, không tự migrate và không đổi quyền runtime.

## Chi tiêu báo STORAGE_UNAVAILABLE khi thiếu migration logo — 20/10/2026

Trên cấu hình local được kiểm tra ngày 20/10, kết nối PostgreSQL thành công nhưng bảng `expense_labels` thiếu `brand_key` và `icon_key`. Truy vấn dùng trực tiếp cột mới trả PostgreSQL `42703` (undefined column), được API chuyển thành `STORAGE_UNAVAILABLE`. Đây là kết quả kiểm tra schema và truy vấn chỉ đọc, không phải suy đoán từ ảnh lỗi mạng.

Source đã sửa để đọc metadata tùy chọn qua JSON của hàng và lưu theo schema thực tế: hũ và phân loại không có logo/icon tùy chọn vẫn sử dụng được. Tải lại `/budgets` hoặc nhấn **Thử tải lại** trên dev server đang chạy source hiện tại. Nếu đang chạy `npm start`, cần build lại bản source mới trước khi khởi động lại.

Để lưu logo/icon tùy chọn, áp dụng **một lần** file `supabase/migrations/202610190002_label_visuals.sql` bằng kết nối migration/admin hoặc Supabase SQL Editor, sau các migration trước đó. File chỉ thêm hai cột nullable và ràng buộc độ dài, không seed/reset dữ liệu. App không tự thực thi migration và không cần cấp CREATE cho `expense_api`. Nếu chưa áp dụng, thao tác lưu metadata báo `LABEL_VISUALS_MIGRATION_REQUIRED` và giữ bản nháp thay vì âm thầm bỏ logo/icon.

Không mặc định mọi `STORAGE_UNAVAILABLE` đều do migration này: nếu lỗi vẫn còn với source mới, tiếp tục kiểm tra kết nối/schema tương ứng. Local có thể dùng database cloud qua `.env.local`; vị trí chạy app không chứng minh database cũng là local. Lượt sửa này không ghi dữ liệu hoặc migrate database đang cấu hình, không deploy và không kiểm tra phiên trình duyệt thật của người dùng.

## Hydration mismatch với `cz-shortcut-listen="true"`

Ảnh lỗi ngày 15/10/2026 chỉ ra thuộc tính ngoài dự kiến trên `<body>`:

```text
<RootLayout>
  <html lang="vi">
    <body
-     cz-shortcut-listen="true"
    >
```

Source `src/app/layout.tsx` không tạo thuộc tính này. Đây là dấu hiệu DOM bị sửa trước khi React hydrate; extension trình duyệt là nguyên nhân phù hợp với bằng chứng. Nếu đang cài ColorZilla, kiểm tra extension đó trước. Chưa trực tiếp kiểm tra danh sách extension của trình duyệt người dùng nên không khẳng định tên extension chỉ từ ảnh.

Cách khắc phục trên trình duyệt đang gặp lỗi:

1. Tắt ColorZilla nếu đang cài, hoặc bỏ quyền chạy trên `localhost`/site này. Nếu vẫn còn, kiểm tra các extension có quyền chỉnh sửa trang khác.
2. Tải lại trang bằng Cmd+Shift+R trên Mac.
3. Kiểm tra bằng profile trình duyệt sạch hoặc cửa sổ ẩn danh **với extension đã tắt**. Extension có thể được cho phép chạy ẩn danh, nên chỉ mở ẩn danh chưa đủ đảm bảo sạch.
4. Nếu chỉ profile có extension bị lỗi, bật lại từng extension để xác định. Khi đó giữ extension gây lỗi tắt trên site khi phát triển.

Kiểm chứng đã thực hiện trên dev server hiện có tại `http://127.0.0.1:3000/overview`, bằng các browser context tách biệt:

| Điều kiện | Thuộc tính trên body | Hydration error |
| --- | --- | --- |
| Context sạch | Không có | 0 |
| Giả lập chèn thuộc tính bằng init script trước React | `cz-shortcut-listen="true"` | 1, cùng thông báo như ảnh |
| Context sạch kiểm lại | Không có | 0 |

Không thêm `suppressHydrationWarning` hoặc tắt SSR để che cảnh báo do extension này. Thuộc tính thêm không cần thiết được xử lý ở nguồn can thiệp; giữ cảnh báo để phát hiện lỗi thật trong source về sau. Chưa thay đổi/tắt extension trong profile của người dùng.

Nếu browser sạch vẫn lỗi với diff khác, lấy diff mới và kiểm tra phần tương ứng: giá trị thời gian/random, locale, dữ liệu SSR/client và HTML nesting. Không mặc định mọi hydration error đều do cùng nguyên nhân.

Tham khảo: [Next.js hydration error — browser extensions modifying HTML](https://nextjs.org/docs/messages/react-hydration-error).


## Kiểm chứng lại ảnh lỗi — 18/10/2026

Đã kiểm tra source hiện tại và tái hiện trên dev server `http://127.0.0.1:3000/login` bằng Chrome/Playwright với ba context tách biệt, service worker bị chặn:

| Điều kiện | Thuộc tính trên body | Hydration error |
| --- | --- | --- |
| Context sạch | Không có | 0 |
| Chèn thuộc tính trước hydration | `cz-shortcut-listen="true"` | 1, diff chứa đúng thuộc tính |
| Context sạch kiểm lại | Không có | 0 |

Bằng chứng local: `artifacts/hydration-extension-2026-10-18.json`. Điều này xác nhận việc chèn thuộc tính có thể gây đúng lỗi trong ảnh; không xác định trực tiếp extension đã cài trong profile người dùng. Cần tắt quyền extension trên origin đang dùng (localhost, 127.0.0.1 hoặc site tương ứng), rồi Cmd+Shift+R; ưu tiên kiểm tra ColorZilla nếu có. Không sửa thiết lập profile người dùng hoặc thêm suppressHydrationWarning.


## Nhấn tải backup nhưng không có file — 18/10/2026

Nếu database đủ 28 bảng tài chính nhưng chưa có migration biên nhận import, trước đây API status/export dùng chung preflight khiến nút tải bị khóa. Đã tách readiness: thiếu `data_imports` chỉ khóa import; không cần chạy migration này để tải backup. Không bỏ qua module tài chính còn thiếu.

Trang Cài đặt báo lỗi ngay trong thẻ Sao lưu dữ liệu. Khi file đã sẵn sàng mà trình duyệt chưa bắt đầu tải, dùng **Lưu file JSON**. Blob không bị thu hồi sau một giây nữa; URL được giữ đến khi thay file hoặc rời trang. Với preview local được sao chép sang `artifacts/browser-app-*`, cần mở source hiện tại hoặc khởi tạo lại preview để thấy bản sửa; reload một bản preview cũ không cập nhật source sao chép.

### Khôi phục bị chặn dù danh sách/số dư trống — 29/10/2026

Mở Cài đặt → Khôi phục để xem chi tiết phân hệ còn sổ/cấu hình/lịch sử. Dữ liệu đã hủy/xóa và kỳ cũ vẫn tính; xóa giao dịch không làm tài khoản trống. Dùng tài khoản trống hoặc làm trống có sao lưu bắt buộc. `RESET_DATA_CHANGED` yêu cầu backup mới; `RESET_EXPIRED` quá 15 phút; `DATA_GENERATION_CHANGED` nghĩa phiên đang dùng dữ liệu trước reset, cần tải lại trang. Mất phản hồi thì retry cùng yêu cầu. Thiếu migration reset chỉ chặn reset, không chặn backup. Migration reset phải chạy sau đủ 5 module/data_imports; kiểm thử trạng thái pre-Fund cố ý không áp dụng migration phụ thuộc Fund này.

### Lỗi `42P01: relation public.data_imports does not exist` khi áp dụng reset — 29/10/2026

Database chưa có bảng biên nhận import. Chạy **toàn bộ** `supabase/migrations/202610180002_data_imports.sql` trước, sau đó chạy **toàn bộ** `supabase/migrations/202610290002_financial_data_reset.sql` mới nhất. Không chỉ chạy câu CREATE TABLE riêng: migration biên nhận còn thiết lập RLS, grants và trigger bảo vệ. Hai migration chuẩn bị schema, không gọi hàm xóa và không xóa dữ liệu tài chính.

File reset hiện kiểm tra `data_imports` ngay đầu trước mọi DDL; nếu thiếu, trả `FINANCIAL_RESET_PREREQUISITE_MISSING` kèm tên migration phải chạy trước. Nếu một lần chạy cũ được thực hiện theo từng statement, kiểm tra đọc trước bằng `select to_regclass('public.data_imports'), to_regclass('public.data_generations'), to_regclass('public.data_resets'), to_regprocedure('public.reset_financial_data(uuid,uuid)');`. Nếu xuất hiện lỗi bảng đã tồn tại, cần kiểm tra trạng thái schema/biên nhận migration; không DROP bảng để chạy lại. Chưa thao tác database cloud trong lần sửa này.

### Lỗi `42501: must be able to SET ROLE financial_data_reset` — 29/10/2026

Migration trước thiếu quyền SET ROLE khi chuyển owner hàm. PostgreSQL 16+ tách ADMIN/SET/INHERIT; trên Supabase, `postgres` không phải superuser và membership ADMIN do bootstrap cấp có thể không cho SET ROLE. Xem [Supabase](https://supabase.com/kb/troubleshooting/cant-revoke-a-role-membership-granted-by-supabase_admin) và [ALTER FUNCTION](https://www.postgresql.org/docs/16/sql-alterfunction.html).

Chạy lại toàn bộ bản mới nhất `supabase/migrations/202610290002_financial_data_reset.sql` bằng kết nối migration/admin. File cấu hình ACL trước khi chuyển owner, cấp SET tạm cho đúng `current_user` nếu cần và thu hồi trong cùng DO block. PostgreSQL 16+ chỉ thay đổi grant do chính migration actor tạo; giữ ADMIN/INHERIT và grant bootstrap hiện có. Bản trước 16 dùng membership tạm tương ứng. Không cấp role reset cho runtime; không cấp superuser/BYPASSRLS, không tắt RLS/trigger và không DROP dữ liệu để sửa lỗi. Nếu đã chạy từng phần thay vì toàn file và gặp bảng đã tồn tại, cần kiểm tra schema trước khi tiếp tục.

## Sửa quyền Auth khi làm trống — 30/10/2026

Database Supabase đang cấu hình đã được kiểm tra **chỉ đọc metadata**: PostgreSQL `170011`, hàm reset thuộc role `financial_data_reset` và SECURITY DEFINER; role có quyền thực thi `auth.uid()` nhưng **không có USAGE trên schema auth**. Hàm cũ gọi `auth.uid()` ngay khi khai báo owner, gây lỗi 42501 trước DELETE. Cấp USAGE Auth bằng role postgres trên Supabase không có grant option nên có thể chỉ trả warning và không thay quyền. Xem [hướng dẫn Supabase](https://supabase.com/kb/troubleshooting/permission-errors-when-granting-custom-roles-access-to-the-auth-schema). Không chạy reset hoặc thay schema/data trên database đích trong lượt chẩn đoán này.

Áp dụng **toàn bộ** migration mới `supabase/migrations/202610300001_reset_owner_claims.sql` bằng SQL Editor/admin, sau migration reset ngày 29/10 đã có. Đây là forward repair cho database đang có bảng/hàm reset; không chạy lại CREATE TABLE của migration cũ. File không gọi thao tác xóa. Sau đó tải lại Cài đặt, tạo bản sao lưu mới nếu bước xác nhận đã hết hạn rồi thực hiện thao tác có xác nhận.

Helper `financial_request_owner()` là SECURITY INVOKER/STABLE, search_path rỗng, đọc sub từ `request.jwt.claims` mà server đã xác minh và đặt trong transaction; ngoài session `expense_api` trả null. Helper không đọc schema Auth. Reset/fingerprint/nhánh trigger bảo vệ lịch sử và các policy `reset_owner_access` dùng helper này; policy cho authenticated vẫn giữ Auth hiện có. Giữ nguyên FORCE RLS, owner đích và kiểm tra session runtime. Helper không cấp EXECUTE cho public/anon/service_role, không cấp role authenticated cho role reset và không dùng BYPASSRLS.

Migration sửa hàm definer dưới đúng role chủ sở hữu bằng quyền SET/CREATE tạm và khôi phục membership/schema privilege trước đó. Hỗ trợ chạy lại, giữ nguyên dữ liệu, receipt, fingerprint và request đang chờ. Không đổi JSON backup hoặc command/API payload.

SQLSTATE 42501 trong transaction reset trả `RESET_PERMISSION_REQUIRED` và thông báo: hệ thống chưa đủ quyền xử lý, dữ liệu chưa bị xóa. Transaction đã rollback nên UI cho đóng hộp thoại; không coi lỗi quyền đã xác định là mất xác nhận. Lỗi mạng/phản hồi mất hoặc không xác định vẫn giữ request/operation cho retry đúng yêu cầu.
