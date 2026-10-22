# Rà soát bố cục và cuộn — 23/10/2026

Phản ánh ở Thu nhập được dùng làm ví dụ cho bốn nhóm lỗi: điều khiển mobile mất cân đối, nhãn tab bị ép xuống dòng, hàng bảng nở do nút, và toolbar cuộn cùng dữ liệu. Giữ giao diện hiện tại, Việt/Anh, các chủ đề và chế độ sáng/tối. Không thay đổi nghiệp vụ, API tài chính, schema hoặc dữ liệu cloud.

| Bề mặt | Kiểm tra và thay đổi |
| --- | --- |
| Thu nhập | Mũi tên hai đầu bộ chọn; tab ngang; hàng có ô thiếu cùng chiều cao cơ sở; chọn cột ngoài vùng cuộn; giữ nhập bổ sung và báo cáo. |
| Chi tiêu | Thanh nội dung và kiểu báo cáo dùng tab ngang; bảng báo cáo/tổng kết dùng scroller chung; nút cột riêng của bảng hũ tiếp tục đứng ngoài. Bảng số liệu biểu đồ giữ cuộn riêng. |
| Tiết kiệm | Tab workspace ngang; bảng diễn biến, danh mục và theo tháng dùng scroller chung với nhãn truy cập. |
| Đầu tư | Tab workspace ngang; bảng danh mục và báo cáo dùng scroller chung. |
| Quỹ | Tab chi tiết ngang; rà soát phân trang giao dịch và các điều khiển trong dialog. |
| Dialog dùng chung | Tab ngang; đưa tab đang chọn vào tầm nhìn bằng cuộn nội bộ, giữ cơ chế lưu vị trí đọc và panel. Bảng dữ liệu dùng scroller chung. |
| Cài đặt | Nhóm chọn hướng dẫn cài đặt dùng thanh ngang, giữ nhãn thiết bị đầy đủ; kiểm tra bố cục thẻ và biểu mẫu. |
| Tổng quan, Hồ sơ, Help, đăng nhập, trang dự kiến | Rà soát cấu trúc: không có bảng/tab cùng kiểu cần chuyển đổi; kiểm tra tràn ngang, chữ lớn và bố cục mobile. |
| Landing/preview | Tab preview ngang trên mobile, dọc trên desktop; dữ liệu minh họa cố định, không đọc tài khoản. Cập nhật FAQ về bố cục mobile. |

`tests/browser/layout-scroll.spec.ts` kiểm tra trên production build local, PostgreSQL và Auth double cô lập: viewport 320/375/390/430/768/1440, xoay ngang 844×390, chữ lớn, Việt/Anh, giao diện sáng/tối, Forest/Water, số tiền lớn, số 0, khoản thiếu và bảng đủ 12 tháng. Đo sai lệch hàng/nút ≤1px, kiểm tra thao tác tab bằng bàn phím, Escape/focus của popover, mở nhập bổ sung và điều hướng qua các module. Bộ `expense-presentation.spec.ts` bổ sung kiểm tra ẩn/hiện cột, khôi phục mặc định và bảng hũ.

Kết quả chạy được ghi theo môi trường tại [validation](../07-validation.md). Kiểm thử trình duyệt mô phỏng không xác nhận cloud, Supabase Auth thực hoặc thiết bị vật lý.
