# Tổng quan cá nhân hóa — 29/10/2026

Tổng quan hiển thị năm module thực tế qua 10 loại widget. Mặc định: Cần chú ý, Thu nhập, Chi tiêu, Tiết kiệm, Đầu tư, Quỹ an toàn. Tùy chọn: Phân bổ chi tiêu, Hũ theo dõi (tối đa 5 hũ), Sổ sắp đáo hạn, Một chút bình yên. Mỗi loại tối đa một widget; có thể ẩn toàn bộ.

Thu nhập/Chi tiêu dùng tháng hiện tại; tài sản và quỹ tính đến hôm nay theo Asia/Ho_Chi_Minh. Không cộng sổ độc lập thành tài sản ròng hay số tiền có thể chi. Thu nhập chưa nhập giữ null, khác 0 đồng. Số thực chi hiện tại giữ nhãn tạm tính. Thiếu định giá chỉ trình bày giá trị đã biết, không giả định tổng đầy đủ; định giá cũ dùng quy tắc tháng của module. Không tự truy cập giá thị trường hoặc ngân hàng.

Cần chú ý ưu tiên sổ đến hạn (kể cả còn tiền gốc đã quá hạn), hũ vượt mức, thu tháng này chưa nhập, định giá tiết kiệm/đầu tư và nguồn tính quỹ đã đổi. Hiện tối đa 5 nhóm rồi mở rộng. Widget sổ dùng đúng khoảng 7 ngày từ Tiết kiệm, tối đa 5 dòng, sắp theo ngày đáo hạn. Phân bổ dùng 4 nhóm lớn nhất và Khác; không bỏ số tiền khỏi tổng. Hũ theo dõi giữ tham chiếu hũ đã ngừng hoặc không có trong tháng để người dùng chủ động bỏ chọn.

## Tùy chỉnh và đồng bộ

Nút Tùy chỉnh Tổng quan mở dialog có mô tả widget, checkbox, chuyển lên/xuống và chọn hũ. Xem thử bố cục đóng dialog để xem trang, giữ bản nháp trong bộ nhớ. Lưu đồng bộ tài khoản; Hủy/Escape/đóng dialog bỏ bản nháp. Khôi phục mặc định chỉ đổi bản nháp, cần Lưu mới áp dụng. Không lưu dữ liệu tài chính/bản nháp vào localStorage.

GET/PUT `/api/v1/overview/layout` lưu `schemaVersion`, danh sách widget theo thứ tự, `jarIds`; PUT nhận `expectedRevision`, response có `revision`. Xung đột 409 `LAYOUT_CONFLICT` giữ bản nháp, cho người dùng tải bố cục mới; không tự ghi đè. Một tài khoản dùng chung cấu hình trên thiết bị khi tải lại hoặc quay về foreground theo chính sách refresh hiện có; không realtime.

Migration `202610290001_overview_layouts.sql` thêm bảng `overview_layouts`, khóa owner và FORCE RLS theo mô hình expense_api. Không có cấu hình thì GET trả mặc định và không ghi hàng mới. Thiếu migration trả `OVERVIEW_SCHEMA_REQUIRED`; Tổng quan vẫn tải số liệu theo mặc định nhưng chưa lưu được tùy chỉnh. Bảng cấu hình nằm ngoài backup tài chính và phép kiểm tra tài khoản trống. Các tùy chọn theme/privacy/cột vẫn lưu trình duyệt như trước.

## Tổng hợp và trạng thái

GET `/api/v1/overview?widgets=…` xác minh Auth một lần, chỉ tải nguồn cần cho widget, tái sử dụng domain/application của từng module và trả DTO gọn, không trả sổ/audit. Cần chú ý tải đủ năm nguồn. Các widget cùng nguồn chia sẻ lần đọc; Quỹ vẫn dùng adapter nguồn Chi tiêu để so sánh cấu hình. Các nguồn được đọc độc lập, không phải snapshot giao dịch toàn ứng dụng.

Lỗi nguồn nằm tại widget, có thử lại; nguồn thành công khác tiếp tục hiển thị. Refresh lỗi giữ số liệu lần trước và nhãn rõ. Lỗi Auth xóa dữ liệu đang hiển thị. Loading, không có sổ, không có kết quả và lỗi là các trạng thái riêng. Refresh theo foreground và nửa đêm Việt Nam, giữ số liệu khi cập nhật. Trang vẫn await pageAccess; API private/no-store và RLS, PUT kiểm tra origin.

## Giao diện và tài liệu

Tiêu đề gọn và minh họa hũ nhỏ, không dùng banner lời chào lớn. Hai cột khi vùng nội dung đủ 760px, còn lại một cột. Thứ tự DOM/bàn phím trùng thứ tự hiển thị. Dialog mobile toàn màn hình. Giữ Nunito, năm theme, sáng/tối, Việt/Anh, Privacy Mode kể cả trợ năng. Các tỷ lệ vẫn có thể đọc khi che tiền như quy ước hiện tại.

Landing thêm tab Tổng quan với số mẫu cố định dùng chung các giá trị minh họa của năm tab hiện có; không đọc API/account. Catalog, README, Help và tài liệu kiến trúc/UX được cập nhật cùng thay đổi. Migration được chuẩn bị trong source và kiểm chứng PostgreSQL local; chưa suy ra việc đã áp dụng cloud hoặc kiểm thử thiết bị thật.
