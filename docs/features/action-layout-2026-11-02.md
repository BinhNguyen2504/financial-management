# Bố cục thao tác toàn ứng dụng — 02/11/2026

## Lỗi và nguyên nhân

Production build local trước sửa cho thấy khoảng cách mô tả → nút tạo ở trạng thái trống Mục tiêu và khoảng cách giữa Hủy/Xem trước trong dialog đều bằng 0px tại 320/390/768/1440px. Reset margin của đoạn văn làm lộ các khối thiếu layout. Footer Modal chỉ giãn cách khi caller tự bọc đúng class của Chi tiêu hoặc Quỹ; Mục tiêu truyền fragment trực tiếp.

Cùng lớp lỗi xuất hiện ở thông báo thử lại Quỹ/Mục tiêu, các trạng thái Hồ sơ, thông báo kết nối Cài đặt, nút bắt đầu xây quỹ và nút ưu tiên. WebKit còn thiếu focus về nút mở Mục tiêu sau khi đóng dialog bằng chuột/chạm. Rà hồi quy phát hiện ô ngày Đầu tư bị shorthand font của module ghi đè về 14px; quy tắc typography chung nay có độ ưu tiên đủ để giữ ô nhập/select/textarea ở 16px.

## Quy tắc dùng chung

- Token `--action-gap` 12px cho nhóm nút; `--action-compact-gap` 8px cho cặp icon; `--action-content-gap` 16px giữa nội dung và thao tác; `--action-section-gap` 24px giữa các vùng độc lập.
- `Modal` tự bọc `footer: ReactNode` trong `.dialog-footer-actions`. Caller truyền nút/fragment, không thêm `.expense-actions` hoặc `.fund-actions`. Desktop căn cuối. Mobile ≤640px chia đều khi đủ chỗ hoặc xuống dòng; từ ba nút trở lên, nút chính cuối cùng chiếm hàng riêng. Thứ tự DOM, hiển thị và Tab giống nhau.
- Header/footer cố định, body cuộn bên trong và giữ vùng an toàn ở đáy. Nhãn dài được xuống dòng; nút tối thiểu cao 44px. Một nút vẫn căn cuối trên desktop.
- `.action-message` nhóm nội dung và nút trong trạng thái trống/lỗi; `.action-group` và `.action-group-separated` nhóm nút tách khỏi đoạn văn. Không dùng khoảng trắng JSX hoặc margin mặc định của `p` để tạo khoảng cách.
- Lỗi tải Quỹ/Mục tiêu dùng `p` và `.expense-feedback`, đứng cạnh hoặc xuống hàng với khe tối thiểu 16px. Cài đặt tách thông báo khỏi thử kết nối và khôi phục sau reset.
- Cột icon giao dịch Quỹ giữ 96px = 44 + 8 + 44; không áp 12px vào cột này. Nút ưu tiên Quỹ dùng grid tên co giãn + 44px + 44px, khe 8px; tên dài xuống dòng.
- Nút Help có giới hạn chiều rộng và nhãn tự xuống dòng: Firefox/chữ 200% giảm tràn Quỹ từ 31px về 0px. Header nhỏ giữ khoảng riêng cho logo khi phóng chữ, cho phép xuống hàng khi thiếu chỗ; menu tài khoản bám chiều cao header thực tế thay vì top cố định.
- Footer và nút mở Mục tiêu dùng `focusPointerControl`, giữ tương tác WebKit, focus quay về và ngữ cảnh dialog cha. Hủy/Quay lại/preview/xác nhận không đổi hành vi lưu; bỏ nháp có màu nguy hiểm.

## Cách rà soát từ ví dụ của người dùng

1. Xem ví dụ là một lớp lỗi: tìm component chung và mọi màn hình có cấu trúc tương tự.
2. Xác định nút tác động vào nội dung nào; đánh giá vị trí, nhóm, thứ tự và phân biệt chính/phụ.
3. Kiểm tra trạng thái trống, có dữ liệu, lọc không kết quả, lỗi/thử lại, loading/disabled, xem trước, xác nhận và dialog con; bao gồm cả một nút và nhiều nút.
4. Đo hình chữ nhật render, khoảng cách khi cùng hàng/xuống hàng, kích thước, tràn/chồng lấn, nhãn dài và cột cố định. Xem ảnh thực tế, không chỉ kiểm tra nút có bấm được.
5. Rà desktop/tablet/mobile/màn hình ngang, vi/en, sáng/tối, năm theme và chữ phóng lớn; kiểm tra bàn phím/focus trên WebKit và Firefox.
6. Chạy production build vì thứ tự CSS có thể khác dev. Khi test thất bại, đối chiếu selector với UI, ảnh/trace và snapshot source/test trước khi sửa product.

## Phạm vi và bằng chứng

Rà Tổng quan, Chi tiêu, Thu nhập, Tiết kiệm, Đầu tư, Quỹ an toàn, Mục tiêu, Cài đặt, Hồ sơ, các trang dự kiến và public/login/Help. Các nhóm đã có khoảng cách phù hợp giữ bố cục hiện tại.

`tests/browser/action-layout.spec.ts` đo trạng thái trống, footer 2/3/4 nút, footer một nút của quản lý phân loại, lỗi/hồi phục, ưu tiên Quỹ, bản nháp/focus, tài khoản local có dữ liệu và locale/theme/cỡ chữ. Suite hiện có kiểm tra luồng lưu, bảng, Help, public/login và backup/reset. Xem kết quả và giới hạn từng lượt tại [validation](../07-validation.md).

Đã đối chiếu catalog, landing hai biến thể, preview, README và tài liệu UX/kiến trúc. Catalog làm rõ Quay lại → xác nhận trong Mục tiêu; Help preview giải thích thao tác trong ứng dụng thật. FAQ hai landing bổ sung Mục tiêu vào tính năng hiện có. Preview giữ số liệu cố định, không thêm nút lưu giả hoặc đọc API tài chính tài khoản.

Không đổi API tài chính/schema/migration và không ghi/reset cloud. Runner dùng PostgreSQL/Auth double riêng, chụp source vào artifacts trước build; đây không phải bằng chứng cloud hoặc thiết bị vật lý.
