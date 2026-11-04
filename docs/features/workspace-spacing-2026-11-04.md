# Khoảng cách giữa các nhóm nội dung — 04/11/2026

## Vấn đề và thay đổi

- Chi tiêu: khoảng cách thực tế từ hàng 5 thống kê đến bộ lọc là 0px. `FilterOptions` nay sở hữu lề 24px ở hai phía, 16px khi màn hình ≤639px; áp dụng cả trạng thái thu gọn, mở, đang lọc và đặt lại ở Chi tiêu, Tiết kiệm và Đầu tư. Nội dung con không cộng thêm lề đáy; thanh điều khiển cách bộ lọc 12px.
- CSS tiêu đề/đoạn văn chung có thể lấn cỡ chữ thống kê theo thứ tự stylesheet. Nhãn Chi tiêu/Thu nhập giữ 14px; số tiền Chi tiêu 18–24px, rõ hơn nhãn, tự xuống dòng trong thẻ và cùng đáy mỗi hàng.
- Quỹ an toàn/Mục tiêu/Báo cáo/Cài đặt: grid cha sở hữu khoảng cách, bỏ lề thừa của tiêu đề và hướng dẫn. Cài đặt không cộng thêm 24px trước nhóm làm trống vào gap đã có.
- Tiết kiệm: tiêu đề đầu panel dùng padding của panel thay vì cộng thêm lề trên; chú thích và bảng diễn biến có khoảng cách 16px với biểu đồ.
- Đầu tư: nút giải thích kết quả cách bảng danh mục 16px. Báo cáo: tiêu đề, mô tả và biểu đồ cách nhau 16px.
- Nút “Thao tác khác”/“Bộ lọc” chỉ hiện ở breakpoint thu gọn (≤700px); CSS nút của module không được làm chúng xuất hiện thừa trên desktop và đẩy thao tác xuống dòng sát nhau.

CSS tập trung trong `src/app/styles/experience/workspace-spacing.css`, được nhập sau quy tắc workspace chung; selector chỉ áp dụng trong `.app-shell`. Không thay đổi thứ tự nội dung, công thức tiền, lưu bộ lọc hay dữ liệu.

## Rà soát tính nhất quán

Đã xem catalog, copy ở cả hai landing, `product-preview.tsx` và CSS preview: tên/trạng thái/năng lực module không đổi; preview dùng bố cục riêng và dữ liệu cố định, không có khối bộ lọc sát hàng 5 thống kê. Giữ nguyên copy và dữ liệu minh họa, không thêm tuyên bố tính năng cho chỉnh sửa spacing. README và hướng UX được cập nhật cùng thay đổi.

Rà soát trang Tổng quan, Thu nhập, Chi tiêu, Tiết kiệm, Đầu tư, Quỹ an toàn, Mục tiêu, Báo cáo, Cài đặt, Tài khoản dự kiến và Hồ sơ. Kiểm tra hình học bổ sung cho bộ lọc và cỡ chữ thống kê; ảnh lưu tại `artifacts/workspace-spacing/`.

## Kiểm chứng

**15/15 browser đạt trong lượt chạy sạch cuối** trên Chromium desktop/mobile, Firefox, WebKit desktop/iPhone giả lập. Kiểm tra 11 trang, ba module có bộ lọc, cỡ chữ và khoảng cách Chi tiêu tại 320/390/768/1440px ở sáng/tối. Đã xem ảnh desktop/tablet/mobile; lint, Prettier, build production có TypeScript và kiểm tra kiến trúc (324 source, 0 vi phạm) đạt.

Chi tiết và giới hạn tại `docs/07-validation.md`. Browser runner dùng production snapshot, PostgreSQL cô lập và Auth double local. Không ghi dữ liệu tài khoản thật, không deploy; kết quả không chứng minh cloud hay thiết bị vật lý.
