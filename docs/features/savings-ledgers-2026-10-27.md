# Rà soát ba bảng Tiết kiệm — 27/10/2026

Phạm vi: Danh mục tiết kiệm, Giao dịch tháng và Giao dịch nguồn trong kỳ tại `/savings`.

## Quyết định bố cục

- Danh mục: tên/emoji/mô tả, loại tài sản/đơn vị, tháng bắt đầu, trạng thái và thao tác. Nhãn Lưu trữ thay cho Lưu trữ / xóa, tiếp tục mở form có tháng hiệu lực, không xóa lịch sử.
- Giao dịch tháng và nguồn báo cáo: dùng chung `SavingsTransactionTable`; nội dung/ghi chú, ngày, danh mục/ví liên quan, số tiền và thao tác. Danh sách nguồn lấy đúng tập effects của bộ lọc báo cáo. Hai bảng đều mới nhất trước, giữ thứ tự gốc khi cùng ngày.
- Số tiền giữ nguyên giá trị effect.net, không tự suy thành dòng tiền tăng/giảm; lãi/lỗ đã chốt của bán vàng có dòng riêng. Privacy Mode che cả hai số. Không cộng tổng các loại giao dịch khác nghĩa.
- Vùng bảng tối đa 760px chuyển sang hàng xếp dọc có nhãn. Tên/ghi chú không bị cắt; nút sửa/hủy 44px, lưu trữ/khôi phục có chữ. Giữ semantic table và liên kết tiêu đề cột khi đổi cách trình bày.
- Dùng `ColumnTable` và bộ chọn cột chung, cấu hình riêng từng bảng. Tên/nội dung và thao tác luôn hiện. Số dòng phản ánh bộ lọc; không có dữ liệu vẫn giữ khung và thông báo.

Hướng thiết kế: `ui-ux-pro-max` (Table Handling: dữ liệu hẹp chuyển sang danh sách có nhãn), cùng app-screen của `design-taste-frontend`. Direction `achromatic-ledger`, seed `1746490057`, giữ palette/font hiện có (`--keep palette,type`); không redraw. Dùng nhịp hàng, đường phân cách nhẹ, căn phải chữ số đều. Nhận diện là tên/emoji danh mục do người dùng chọn, Nunito và semantic theme tokens của ứng dụng. Không thay shell, tiêu đề minh họa hoặc năm theme đã được duyệt.

Câu hỏi của mỗi bảng: danh mục nào đang hoạt động và bắt đầu khi nào; tháng này có giao dịch nào trong bộ lọc; những giao dịch nào là nguồn của kỳ báo cáo. Tên/ngày/số tiền và thao tác nằm trong cùng hàng để đối chiếu.

## Kiểm chứng local

Môi trường: Node 22.12.0, production build Next.js bằng webpack, PostgreSQL tạm và Auth contract double qua runner `scripts/test-postgres.mjs --browser`. Không dùng hoặc ghi dữ liệu cloud.

- Typecheck đạt. Bộ unit tại thời điểm kiểm tra: 223/223.
- Đợt browser đầu: 27/28 đạt; ca mới ở desktop phát hiện tràn 4px khi đặt viewport 320px và số tiền vượt Number.MAX_SAFE_INTEGER. Nguyên nhân là chuỗi tiền dài trong chú giải phân bố tài sản, không phải ô bảng. Đã sửa cột tên co được và xuống dòng trong chú giải; đọc lại DOM sau sửa ghi nhận scrollWidth 320 bằng viewport 320.
- Đợt cuối dựng lại production build từ source sau sửa, chạy sạch **28/28** ca Tiết kiệm: Chromium desktop, Chromium iPhone emulation, Firefox desktop và WebKit iPhone emulation, 7 ca mỗi project. Bao gồm CRUD, bán vàng, sổ tiền gửi/tái tục, chốt/mở tháng, lưu trữ/khôi phục, lịch sử, API Auth, bản nháp khi lỗi và thử lại sau mất phản hồi. Ca bố cục desktop kiểm thêm 1440×1000, 768×1024, 320×740 và 844×390. Ảnh/`.last-run.json` tại `artifacts/savings-ledgers-final/`; log build tại `artifacts/savings-ledger-final-next.log`.
- Kiểm tra có tên danh mục dài, ghi chú nhiều dòng và chuỗi không có dấu cách, giao dịch chuyển ví, số tiền lớn, bộ lọc có/không có kết quả, Privacy Mode, sửa giao dịch, danh mục lưu trữ, cấu hình cột sau tải lại và ngôn ngữ Anh.
- Ảnh production local có dữ liệu mẫu hiện hữu ở sáng/tối, 1440/768/390/320px trong `artifacts/savings-ledger-review/`; số mẫu gắn nhãn DỮ LIỆU MẪU UI/UX, không phải tài sản thật. Kiểm tra nguồn bằng lint của design skill: không FAIL; hai WARN là shadow của tooltip nổi và dấu focus lát biểu đồ đã có.
- Probe toàn trang trong `artifacts/savings-ledger-review/inspection.json` còn báo các đặc điểm có sẵn ngoài ba bảng: emoji dữ liệu người dùng, shadow nút trong shell, nhãn điều hướng dự kiến 10px, gradient của theme tối; cùng cảnh báo bảng màu/tiêu đề. Đây không phải kết quả toàn trang đạt toàn bộ house rules của skill. Giữ thiết kế sản phẩm hiện có; rà soát này không thay nhận diện theo các quy tắc phong cách của skill.

Không dùng bằng chứng local này để khẳng định deploy, Supabase Auth/PKCE thật hoặc thiết bị vật lý. Không đổi schema, nghiệp vụ tính toán, backup hay ranh giới đăng nhập. Catalog, README, landing, preview minh họa, đặc tả Tiết kiệm và kiến trúc/UX đã được đối chiếu cùng thay đổi.
