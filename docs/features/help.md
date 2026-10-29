# Help theo từng trang

Triển khai trong source ngày 20/10/2026. Help phục vụ người quản lý tài chính cá nhân, kể cả người mới; nội dung tiếng Việt, theo định hướng sản phẩm đã duyệt. Phạm vi 12 trang trong app: Tổng quan, Chi tiêu, Thu nhập, Tiết kiệm, Đầu tư, Quỹ an toàn, Cài đặt, Hồ sơ, Thu & chi, Tài khoản, Mục tiêu và Báo cáo.

## Cách dùng

Mở **Hướng dẫn** cạnh tiêu đề trang để đọc bài của trang hiện tại. Bảng nằm bên phải trên desktop (tối đa 640px), toàn màn hình dưới 768px. Mục lục đưa focus đến tiêu đề và cuộn mượt trong phần đọc; tùy chọn giảm chuyển động bỏ hiệu ứng cuộn. Nút đóng luôn nhìn thấy. Các nút **Giải thích** cạnh tiêu đề hoặc trong form mở đúng thuật ngữ/tác vụ. Đóng Help bằng nút, Escape hoặc nền quay lại form với bản nháp, bộ lọc, vị trí cuộn còn nguyên. Không tự bật khi vào trang. Đổi route đóng Help và đặt lại mục đọc.

Tinh chỉnh 28/10/2026: trên Tổng quan, **Đọc các chỉ số tháng** thuộc cụm tiêu đề tháng, nằm bên phải trên desktop và xuống hàng dưới nội dung tiêu đề ở màn hình không quá 639px, cách ít nhất 16px. Số hũ/trạng thái ghi nhận nằm dưới tên tháng. Nút tiếp tục mở mục thuật ngữ của Help Tổng quan ở cả trạng thái có dữ liệu và chưa có hũ.

Mỗi bài gồm: mục đích/đối tượng, tư duy sử dụng, thuật ngữ, hướng dẫn theo tác vụ, ví dụ minh họa và điểm dễ hiểu nhầm. Tác vụ gồm khi nào dùng, bước thao tác và kết quả/lưu ý. Các trang đang phát triển giới thiệu phạm vi dự kiến và chỉ đến chức năng hiện có, không giả thao tác chưa triển khai.

## Phân cấp nội dung và chuyển động

Cập nhật theo phản hồi ngày 20/10/2026: nút Hướng dẫn dùng biểu tượng sách và chữ nhẹ cạnh tiêu đề, giữ đầy đủ nhãn trên điện thoại. Sáu mục lớn có số 01–06, mục con dùng 3.1/4.1… và đường phân cách. Tư duy sử dụng có khối xanh dịu, ví dụ có nền riêng, điểm dễ nhầm có biểu tượng và nền màu đất. Từ khóa, quy tắc và số tiền minh họa được nhấn đậm hoặc màu theo theme; không dùng màu làm dấu hiệu duy nhất.

Bảng trượt vào từ phải trong 280ms, thu về trong 220ms; nền mờ chuyển cùng nhịp. Đóng khi đang mở tiếp tục từ vị trí hiện tại. Help giữ lớp modal và khóa cuộn đến hết hiệu ứng, rồi mới trả focus; có timeout dự phòng 300ms nếu không nhận animationend. Reduced motion bỏ hiệu ứng và đóng ngay. Đổi route gỡ bảng ngay, không giữ animation cũ.

Nội dung source hỗ trợ hai dấu nhấn có chủ đích: `**ý quan trọng**` và `==số liệu/quy tắc nổi bật==`. Renderer chỉ tạo strong và text bằng React, không diễn giải HTML hoặc link. Giữ nguyên định nghĩa quỹ dùng chung.

## Nội dung và phạm vi

- **Tổng quan:** đọc chỉ số tháng, hiện chỉ tổng hợp Chi tiêu.
- **Chi tiêu:** chia trước, chi sau; hũ là mục đích, phương thức là nơi/kênh giữ và chi, nhóm gom mục đích. Ghi rõ quy ước ngân hàng/ví/tiền mặt do người dùng tuân thủ, app không chuyển tiền thật. Đủ khởi tạo, phân loại, cấu hình, điều chỉnh, sử dụng, ngừng cấp, lịch sử, báo cáo và chốt năm.
- **Thu nhập:** thực nhận, nguồn cố định khác số tiền cố định, phát sinh một lần, chưa nhập khác 0, số tháng lưu thay thế; quản lý, nhập bổ sung và báo cáo.
- **Tiết kiệm/Đầu tư:** tách mở đầu, tiền góp và lãi/lỗ; chuyển nội bộ không sinh lợi nhuận, định giá có ngày. Mô tả đúng loại tài sản/giao dịch hiện có, sửa/hủy, lưu trữ và báo cáo; chốt/mở lại thuộc Tiết kiệm.
- **Quỹ an toàn:** dùng chung định nghĩa với `funds/content.ts`, hệ số người dùng chọn, nguồn sinh hoạt xác nhận trước khi áp dụng, số dư độc lập và nơi giữ.
- **Cài đặt/Hồ sơ:** sao lưu/khôi phục vào tài khoản trống, hồ sơ tùy chọn, file đầy đủ số liệu, giao diện, cài màn hình chính và trường hồ sơ có thể chỉnh.

Ví dụ có nhãn Minh họa, dùng số liệu cố định, không truy cập dữ liệu người dùng. Nội dung không nâng trạng thái module, không hứa kết nối ngân hàng, ghi offline hay tài sản ròng. Không lưu phiên Help hoặc bản nháp vào storage.

## Cấu trúc kỹ thuật

`src/features/help/` có `types.ts`, `registry.ts`, `content.ts`, `provider.tsx`, `text.tsx` và stylesheet. `HelpPageId` lấy slug catalog cộng profile; registry lấy tên/trạng thái từ catalog. Section/item có ID ổn định; `openHelp(pageId, sectionId?)` dùng chung với `HelpButton`. Nội dung tải bằng dynamic import khi mở, có trạng thái tải/lỗi/thử lại, không phụ thuộc API tài chính. Mục lục không thay URL.

Controller nằm trong SessionBoundary. Help mở bằng biến thể của native Modal dùng chung để dùng cùng stack, inert, khóa cuộn và phục hồi focus; alias ExpenseModal tiếp tục tương thích. Refactor 28/10 tách panel tải/hiển thị bài khỏi provider điều khiển. Nội dung giữ trong bundle source, không thêm API, database hay CMS. Mỗi trang private vẫn await pageAccess.

Public landing có FAQ dùng mô tả chung trong catalog; preview dùng phần giải thích rút gọn cố định cho năm tab, không mount controller của app hoặc gọi API tài chính.

## Duy trì và kiểm chứng

Khi thêm trang hoặc đổi nghiệp vụ, cập nhật bài tương ứng, ID tại điểm tra cứu và catalog nếu phạm vi thay đổi. Đối chiếu tên nút với UI, đặc biệt Lưu trực tiếp so với Xem trước/Xác nhận. Kiểm thử contract phát hiện thiếu bài/mục, trùng ID và khác biệt định nghĩa quỹ.

Browser tests trong `tests/browser/help.spec.ts` bao phủ đủ trang, không gọi API khi mở Help, dialog lồng nhau, định tuyến, lỗi API và tải chunk, theme, viewport, bàn phím, chữ lớn và preview công khai. Kết quả chạy thực tế, môi trường và giới hạn được bổ sung tại [validation](../07-validation.md).

## Chủ đề — 21/10/2026

Hướng dẫn Cài đặt giải thích năm chủ đề, chế độ sáng/tối dùng chung và phạm vi lưu theo trình duyệt. Bảng hướng dẫn kế thừa màu, icon trang trí theo chủ đề; cấu trúc, thao tác và quy tắc tài chính giữ nguyên.

## Anh/Việt — 22/10/2026

Help trong app dùng lựa chọn Tiếng Việt/English của Cài đặt. Hai bản giữ cùng ID bài, mục và tác vụ; bản tiếng Anh tải bằng dynamic import khi cần. Cài đặt có hướng dẫn đổi ngôn ngữ, định dạng số và giới hạn lưu trên trình duyệt. Không tra cứu API tài chính hoặc dịch nội dung người dùng. Xem [ngôn ngữ](localization.md).


## Hướng dẫn đổi ngôn ngữ trang chủ — 27/10/2026

Tác vụ đổi ngôn ngữ trong Cài đặt nay chỉ cả bộ chọn header công khai và radio Cài đặt. Kết quả bao gồm trang chủ khách/thành viên, preview, khung công khai và đăng nhập; hai bản Help giữ cùng ID tác vụ và giới hạn lưu theo trình duyệt.

### Nhất quán toàn ứng dụng — 28/10/2026

Đã đối chiếu nội dung, cỡ chữ, dialog/menu và bộ chọn kỳ với [quy tắc dùng chung](usability-consistency-2026-10-28.md). Giữ quy tắc nghiệp vụ, lịch sử và giới hạn chức năng; kết quả kiểm chứng ghi riêng theo môi trường.


## Responsive và nội dung phổ thông — 29/10/2026

Phần xem thử giải thích ngắn công dụng của Hướng dẫn; tài liệu sao lưu nói rõ kiểm tra file tải xuống và giữ file an toàn. Ghi chú dài và các phần mở rộng dùng primitive chung, giữ bàn phím/focus/no-JavaScript. Xem [quy tắc và kiểm chứng](responsive-disclosures-2026-10-29.md).

## Hướng dẫn Tổng quan — 29/10/2026

Help Việt/Anh bổ sung cách đọc năm module, kỳ hiện tại, giá trị đã biết, cá nhân hóa widget, chọn hũ, xem thử, Lưu/Hủy, xung đột bố cục và phạm vi backup. Giữ các anchor terms/read-overview/start-overview/privacy đang được dùng.

### Ghi giao dịch Đầu tư — 29/10/2026

Nút Hiểu vốn, giá trị và tiền chờ nằm cùng hàng công cụ gọn phía trên các nhóm nhập. Chọn loại giao dịch để xem các trường tương ứng; xem trước tác động rồi xác nhận lưu. Đóng form có thay đổi mở xác nhận trong ứng dụng và cho tiếp tục nhập; mở/đóng Help vẫn giữ bản nháp và ngữ cảnh form.

### Điều kiện khôi phục và làm trống — 29/10/2026

Help Cài đặt giải thích dữ liệu chặn gồm sổ/cấu hình/lịch sử/dữ liệu đã xóa hoặc hủy ở mọi năm. Xóa từng mục không làm tài khoản trống. Hướng dẫn hai cách: dùng tài khoản trống khác hoặc thao tác làm trống riêng sau khi lưu backup và xác nhận xóa toàn bộ; không tự import/gộp. Chưa có migration thì reset chưa được bật.
