# Cài đặt: bố cục và trạng thái khôi phục — 04/11/2026

## Lỗi còn sót sau đợt rà toàn ứng dụng

Nút **Điều kiện khôi phục** nằm ngay trước mô tả của phần Sao lưu và khôi phục. Đợt trước đã xử lý nhiều cụm mô tả → nút và footer dialog, nhưng bỏ sót cấu trúc tiêu đề → Help → mô tả ở Cài đặt. Đo trên production build local trước sửa: đáy nút và đầu đoạn văn cách **0px**. `p` có `margin: 0` và khối chứa chưa có layout tạo khoảng cách.

Tiêu đề và Help nay nằm trong một hàng flex có wrap; mô tả ở hàng riêng, cách hàng tiêu đề **16px** bằng `--action-content-gap`. Không dựa vào margin mặc định hay khoảng trắng JSX. Rà cấu trúc Help đứng trực tiếp trước `p` trong source JSX không phát hiện thêm trường hợp cùng dạng; các màn hình khác dùng cụm tiêu đề/Help riêng. Đây là rà cấu trúc source, không thay thế kiểm tra mọi trạng thái render của toàn ứng dụng.

## Tài khoản đang có dữ liệu

- Hiện điều kiện ngắn, sau đó tổng số mục có dữ liệu/trống; mỗi mục thể hiện tên và trạng thái bằng chữ. Desktop tự chia cột theo chỗ trống; mobile xếp dọc.
- Mục có dữ liệu dùng `details/summary`, mặc định đóng, mở bằng chuột/chạm hoặc bàn phím. Bên trong có tổng bản ghi lưu trữ, loại dữ liệu và liên kết vào phân hệ. Giữ chi tiết đang mở khi kiểm tra lại.
- Mục trống là trạng thái tĩnh có chữ **Trống** và dấu kiểm, không giả làm nút mở.
- Số bản ghi gồm sổ, cấu hình, lịch sử và dữ liệu giữ lại; không phải số giao dịch. Chỉ hiện số khi người dùng chủ động mở chi tiết, kèm giải thích rõ.
- Lý do tài khoản vẫn có dữ liệu được thu gọn trong **Vì sao tài khoản vẫn có dữ liệu?**. Hướng tiếp tục hiện rõ: dùng tài khoản trống khác để giữ dữ liệu hiện tại, hoặc lưu bản sao lưu rồi làm trống tài khoản này.
- **Xem cách làm trống tài khoản** chỉ chuyển đến khu vực hướng dẫn; không mở hoặc xác nhận thao tác xóa. **Kiểm tra lại** có trạng thái bận và spinner.

Tất cả nhãn mới có vi/en. Vùng bấm tối thiểu 44px; focus bàn phím rõ, chữ dài xuống dòng, không tràn ngang tại 320px và cỡ chữ 200%. Giữ hai thẻ Sao lưu/Khôi phục stretch bằng nhau trên desktop theo quy ước hiện có.

## Ranh giới dữ liệu

Chỉ đổi cách trình bày dữ liệu `DataStatus`, không đổi API/domain/schema/migration. Trạng thái tài khoản có dữ liệu và hệ thống chưa hỗ trợ import được báo độc lập; sao lưu vẫn khả dụng. Chỉ bật chọn file khi tài khoản trống và hệ thống sẵn sàng. Làm trống vẫn cần quy trình sao lưu và xác nhận hiện có; không thêm xóa tự động.

Catalog, FAQ ở hai landing và Help vi/en mô tả trạng thái từng mục cùng chi tiết tùy mở. Đã rà preview công khai: không có màn hình Cài đặt/khôi phục nên giữ nội dung và số liệu minh họa hiện tại, không thêm control giả hoặc API tài khoản.

## Kiểm chứng

`tests/browser/settings-restore-layout.spec.ts` kiểm khoảng cách 16px, vi/en, 1440/1100/768/390/320px, chữ 100%/200%, Help và trả focus, module có dữ liệu/trống, mở chi tiết bằng Enter, giải thích số bản ghi, link vào phân hệ, trạng thái hệ thống độc lập, refresh giữ chi tiết và điều kiện bật nhập file. Fixture GET trạng thái chỉ phục vụ kiểm UI; không ghi dữ liệu tài chính.

Suite `backup.spec.ts` và `reset.spec.ts` kiểm tiếp luồng thật trên PostgreSQL local cô lập với Auth double. Kết quả từng lượt, source snapshot và giới hạn tại [validation](../07-validation.md). Ảnh trước/sau ở `artifacts/settings-restore-review/`. Không áp migration, ghi cloud, deploy hoặc xác minh thiết bị vật lý.
