# Báo cáo chung — 02/11/2026

Trạng thái: triển khai source; validation local ghi riêng trong docs/07-validation.md. Không suy ra đã triển khai cloud, real Auth/RLS hoặc kiểm thử thiết bị vật lý.

## Xem và đối chiếu

Mở `/reports`, mặc định Tổng hợp/tháng hiện tại. Có tab Thu–chi, Tiết kiệm, Đầu tư, Quỹ an toàn, Mục tiêu. Chọn tháng/quý/năm, URL giữ lựa chọn khi tải lại hoặc quay về. Các kỳ nằm trong một năm, kỳ trước có thể thuộc năm trước. Không có khoảng ngày tùy chọn hoặc báo cáo nhiều năm trong một kỳ.

Mọi số trong kỳ hiện tại dừng tại hôm nay theo Asia/Ho_Chi_Minh. Tháng chưa diễn ra không trở thành thực tế. Kỳ chưa kết thúc vẫn so với toàn bộ kỳ trước và có nhãn rõ, không chia số tháng theo tỷ lệ ngày. Chênh lệch tuyệt đối tính bằng BigInt; phần trăm chỉ có khi mốc trước dương. Giá trị 0 khác chưa nhập, thiếu định giá hoặc nguồn lỗi; dữ liệu chưa đầy đủ có cảnh báo.

Bấm chỉ số để xem các dòng đóng góp vào số đó; 20 dòng/trang, chỉ đọc. Giá trị cuối kỳ đối chiếu với vị thế/số dư, dòng tiền đối chiếu giao dịch. Nếu nguồn thay đổi, cập nhật báo cáo trước khi xem chi tiết. Nút sang module gốc dành cho điều chỉnh. Bảng có sắp xếp, phân trang; CSV không bị cắt theo trang bảng.

## Ý nghĩa số liệu

- Thu nhập dùng tổng tháng đã ghi nhận, phân biệt cố định/phát sinh và khoản chưa nhập.
- Chi tiêu dùng materialize sổ hũ: chi tháng suy từ tiền có trừ dư cuối; hũ tích lũy dùng các lần sử dụng. Tiền góp hũ không phải thực chi. Năm đã chốt đọc snapshot; năm cũ chưa chốt mang nhãn có thể thay đổi. API báo cáo riêng của Chi tiêu vẫn giữ phạm vi năm hiện tại.
- Chênh lệch theo sổ = Thu nhập đã ghi nhận − Chi tiêu theo sổ hũ. Đây chưa phải số dư tài khoản hoặc tiền có thể sử dụng; không tự nhận diện/loại trùng các khoản giữa module.
- Tiết kiệm giữ nghiệp vụ đầu/cuối kỳ, nạp/rút bên ngoài, kết quả trong kỳ và phân bổ theo danh mục; không dùng giá tương lai, giá cũ có cảnh báo.
- Đầu tư: tổng = tài sản đang giữ + tiền chờ; lãi/lỗ = giá trị tài sản − giá vốn phần đang giữ. Bán hết trả giá vốn/giá trị tài sản/lãi lỗ về 0, giữ tiền trong ví. Không trình bày lãi đã bán.
- Quỹ an toàn: giải quyết bản sửa/hủy mới nhất trước, rồi lọc ngày giao dịch theo giờ Việt Nam. Số đầu/cuối kỳ replay riêng; mục tiêu theo cấu hình đã xác nhận tại cuối kỳ. Góp/rút loại số dư ban đầu và chuyển nội bộ. Chuyển giữa quỹ/nơi giữ giữ nguyên tổng.
- Mục tiêu dùng tiến độ hiện tại, ghi thời điểm cập nhật, kể cả đang xem kỳ cũ. Không dựng lịch sử tiến độ và không cộng Mục tiêu liên kết vào tài sản nguồn.

Các sổ độc lập không cộng thành tài sản ròng. Báo cáo không có ghi sổ, chuyển tiền, dự báo lợi nhuận, PDF hoặc tự chốt kỳ.

## API và an toàn dữ liệu

GET `/api/v1/reports?tab=summary&period=month&year=2026&month=11` trả report query, period/from/to/asOf/partial/future, previousPeriod, generatedAt, versions, sources, warnings, metrics và tables. Tab là summary|cashflow|savings|investments|funds|goals. Year 2000–2099, month 1–12; mặc định năm/tháng Việt Nam hiện tại. Quý được xác định từ month.

GET `/api/v1/reports/details` nhận cùng bộ lọc và metric, versions, page>=1. Trả rows/columns/total/page/label; mỗi trang 20 dòng. Nguồn đổi, reset generation đổi hoặc ngày nghiệp vụ/kỳ đối chiếu không còn khớp trả 409 REPORT_CHANGED. Source lỗi không trả số 0; các source còn đọc được vẫn hiển thị, Mục tiêu liên kết đánh dấu nguồn không khả dụng.

Owner lấy từ Auth đã xác minh. Đọc trong transaction PostgreSQL repeatable-read/read-only, runtime role/RLS và savepoint từng source. Không đọc audit/command hoặc lưu baseline mutation. Không migration, seed, reset hoặc ghi tài chính. Trang await pageAccess và cả hai API private/no-store. Không persist dữ liệu tài chính trên trình duyệt. Response cũ không thay thế lựa chọn mới; tài khoản đổi remount workspace.

CSV UTF-8 BOM/CRLF, VND nguyên dạng chuỗi, metadata kỳ hiện tại/kỳ so sánh/asOf, cảnh báo và trạng thái nguồn. Xuất toàn bộ dữ liệu tab đang xem, có nhãn Mục tiêu hiện tại, vi/en và escape dấu nháy/newline/công thức. Chế độ che tiền không làm mất số đầy đủ trong file người dùng chủ động tải, cùng quy ước CSV hiện có.

## Giao diện và tài liệu

Dùng shell/font/token/theme sẵn có, hướng Achromatic ledger; biểu đồ SVG theo số liệu thật, không nối qua điểm thiếu, bảng thay thế, tooltip hỗ trợ chuột/chạm/Tab. Help vi/en, catalog, README, kiến trúc, UX và preview landing cập nhật cùng tính năng. Preview dùng 28.500.000 thu, 12.000.000 chi, chênh lệch tính từ hai số này; không đọc API tài chính.
