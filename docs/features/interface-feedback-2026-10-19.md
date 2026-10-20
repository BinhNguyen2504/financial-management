# Rà soát giao diện toàn ứng dụng — 19/10/2026

Đợt này sửa các ví dụ được phản hồi và các lỗi cùng loại ở Chi tiêu, Thu nhập, Tiết kiệm, Đầu tư, Hồ sơ, đăng nhập và các thành phần dùng chung. Giữ phong cách Zen/Growth, các quy tắc tính tiền và lịch sử nghiệp vụ.

## Lựa chọn đã xác nhận

- Điều hướng lấy trạng thái từ catalog và thứ tự riêng: Tổng quan, Chi tiêu, Thu nhập, Tiết kiệm, Đầu tư, Quỹ an toàn, Cài đặt, rồi nhóm chưa triển khai. Quỹ an toàn đã có source implementation trong workspace khi bắt đầu thực hiện nên không bị gắn tag planned. Mục tiêu đứng đầu nhóm Đang phát triển, tiếp theo Thu & chi, Tài khoản và Báo cáo.
- Sidebar desktop thu thành dải icon; header sticky giữ nút ẩn tiền trong tầm thao tác. Mobile dùng menu gọn. Dialog tiền tiếp tục có phạm vi hiện riêng.
- Theme Sáng/Tối/Theo hệ thống, trạng thái sidebar và cột hiển thị lưu trên trình duyệt. Các khóa storage chỉ chứa tùy chọn giao diện; không lưu tiền, giao dịch hoặc bản nháp. Theme mặc định theo hệ thống, khởi tạo trước first paint theo guide Next.js đang cài. Storage bị chặn vẫn dùng được trong phiên.
- Chi tiêu chọn được 2000–2099. Năm ngoài phạm vi sổ có thông báo trống, không tự tạo sổ, không mở quyền chỉnh sửa. Năm đã chốt tiếp tục chỉ xem.

## Đối chiếu 33 phản hồi

| # | Kết quả triển khai |
| --- | --- |
| 1 | Thứ tự menu thống nhất desktop/mobile; planned có tag và ở cuối. |
| 2 | Hồ sơ quay lại trang nội bộ được truyền từ menu tài khoản; đường dẫn không hợp lệ trở về Tổng quan. |
| 3 | Header dùng chữ đậm, màu chính và icon để nhận diện Tài chính cá nhân. |
| 4 | Giải thích rõ chưa nhập khác 0 ₫; 0 là xác nhận không có thu nhập trong tháng. |
| 5 | Ghi chú cấu hình có khoảng cách riêng trước danh sách; tiêu đề/bộ lọc tự xuống hàng. |
| 6 | Sửa/xóa ở danh sách có icon, tên truy cập và tooltip. |
| 7 | Bảng ảnh hưởng dùng cột ngày/tháng gọn, Trước/Sau dành chỗ cho nội dung. |
| 8 | Danh mục ngừng có badge/nền/viền riêng; không hiện thao tác ngừng ở kỳ đã ngừng. |
| 9 | Form sửa chưa thay đổi không xem trước; không tạo bảng 0 dòng. |
| 10 | Sidebar thu/mở bằng nút header, nhớ lựa chọn sau reload. |
| 11 | Select báo cáo đủ chỗ; cảnh báo chỉ rõ tháng/danh mục thiếu. |
| 12 | Chi tiết phát sinh căn cột theo nội dung và tiền; sửa/xóa bằng icon. |
| 13 | Ô thiếu hợp lệ trong ma trận mở form đúng danh mục/tháng, giữ bộ lọc sau lưu. |
| 14 | Khoản thiếu dùng badge/callout có icon, có đường nhập bổ sung. |
| 15 | Cột/đường có tooltip khi hover, focus hoặc chạm; select được dành chỗ cho mũi tên. |
| 16 | Footer giới thiệu hỗ trợ web/thiết bị di động và copyright Bình Nguyễn. |
| 17 | Card cố định chưa nhập có viền, nền, icon cảnh báo và CTA. |
| 18 | Hủy/Lưu có icon và text; sửa rồi hoàn tác vô hiệu Lưu/Xem trước. |
| 19 | Thu phát sinh có nhãn/icon và màu nền/viền riêng so với thu cố định. |
| 20 | Nút ẩn tiền ở header sticky; tooltip đang mở cập nhật khi ẩn tiền. |
| 21 | Năm có đủ lựa chọn, phân biệt chưa có dữ liệu và đã chốt. |
| 22 | Phương thức có logo thương hiệu hoặc icon; nhóm có icon; lựa chọn có xem trước. |
| 23 | Phân loại dùng icon sửa/xóa; chiều cao dialog ổn định khi đổi tab. |
| 24 | Tab có trạng thái chọn qua nền, viền và tương phản chữ. |
| 25 | Field bắt buộc có dấu/chỉ báo; field tùy chọn giữ nhãn phù hợp. |
| 26 | Lỗi tại field có màu/viền, thông báo và liên kết từ tổng hợp lỗi. |
| 27 | Phương thức/nhóm là select đóng; có luồng thêm phân loại lồng nhau giữ bản nháp hũ. |
| 28 | Tiền VND chặn ký tự không hợp lệ, nhận dán có phân cách, bỏ số 0 đầu khi blur/submit; không đổi trống thành 0. |
| 29 | 42 biểu tượng hũ có tên và ô tìm kiếm; giữ lựa chọn tự động theo tên. |
| 30 | Đổi biểu tượng/sửa/ngừng có icon và mức nhấn mạnh riêng. |
| 31 | Hướng dẫn cài đặt có bốn bước và hình minh họa cho iPhone/iPad, Android, máy tính. |
| 32 | Bảng rộng có cột hiển thị/khôi phục mặc định; khóa định danh và thao tác; card Chi tiêu dùng cùng tùy chọn. |
| 33 | Theme dùng chung cho app, dialog, biểu đồ, landing và login. |

## Quy chuẩn để rà soát các thay đổi sau

Đánh giá **trạng thái + thao tác + bố cục + khả năng hoàn thành công việc**. Với một lỗi ví dụ, tìm các thành phần cùng loại trên toàn ứng dụng; kiểm tra trạng thái trống, đã nhập 0, còn thiếu, tương lai, đã ngừng, chỉ xem, chưa đổi, lỗi field, đang lưu, lỗi mạng và xung đột phiên bản. Không chỉ sửa câu chữ hoặc một selector.

- Mọi nút icon có tên truy cập; các thao tác tài chính cần xác nhận vẫn có text.
- Không dùng màu làm dấu hiệu duy nhất; trạng thái có icon/nhãn rõ.
- Số tiền dùng chuỗi/BigInt, căn phải; nội dung chữ căn trái; nhóm thao tác giữ vị trí ổn định. Không căn chữ như tiền trong bảng ảnh hưởng.
- Chỉ các ô thu nhập đang hoạt động, đến hạn và chưa ghi số mới được nhập nhanh. Không suy ra thiếu chỉ từ dấu `—`; tháng ngoài thời gian hoạt động hoặc tương lai không trở thành khoản nợ nhập liệu.
- Tùy chỉnh cột không đổi bộ lọc, tổng hoặc CSV. Cột định danh/thao tác không được ẩn.
- Giữ dialog cha/con, focus và vị trí cuộn. Bảo vệ thao tác đang lưu và hành vi Safari trong `pointer-focus.ts`.
- Bảng rộng cuộn trong vùng riêng; tiêu đề và select phải xuống hàng trước khi gây tràn trang. Kiểm tra cả layout viewport và thao tác chạm trên mobile.

## Metadata logo và tương thích dữ liệu

Migration `202610190002_label_visuals.sql` bổ sung `expense_labels.brand_key` và `icon_key` nullable. Không sửa số tiền, quy tắc hũ hay snapshot năm đã chốt. `Label`/`upsertLabel` nhận `brandKey`/`iconKey` tùy chọn; repository đọc/ghi cùng giao dịch và RLS hiện có. Client cũ bỏ qua metadata khi đổi tên không làm mất lựa chọn đã lưu.

Select chỉ cho chọn phân loại hiện có. Khi danh sách phân loại đã được thiết lập, server cũng từ chối lựa chọn mới không thuộc danh sách và trả `fieldErrors`; giá trị lịch sử không còn trong danh sách được giữ khi sửa trường khác. Các API/tập lệnh cũ trước thời điểm thiết lập catalog vẫn có thể khởi tạo dữ liệu cũ; nhập backup không tự gán lại phân loại.

Schema backup hiện hành đọc được file cũ thiếu metadata (mặc định null), xuất/import file mới giữ logo/icon. Logo được tải từ website/CDN chính thức và phục vụ từ `/brands/`; nguồn từng file ở `public/brands/sources.json`. Không gửi tên phương thức hoặc tài chính của người dùng tới dịch vụ logo bên ngoài. Logo thuộc các chủ thương hiệu tương ứng và được giữ tỷ lệ/màu gốc.

Áp dụng migration bằng quy trình deployment để lưu đầy đủ logo/icon trên cloud. Bản sửa tương thích ngày 20/10 cho phép Chi tiêu tiếp tục đọc/lưu dữ liệu không có metadata khi schema cũ; yêu cầu lưu logo/icon mới trả `LABEL_VISUALS_MIGRATION_REQUIRED` và giữ bản nháp. Xem [kiến trúc tương thích schema](../02-architecture.md#tương-thích-schema-logo-chi-tiêu--20102026). Đợt này chỉ chạy migration với PostgreSQL local; không tự chạy SQL cloud.

## Nghiệm thu

Các ca mới nằm trong `tests/form-experience.test.ts` và `tests/browser/interface-feedback.spec.ts`. Browser dùng production build riêng, PostgreSQL thật và Auth contract double local. Báo cáo số test cuối cùng được bổ sung tại `docs/07-validation.md`; không suy diễn thành chứng cứ cloud/deployment hoặc thiết bị vật lý.

Lượt đầy đủ ngày 20/10 đạt 167 unit tests, 67 PostgreSQL tests, typecheck, production build và **324/324 browser tests** trên bốn profile, gồm 16 ca mới chuyên biệt cho phản hồi này. Xem [bằng chứng và giới hạn](../07-validation.md#hoàn-tất-33-phản-hồi-giao-diện--20102026).

Lượt tiếp tục ngày 20/10 giữ các thay đổi Fund, Help và tương thích schema đã có trong workspace. Theme bootstrap chạy đầu body trước first paint; metadata màu theme do React quản lý để tránh hydration mismatch. Ô nhập nhanh và vùng bảng tạo containing block để nội dung trợ năng không làm trang mobile tràn ngang. Những trường hợp này được kiểm cùng luồng nghiệp vụ, không chỉ bằng ảnh tĩnh.
