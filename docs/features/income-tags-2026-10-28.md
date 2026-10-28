# Danh mục Thu nhập và tag trạng thái — 28/10/2026

## Xóa hay ngừng nguồn thu

Điều kiện dựa trên các bản ghi số thu **hiện còn** trong toàn bộ sổ, gồm mọi tháng/năm. Không còn bản ghi thì được Xóa, kể cả nguồn đã từng nhập rồi xóa hết, đã ngừng hoặc chưa bắt đầu. Bản ghi 0 đồng vẫn là số thu: chỉ ngừng nguồn đang hoạt động từ tháng hiệu lực, giữ số thu để sửa/xóa như trước.

Giao diện và server dùng cùng `hasMonthlyIncome`. Sau khi xóa số thu cuối cùng và đọc lại sổ, nút chuyển sang Xóa. Xác nhận nêu rõ không còn số thu ở bất kỳ tháng nào và audit vẫn được giữ. Xóa dùng cờ deleted, giữ category và lịch sử append-only; không xóa dây chuyền tiền, không đổi API v1/schema/backup hoặc cần migration.

Transaction kiểm tra lại toàn bộ dữ liệu. Phiên khác vừa nhập số thu làm expectedVersion cũ bị từ chối; tải lại vẫn không được xóa nếu còn bản ghi. Quy tắc này thay thế chính sách cũ chặn xóa theo mọi lần từng setMonthly, kể cả đã clearMonthly.

## Tag dùng chung

StatusBadge nhận nhãn đã dịch, tone, size thường/gọn, icon tùy chọn hoặc false. Mặc định có icon trang trí theo tone, không có live region hoặc tabindex. Dùng nền nhẹ, viền 1px, chữ đậm 14px/12px; token chữ/nền riêng cho sáng/tối, giữ nghĩa màu qua năm chủ đề. Nhãn và icon giữ đọc được khi thu hẹp; nhóm tag được xuống hàng. Nhãn dài được ngắt dòng trong phần chữ khi cần, không cắt mất nội dung.

| Tone | Trạng thái |
| --- | --- |
| warning | Tạm tính, Chưa nhập, Chưa chốt, Thiếu giá |
| success | Đã chốt, Đã ghi nhận, Đã kết thúc, Đang hoạt động |
| neutral | Đã ngừng, Đã lưu trữ, Chưa phát sinh |
| info | Kế hoạch, Chưa bắt đầu, Chưa đến kỳ nhập, Thu phát sinh, Đang phát triển, Dữ liệu minh họa |
| danger | Dành cho nhãn trạng thái lỗi khi cần |

Đã áp dụng cho các nhãn trạng thái trong workspace, báo cáo, danh mục, chi tiết, cài ứng dụng, điều hướng, trang dự kiến và landing/preview. Giữ nguyên câu giải thích dài, tooltip dạng câu, chú giải biểu đồ, dữ liệu người dùng và nội dung CSV. Badge không thay thế nút/tab/chọn bộ lọc. Preview giữ dữ liệu cố định và không đọc API tài chính tài khoản.

## Kiểm chứng

Kết quả thực thi được bổ sung tại [nhật ký validation](../07-validation.md), tách rõ unit, PostgreSQL local và trình duyệt mô phỏng. Không triển khai hoặc ghi cloud trong thay đổi này.

## Vị trí và nhịp bố cục — 29/10/2026

Tag trạng thái danh mục nằm trong cùng nhóm tiêu đề với tên; tháng bắt đầu ở dòng phụ riêng. Nguồn đã ngừng có tag cạnh tên, không gắn vào số tiền. Tag Thu phát sinh đi cùng tên khoản thu. Tên dài được xuống dòng, tag giữ trọn khối và chuyển sang dòng tiếp theo khi cần.

Trạng thái tháng Tiết kiệm nằm cạnh nhãn Tháng đang xem trong cùng nhóm chọn kỳ; không còn là một phần tử toolbar độc lập. MonthYearSelect thêm labelAccessory tùy chọn, không đổi tên truy cập hoặc cách chọn Năm/Tháng. Trong báo cáo, ngày chốt phạm vi và tag thành một hàng metadata; phần giải thích là đoạn riêng. Ô tháng có tag xếp ngày trước, tag dưới với gap 6px. Footer Thu nhập căn tag theo mép phải số liệu.

Cảnh báo tổng kỳ dùng tag ngắn “N khoản cần bổ sung”; danh sách tháng dùng ngày/tháng thường và tag “N chưa nhập”. Câu giải thích đầy đủ vẫn ở vùng cảnh báo và Help. Tổng quan và tổng kết năm dùng nhóm flex có gap, không chèn tag vào giữa câu bằng dấu chấm. Trang dự kiến đặt trạng thái cạnh tiêu đề, nhãn phạm vi cạnh tên phần; thông điệp bắt đầu Quỹ nằm dưới tiêu đề. Các cột Trạng thái, nhãn minh họa preview và trạng thái điều hướng vẫn ở đúng phạm vi đối tượng.

Kiểm tra vị trí đo cả khoảng cách tên/ngày/tag, tách tiền và thao tác, tên danh mục dài, sáng/tối và Việt/Anh. Giữ nguyên quy tắc Xóa/Ngừng, API, dữ liệu và lịch sử.

Nghiệm thu 29/10: npm run check đạt, 44/44 browser cases cuối đạt trên Chromium desktop/mobile, Firefox và WebKit; geometry có 320/768/1440px, tên dài và hai ngôn ngữ. Xem nhật ký validation để phân biệt lượt cuối với các lượt sửa fixture/selector trước đó.
