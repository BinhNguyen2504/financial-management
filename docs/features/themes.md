# Chủ đề giao diện — cập nhật 22/10/2026

## Trải nghiệm

Trong Cài đặt → Giao diện, chọn **Khu vườn — Xanh lục**, **Dòng nước — Xanh lam**, **Kim ngân — Vàng**, **Lửa ấm — Đỏ** hoặc **Đất lành — Nâu**. Năm thẻ có minh họa, mô tả, radio và dấu chọn; ba cột trên desktop, hai cột ở 561–900px, một cột dưới 561px. Chọn áp dụng ngay. Nhóm chế độ hiển thị riêng có Sáng/Tối/Theo hệ thống, dùng chung cho cả năm chủ đề. Chủ đề mặc định là Khu vườn, giữ lựa chọn chế độ cũ; chưa chọn thì Theo hệ thống.

Phạm vi gồm toàn bộ module, trạng thái trống, biểu đồ, dialog, Help, landing sau đăng nhập, login và trang mất kết nối. Landing dành cho khách tại `/` dùng nhận diện marketing sáng riêng, độc lập theme/mode; không ghi đè tùy chọn đã lưu. Minh họa, icon trang trí và lời dẫn gợi hình đi theo chủ đề. Tên module, hướng dẫn nghiệp vụ, màu cảnh báo/lỗi, emoji người dùng và logo thanh toán giữ nguyên. Logo, favicon, manifest và Open Graph giữ nhận diện thương hiệu.

## Màu và hình ảnh

Khu vườn giữ bảng màu hiện tại. Dòng nước sáng dùng nền #F2F7FA, bề mặt #FCFEFF, chữ #334957, chữ phụ #5B6F7C, primary #356B8A. Bản tối dùng #101D27, #172A35, #E4F0F5, #A8BDC9, #9CCBE2 tương ứng. Màu nền phụ chọn đủ sáng để chữ phụ có tương phản tối thiểu 4.5:1.

| Ngữ cảnh SVG | Dòng nước |
|---|---|
| garden | Suối uốn lượn, đá cuội và gợn nước |
| jar | Bình tích nước, dòng chia nhánh |
| sprout | Giọt đầu tiên tạo vòng sóng |
| harvest | Những dòng suối hợp lưu |
| grove | Chuỗi hồ tích nước |
| path | Thuyền theo dòng về bến |
| shelter | Mái che bên mặt nước |
| balance | Hai bình nước cân bằng |

Dòng nước có ba cảnh Quỹ riêng theo tỷ lệ thật: hồ dự trữ đầy dần, mái che dưới mưa mở rộng và thuyền về bến. Cùng công thức tỷ lệ/mốc tiến độ hiện tại; chỉ hình vẽ giới hạn ở 100%. Che tiền giữ tỷ lệ.

Chuyển màu 180ms sau thao tác chọn, phản hồi Quỹ ngắn khi lưu, không hoạt ảnh nền lặp. Giảm chuyển động tắt hiệu ứng.

## Kim ngân — bổ sung 21/10/2026

Sáng dùng nền `#FAF6EA`, bề mặt `#FFFDF6`, chữ `#51432B`, chữ phụ `#756449`, màu chủ đạo `#806018`. Tối dùng `#241E13`, `#30291B`, `#F7EFDC`, `#C6B791`, `#E2C16B` tương ứng. Chữ/nút dùng vàng trầm hoặc champagne để dễ đọc; ánh kim là hình trang trí tĩnh, không chớp hoặc chạy nền.

| Ngữ cảnh SVG | Kim ngân |
|---|---|
| garden | Chồng xu tích lũy và đồng xu nổi bật |
| jar | Túi tiền và chồng xu nhỏ |
| sprout | Đồng xu đầu tiên |
| harvest | Rương tích lũy và các đồng xu |
| grove | Thỏi vàng xếp tầng |
| path | Các đồng xu dẫn về rương |
| shelter | Kho xu trong khiên bảo vệ |
| balance | Hai đồng xu trên cân |

Quỹ: Emergency Fund có chồng xu cao dần, Rainy Day Fund có túi dự phòng đầy dần và khiên, Sinking Fund có rương đầy dần. Cả ba dùng cùng tỷ lệ và mốc tiến độ như hai chủ đề trước; vượt mục tiêu chỉ giới hạn hình, che tiền giữ tỷ lệ. Đây là minh họa giao diện, không thay đổi loại tài sản, số dư hoặc cách tính Quỹ.

## Lửa ấm — bổ sung 22/10/2026

Sáng dùng nền `#FBF4F0`, bề mặt `#FFFCFA`, chữ `#543F3B`, chữ phụ `#7C5F58`, màu chủ đạo `#A34636`. Tối dùng `#291B1A`, `#352423`, `#FAEAE4`, `#D0B2A8`, `#F0AB97` tương ứng. Đỏ gạch và san hô tạo cảm giác ấm; màu cảnh báo/lỗi và trạng thái tài chính giữ token hiện có, kèm chữ/biểu tượng theo từng thao tác. Không có hoạt ảnh lửa hoặc nền lặp.

| Ngữ cảnh SVG | Lửa ấm |
|---|---|
| garden | Bếp lửa ngoài trời và củi giữ ấm |
| jar | Đèn lồng và than hồng |
| sprout | Đốm lửa đầu tiên |
| harvest | Dãy đèn lồng |
| grove | Núi lửa và dòng dung nham tĩnh cách điệu |
| path | Đèn lồng dẫn lối |
| shelter | Bếp lửa trong mái vòm |
| balance | Hai đèn lồng trên cân |

Quỹ: Emergency Fund có bếp lửa ấm dần; Rainy Day Fund có đèn sáng dần dưới mái che; Sinking Fund có đốm lửa tiến về đèn đích. Dùng cùng tỷ lệ, mốc tiến độ và giới hạn hình ở 100%; số liệu thật và che tiền giữ nguyên. Minh họa không thay đổi nội dung hướng dẫn nghiệp vụ.

## Đất lành — bổ sung 22/10/2026

Sáng dùng nền `#F8F4ED`, bề mặt `#FFFCF7`, chữ `#514337`, chữ phụ `#74614F`, màu chủ đạo `#79583D`. Tối dùng `#241F1A`, `#302921`, `#F3EADF`, `#C5B5A1`, `#D7B38A` tương ứng. Bộ hình dùng nâu đất, cát, đá và đất nung; lấy cấu trúc địa hình làm đặc trưng, không dùng cây lá làm hình chính.

| Ngữ cảnh SVG | Đất lành |
|---|---|
| garden | Đồi, tầng đất và đá cuội |
| jar | Bình đất nung và viên đá |
| sprout | Viên đá đầu tiên trên nền đất |
| harvest | Ruộng bậc thang |
| grove | Dãy núi với lớp địa tầng |
| path | Bậc đá dẫn lên cột mốc |
| shelter | Mái trú vòm đất nung |
| balance | Hai viên đá trên cân |

Quỹ: Emergency Fund có nền đá cao dần; Rainy Day Fund có mái trú đất nung mở rộng; Sinking Fund có đá xếp tiến lên bậc thang đến đích. Dùng cùng tỷ lệ/mốc tiến độ, hình giới hạn ở 100%; số liệu vượt mục tiêu và che tiền giữ nguyên. Không thay đổi thuật ngữ, hướng dẫn nghiệp vụ, màu trạng thái tài chính hoặc nhận diện thương hiệu. Chuyển động chỉ theo thao tác, tôn trọng giảm chuyển động.

## Lưu tùy chọn và tương thích

- `VisualTheme = forest | water | gold | fire | earth`, cấu hình chung `visualThemes`; `fm-visual-theme`/`data-visual-theme` độc lập với `fm-theme`/`data-theme`.
- Lưu trong localStorage theo origin; cùng tab cập nhật qua sự kiện nội bộ, tab khác qua storage event. Không đồng bộ tài khoản; không thêm API/migration/backup fields.
- Không remount workspace, giữ state, bộ lọc và bản nháp. Không ghi dữ liệu tài chính vào localStorage.
- Storage bị chặn: vẫn đổi trong phiên của tab. Giá trị chủ đề lạ về forest, chế độ lạ về system.
- Script parser chọn trước paint. Cùng markup SVG/text ở server/client, CSS chỉ hiện nhánh đúng. React quản lý metadata theme-color; lựa chọn system theo media query.
- Trang offline đọc cùng tùy chọn và theo thay đổi hệ điều hành. Cache `fm-offline-v6` vẫn chỉ chứa `/offline.html`; không hỗ trợ nhập/đồng bộ tài chính ngoại tuyến.

## Bộ năm chủ đề

Khu vườn, Dòng nước, Kim ngân, Lửa ấm và Đất lành đều đã có lựa chọn trong mã nguồn. Không hiển thị thẻ chưa dùng được. Trạng thái triển khai mã nguồn không xác nhận cloud/deployment hoặc thiết bị vật lý.

## Kiểm chứng

Xem [lịch sử validation](../07-validation.md). Kiểm thử trình duyệt local, dữ liệu tổng hợp và Auth contract double không xác nhận cloud/deployment, Auth thật hoặc thiết bị vật lý.
