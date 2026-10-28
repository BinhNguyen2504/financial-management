# Responsive, nội dung và phần mở rộng — 29/10/2026

Đợt này sửa theo nhóm lỗi trên landing khách/thành viên và toàn ứng dụng. Giữ nhận diện, slogan, năm chủ đề, dữ liệu, quy tắc tài chính và ranh giới đăng nhập. Không đổi API/schema hoặc trạng thái triển khai module.

## Preview và header

- Ở chiều rộng ≤600px, preview dùng khung điện thoại tối đa 360px, cao `min(720px, 80svh)`. Thanh chọn đủ năm mục nằm ngoài vùng nội dung cuộn; bộ chọn kỳ minh họa và nút che tiền nằm trên thanh sticky bên trong. Metric, danh sách và biểu đồ xếp dọc; không giấu biểu đồ chỉ vì màn hình nhỏ. Tablet/desktop giữ giao diện tương ứng hiện có.
- Vùng cuộn có tên truy cập, focus nhìn thấy và khoảng cuộn cho thanh sticky. Đổi mục đưa nội dung về đầu, giữ trạng thái che tiền. Cuộn tới biên cho phép tiếp tục cuộn trang; không chặn wheel/touch hoặc khóa trang. Tab/Home/End/mũi tên tiếp tục dùng được.
- Preview chỉ có hằng số minh họa. Không gọi API tài chính, đọc dữ liệu tài khoản, lưu lựa chọn module hoặc ghi `fm-privacy`.
- Header mobile giữ logo/tên bên trái, VI/EN và icon/avatar bên phải; tên lựa chọn ngôn ngữ và tên truy cập tài khoản vẫn đầy đủ. Điều khiển tối thiểu 44px. Khi phóng chữ không còn chỗ, cho phép xuống hàng để giữ thao tác.

## Phần mở rộng và phân cấp nội dung

`AnimatedDetails` giữ DOM `details/summary` cùng props gốc, kể cả trạng thái `open` theo nghiệp vụ. Không bọc lại nội dung nên selector, biểu mẫu, bảng, dialog và liên kết bên trong tiếp tục hoạt động. Không có JavaScript thì dùng hành vi native.

Khi có JavaScript, chiều cao thực của khối mở/đóng chuyển trong 280/190ms. Bấm liên tục đảo chiều từ vị trí hiện tại; ResizeObserver/MutationObserver theo dõi nội dung đổi kích thước hoặc ngôn ngữ. Sau chuyển động không để chiều cao cố định. Khi đóng, nội dung đang thu lại dùng `inert`; focus bên trong trả về summary. Giảm chuyển động dùng hành vi tức thời và không chạy animation. Tháo component hoặc thay prop `open` dọn animation/observer và trạng thái tạm.

Thành phần dùng cho FAQ, ghi chú dài, bảng biểu đồ, hũ đã ngừng, nhóm khoản thu thiếu, nguồn mục tiêu Quỹ, lịch sử và hướng dẫn cài đặt. Menu điều hướng/tài khoản giữ cơ chế popup riêng. FAQ đóng tất cả khi tải, mở nhiều câu độc lập. FAQ thành viên là section riêng với `h2`, lời dẫn và nền theo theme; FAQ khách dùng cùng nhịp đọc, vùng bấm và biểu tượng trạng thái. Tiêu đề section trong app dùng vai trò chữ chung; heading/illustration vẫn theo module.

## Nội dung phổ thông

Landing/preview nói về công dụng, dữ liệu mẫu và bước bắt đầu; bỏ giải thích cơ chế xác nhận lưu, cấu trúc mục lục và thao tác đóng menu khỏi FAQ không liên quan. Help giải thích sao lưu bằng kết quả và nơi giữ file.

Thông báo lưu/khôi phục chưa xác nhận nói rõ tình trạng và nút cần bấm. Vẫn giữ bản nháp, request identity, khóa tạm và cơ chế tránh ghi trùng. HTTP nhận nội dung không đọc được hiển thị “Chưa nhận được dữ liệu. Hãy thử lại.”; mã `INVALID_RESPONSE` và status không đổi. Không xử lý lại tên/ghi chú của người dùng. Tiếng Việt/Anh được cập nhật cùng nhau.

## Kiểm chứng

Các ca tự động nằm trong `landing-refinement.spec.ts`, cùng regression landing/ngôn ngữ, Help, layout/scroll, usability, biểu mẫu, năm module tài chính và backup. Kiểm cả vị trí trung gian của nội dung bên dưới khi mở FAQ, bấm nhanh, nội dung đổi trong animation, inert khi đóng, no-JavaScript và reduced motion.

Ảnh và số đo local đặt trong `artifacts/landing-refinement/`; kết quả cuối và giới hạn ghi trong [nhật ký validation](../07-validation.md). Dùng production build, PostgreSQL local cô lập, Auth double và trình duyệt mô phỏng. Không phải bằng chứng cloud deployment, Supabase Auth thật hoặc thiết bị vật lý.

Inspector thiết kế cũng được chạy ở 1440/768/390px. Các heuristic về số dòng slogan, palette, ảnh/video, kiểu thẻ, bóng, nhãn và mật độ motion xung đột với yêu cầu giữ nhận diện; được ghi riêng trong artifact review, không coi là lỗi hành vi hoặc thay toàn bộ thiết kế để làm đẹp điểm số.
