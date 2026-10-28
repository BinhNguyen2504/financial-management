# Nội dung và giao diện nhất quán — 28/10/2026

Rà soát theo nhóm lỗi trên toàn ứng dụng: nội dung cho người dùng phổ thông, chiều cao dialog, phân cấp chữ, đóng menu và chọn tháng/năm. Giữ nhận diện, quy tắc tài chính, lịch sử, API và định dạng dữ liệu. Không thao tác cloud.

## Quy tắc dùng chung

- Nội dung nói rõ kết quả và bước tiếp theo. Thông báo cho người dùng không yêu cầu cấu hình Auth/database hoặc chạy migration. `userFacingError` ánh xạ lỗi hạ tầng ở phía trình bày; mã lỗi/status của API giữ nguyên. Bảo toàn thông báo nghiệp vụ, tên/ghi chú người dùng, bản nháp và phân biệt kết quả lưu chưa xác nhận. Lỗi bản sao lưu trình bày bằng hướng dẫn chọn bản sao lưu phù hợp, không hiển thị cấu trúc nội bộ. Lịch sử Tiết kiệm dùng tên thao tác và ngày giờ đã định dạng, thay mã action và timestamp thô. Mẫu tháng T{0}/M{0} chỉ khớp số tháng 1–12 để không làm biến dạng chuỗi tự do.
- Typography có primitive và vai trò trong `typography.css`, dùng rem. Trang ứng dụng 32px desktop/28px mobile, phần 24px, dialog 20px, nhóm 18px, nội dung/ô nhập 16px, bảng/nhãn/nút 14px, chú thích ít ưu tiên 12px. Metric có tỷ lệ riêng 24–32px; logo và tiêu đề marketing giữ vai trò nhận diện. Dữ liệu tiền dùng chữ số thẳng cột, không đổi cách tính/làm tròn. Nunito và năm chủ đề được giữ.
- Mobile dưới 960px: dialog cao tối đa 90% vùng đang hiển thị và chừa ít nhất 16px cùng vùng an toàn trên/dưới. `visualViewport` cập nhật khi bàn phím/khung nhìn thay đổi; không can thiệp pinch zoom. Tiêu đề và footer cố định trong khung, body cuộn riêng, dialog ngắn co theo nội dung. Help mobile dùng cùng giới hạn và góc bo; desktop giữ drawer. Dialog stack, focus, Escape và trạng thái busy/uncertain được giữ.
- `MobileNavigation` giữ native details; đóng khi chạm ngoài, focus đi ra, Escape, chọn trang hoặc sang desktop. Tương tác/cuộn bên trong giữ menu mở. Escape trả focus; chạm ngoài không giành focus. Menu tài khoản và bộ chọn cột được kiểm tra cùng nhóm hành vi.
- `MonthYearSelect` dùng hai select Năm rồi Tháng trên cùng hàng, tối thiểu 44px/chữ 16px, năm tăng dần. Giao diện nhận/trả `YYYY-MM`, giữ giới hạn riêng từng nghiệp vụ, nhãn lỗi/required/disabled và nhãn trạng thái năm Chi tiêu. Khi đổi năm, tháng được giới hạn về kỳ hợp lệ gần nhất. Hai ô giữ đủ chiều rộng trên điện thoại/tablet; khi phóng chữ và không còn chỗ, chuyển thành một cột để không cắt giá trị. Dùng trong bộ lọc, biểu mẫu và tháng tham chiếu báo cáo; ngày giao dịch/định giá vẫn chọn ngày. Preview minh họa chỉ hiển thị kỳ cố định, không giả vờ đổi dữ liệu tài khoản.

## Phạm vi đối chiếu

| Khu vực | Nội dung | Chữ/responsive | Dialog/menu | Thời gian |
| --- | --- | --- | --- | --- |
| Thu nhập, Chi tiêu | Nhãn, lỗi, hướng dẫn | Tiêu đề, bảng, form | Tạo/sửa/chi tiết và dialog lồng nhau | Workspace và biểu mẫu |
| Tiết kiệm | Nhãn, lỗi, bản chốt | Bảng, danh sách, form | Danh mục, giao dịch, chi tiết | Tháng xem và biểu mẫu động |
| Đầu tư, Quỹ | Nhãn, lỗi, hướng dẫn | Số liệu, bảng, form | Biểu mẫu và chi tiết | Tháng tham chiếu báo cáo; giữ chọn ngày |
| Tổng quan, Hồ sơ, Cài đặt | Hướng dẫn, sao lưu/khôi phục | Tiêu đề, nhãn, ô nhập | Menu tài khoản/điều hướng | Giữ các trường ngày phù hợp |
| Trang dự kiến, Help, đăng nhập | Nội dung và giới hạn chức năng | Phân cấp chữ | Help mobile và focus | Chỉ dùng khi có lựa chọn kỳ |
| Landing và preview | Copy phổ thông, dữ liệu cố định | Nhận diện marketing riêng | Preview Help riêng | Minh họa Năm/Tháng cố định |

## Bằng chứng và giới hạn

Ảnh trước trong `artifacts/usability-before/`. Trên khung 390×844, Help cũ cao 844px và góc bo 0; form cũ chỉ chừa 8px trên/dưới. Bộ kiểm thử hiện tại xác nhận lại bằng geometry và hit testing thay vì chỉ nhìn source hoặc dựa vào IntersectionObserver của native dialog.

Đã đọc 36 ảnh production của 12 route ở 390/768/1440px; số đo không có tràn ngang. Review ảnh phát hiện riêng lỗi bộ chọn Chi tiêu bị co ở tablet: sau sửa, hai ô rộng 136px tại 320px và 188px tại 768/959/1440px, cao 44px và cùng hàng (artifact `artifacts/usability-reviewed/period-final.json`). Sửa thêm grid Quỹ English 320px từ scrollWidth 323px về 320px, khoảng cuộn focus hàng cuối menu và menu ngang thấp 844×390. Các ảnh, bảng contact và ghi chú review nằm tại `artifacts/usability-reviewed/`.

Kết quả kiểm chứng cuối đợt được ghi tại [nhật ký validation](../07-validation.md). Môi trường là production build riêng, PostgreSQL local riêng, Auth double và trình duyệt mô phỏng; không chứng minh cloud deployment hoặc thiết bị vật lý.

Chưa kiểm chứng trên thiết bị vật lý: mở/đóng bàn phím iOS Safari và Android Chrome, thanh địa chỉ thu/phóng, vùng an toàn khi mở từ màn hình chính, xoay máy trong lúc nhập và pinch zoom. Đây là bảng kiểm thiết bị riêng; không đánh dấu đạt từ browser emulation.

## Bổ sung tag và danh mục Thu nhập — 28/10/2026

Tag trạng thái chuyển sang StatusBadge chung: nền nhẹ, viền rõ, chữ đậm, icon trang trí và sắc thái theo nghĩa trạng thái. Nhóm tag xuống hàng khi thiếu chỗ, chữ không bị cắt. Quy tắc xóa Thu nhập xét số thu hiện còn ở mọi tháng/năm, bao gồm 0 đồng; lịch sử đã xóa hết không chặn xóa danh mục. Xem [đặc tả và nghiệm thu riêng](income-tags-2026-10-28.md).


## Responsive và nội dung phổ thông — 29/10/2026

Tiếp nối đợt này bằng tinh chỉnh preview mobile, header, FAQ, phần mở rộng và nội dung phổ thông; giữ nguyên lịch sử bằng chứng bên trên. Xem [quy tắc và kiểm chứng](responsive-disclosures-2026-10-29.md).
