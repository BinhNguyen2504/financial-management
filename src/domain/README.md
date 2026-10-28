# Nghiệp vụ tài chính

Nơi đặt kiểu dữ liệu, kiểm tra đầu vào và hàm tính toán thuần TypeScript khi đặc tả từng tính năng được xác nhận. Không phụ thuộc React, Next.js, Supabase hoặc API trình duyệt; có thể dùng chung trong backend và các phần TypeScript của web.

App iOS dự kiến dùng Flutter/Dart. Flutter không import trực tiếp package TypeScript này: backend thực hiện nghiệp vụ và cung cấp kết quả qua HTTP API. Hai client dùng chung hợp đồng dữ liệu và kịch bản kiểm thử; model, form và API client Dart được triển khai hoặc sinh riêng.

Module `expenses/` đã triển khai công thức hũ chi tháng/tích lũy, cấu hình theo kỳ, chuyển dư và chốt năm bằng BigInt. Có kiểm thử nghiệp vụ, PostgreSQL và trình duyệt local. Mô hình cho các module còn lại vẫn nằm trong `docs/03-data-model.md`. Các số liệu trong ảnh không phải seed data. Mọi thay đổi số tiền, giá vốn, phân bổ và đồng bộ phải có kiểm thử nghiệp vụ khi được triển khai.

Module `income/` quản lý thực nhận danh mục–tháng và khoản thu phát sinh, cấu hình tên/trạng thái theo tháng hiệu lực, báo cáo dùng BigInt. Thu nhập hoạt động độc lập với Chi tiêu và tài khoản. Xuất CSV có bản dịch nằm ngoài domain ở `src/i18n/report-exports/`.

Module `investments/` quản lý tổng danh mục VND và nhiều ví tiền chờ, mua/bán với vốn bán nhập tay, định giá, revisions và báo cáo xuyên năm. Độc lập với `savings/`; không có mã/lô hoặc chốt tháng. Giao dịch và các mốc lưu trữ được kiểm tra lại khi sửa quá khứ.

## Bổ sung backup toàn tài khoản — 18/10/2026

Module `backup/` định nghĩa FullBackup V2, allowlist 35 bảng (nhận cả V1), schema nghiêm ngặt và kiểm tra liên kết/replay trước khôi phục. Domain không đọc DB/Auth; `profile.ts` giữ validator hồ sơ dùng chung. Xem `docs/features/backup.md`.

Module `funds/` tính living expense, mục tiêu, số dư theo quỹ/nơi giữ và replay phiên bản giao dịch bằng BigInt; source Chi tiêu chỉ đọc. Validate dựng lại audit trước restore.

## Tổ chức source — 28/10/2026

`shared/` chứa Clock, ngày/tháng, phép cộng tiền nguyên và các schema primitive. Chi tiêu giữ biến thể schema/thông báo riêng để không đổi validation cũ. Tiết kiệm và Đầu tư tách `model.ts` (kiểu hành vi/selector và lỗi), `replay.ts` (dựng lại trạng thái từ lịch sử) và `engine.ts` (áp command và entrypoint tương thích). Không nhập framework, browser, UI hoặc i18n vào domain. Các liên hệ Quỹ–Chi tiêu và backup–các module là nghiệp vụ có chủ đích.

Fingerprint backup vẫn giữ comparator riêng; fingerprint command thuộc application và không được thay thế lẫn nhau. Xem [hướng dẫn bảo trì source](../../docs/11-source-maintenance.md).
