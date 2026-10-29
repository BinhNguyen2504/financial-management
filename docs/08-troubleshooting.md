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
