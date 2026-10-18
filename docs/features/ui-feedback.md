# Rà soát UI/UX — 17/10/2026

Giữ phong cách Zen, bảng Chi tiêu trên desktop và thẻ trên điện thoại.

- Bảng: tiêu đề cột tiền và giá trị cùng căn phải; số dùng tabular numerals. Ô tiền và nhóm thao tác căn giữa theo chiều cao dòng. Cột thao tác giữ vị trí nút sửa thống nhất, có chỗ cho Dùng tiền. Bảng rộng cuộn trong vùng riêng.
- Thu nhập: tên/mô tả, số tiền và nút thao tác có vùng riêng trên desktop; xếp dọc trên điện thoại. Không lặp lại ghi chú khi nội dung giống mô tả. Giảm chiều cao dòng tổng tiền và khoảng trống không cần thiết ở phần đầu trang.
- Thông báo lỗi: chữ và nút thử lại cách nhau rõ ràng, tự xuống hàng trên màn hình nhỏ. Thử lại tải dữ liệu mà không chuyển khỏi trang.
- Dialog dùng chung: bấm nền hoặc Escape đóng lớp trên cùng; nút X và Hủy vẫn hoạt động. Bắt đầu kéo/chọn chữ bên trong rồi thả ra ngoài không đóng nhầm. Trong lúc kiểm tra/lưu bất đồng bộ, thao tác đóng được chặn đến khi có kết quả.
- Dialog con: giữ dialog cha và vị trí cuộn khi mở form sửa/xóa/biểu tượng/phân loại. Hủy, Escape hoặc bấm nền quay lại cha và khôi phục focus. Khi lưu thành công, kết thúc luồng như trước và tải lại dữ liệu. Lớp bị che có inert/aria-hidden; từng dialog có ID tiêu đề riêng. Khóa cuộn nền đến khi đóng dialog cuối.
- Safari/WebKit: quản lý focus ở mousedown, tránh hành vi mặc định làm nút mất focus trước click. Khắc phục focus không quay về nút mở và trường hợp menu tài khoản đóng trước sự kiện click Đăng xuất sau khi điều hướng bằng bàn phím.
- Minh họa: tám cảnh SVG dùng chung bảng màu sáng/tối — chăm cây, hũ, mầm non, giỏ thu hoạch, vườn cây, đường tới mục tiêu, nhà kính và đá cân bằng. Phân bố theo nội dung trang; hình trang trí không tham gia cây truy cập. Giới hạn kích thước minh họa để không tạo khoảng trống lớn trên điện thoại.

Kiểm thử hồi quy mới nằm trong `tests/browser/ui-feedback.spec.ts`. Chạy bằng Node 22.12.0:

```sh
TEST_WEBKIT=1 npm run test:e2e
```

Runner dùng production build Next riêng, PostgreSQL và Auth double local. Kiểm tra gồm desktop Chromium, Chromium mô phỏng điện thoại và WebKit mô phỏng iPhone; sáng/tối, reduced motion, viewport 320/768/1024/1440/1920, đo tọa độ căn cột/nút, lỗi mạng/thử lại và dialog lồng nhau. Kết quả này không thay thế nghiệm thu cloud hoặc thiết bị vật lý.


## Loading trực quan — 18/10/2026

- Component dùng chung `src/components/loading.tsx`: vòng xoay CSS nhỏ và thông báo tải có `role="status"`, `aria-atomic`. Vòng xoay trang trí không được đọc thêm bởi screen reader.
- Dùng cho Tổng quan, Thu nhập, Chi tiêu, Tiết kiệm, Đầu tư, hồ sơ, kiểm tra trạng thái và xem trước backup trong Cài đặt; avatar có vòng xoay khi xác minh tài khoản. Tiết kiệm hiện trạng thái khi cập nhật lại cả khi đã có dữ liệu.
- Các nút đăng nhập/đăng xuất, xem trước/lưu bốn module, lưu hồ sơ, xuất/nhập backup hiện vòng xoay cạnh nhãn khi chờ server; giữ khóa thao tác cũ và thêm `aria-busy`. Chỉ báo thành công sau phản hồi thật.
- Tải lại Tổng quan/Thu nhập/Chi tiêu bật lại loading; lỗi kết thúc vòng xoay và giữ nút thử lại. Không đặt timeout giả hoặc che nội dung đã tải bằng overlay.
- Màu theo token sáng/tối; vòng xoay không co lại khi chữ xuống dòng. Reduced motion tắt quay, vẫn giữ biểu tượng và lời nhắn dễ đọc.

Kiểm chứng loading trong `tests/browser/loading.spec.ts`: giữ request để quan sát trạng thái chờ, trả kết quả thật, lỗi/thử lại, disabled/aria-busy, sáng/tối, giảm chuyển động, điện thoại 375px và xoay ngang. Xem kết quả theo ngày tại [validation](../07-validation.md).

Đã rà soát catalog, landing copy và preview: trạng thái module và khả năng tài chính không đổi; preview public vẫn là dữ liệu cố định, chuyển tab ngay không cần giả lập loading. Avatar của landing dùng cùng vòng xoay xác minh tài khoản. README và tài liệu UX đã cập nhật cùng source.


## Dialog có nhiều dữ liệu — 18/10/2026

- Bốn module dùng chung khung native dialog: header luôn hiện, một vùng `.dialog-body` cuộn, footer thao tác nằm ngoài vùng cuộn và vẫn liên kết với form qua ID. Detail tối đa 960px, form 760px, xác nhận 480px; điện thoại dưới 640px gần toàn màn hình, có safe area.
- Tóm tắt số liệu đặt trước danh sách; nhãn, ngày dữ liệu, tiền và đề mục có cấp độ riêng. Bảng có tiêu đề cột/căn tiền trên desktop, chuyển thành thẻ có nhãn trên mobile. Ghi chú dài có disclosure để đọc đầy đủ.
- Tab có số lượng và điều hướng phím mũi tên/Home/End, giữ trạng thái các panel. Danh sách tối đa 20 dòng/trang, mới trước; tìm tên/nội dung/ghi chú không dấu, bộ lọc loại/trạng thái/ngày khi phù hợp, đếm kết quả và thông báo không khớp. Không cắt bỏ lịch sử cũ. Preview cũng phân trang, nhãn Trước/Sau và giữ quyền xác nhận khi đổi trang.
- Tiết kiệm: tiền/ví có lịch sử; vàng có Đợt vàng/Giao dịch, tiền gửi có Sổ tiền gửi/Giao dịch. Mặc định còn nắm giữ/đang gửi, có xem tất cả và đã bán/tất toán. Chỉ lấy giao dịch đến ngày số dư đang xem. Biến động tiền theo phía tài khoản gồm phí/thuế, không suy dấu từ tiền ròng toàn giao dịch. Lãi trả ra ngoài sổ và lãi nhập gốc/tái tục có nhãn riêng.
- Đầu tư: tổng hợp danh mục trước lịch sử; chi tiết giao dịch hiện trạng thái hiện hành và ảnh hưởng trước/sau, revision nằm trong tab riêng, mới nhất trước. Giao dịch hủy có trạng thái và không hiển thị tác động như đang có hiệu lực.
- Chi tiêu: tab Theo tháng/Các lần sử dụng/Lịch sử thay đổi, tab sử dụng chỉ cho hũ tích lũy; quản lý hũ nằm ở phần riêng. Phương thức/nhóm có tab, tìm kiếm và phân trang. Thu nhập phát sinh có tổng kỳ và danh sách có tìm kiếm, không thêm tab rỗng.
- Mở màn hình con giữ parent inert/aria-hidden và trạng thái đọc. Hủy/đóng hoặc lưu thành công quay lại màn hình cha, cập nhật số liệu, giữ tab/bộ lọc/trang/vị trí. Khi nút cũ bị xóa, focus trở về điều khiển còn tồn tại trong parent. Hành vi lưu này thay thế việc kết thúc cả luồng đã ghi ở ngày 17/10.
- Chế độ riêng tư che giá trị và khối lượng trong summary, bảng, preview và nội dung hỗ trợ đọc; không thêm số thô vào aria-label/title. Preview public vẫn dùng hằng số, không đọc tài khoản.

Kiểm thử chuyên biệt: `tests/browser/dialogs.spec.ts`; hồi quy bốn module, loading, tooltip và dialog stack. Bằng chứng chạy và giới hạn môi trường được ghi thêm tại `docs/07-validation.md` sau kiểm chứng.
