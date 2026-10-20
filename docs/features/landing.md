# Landing và xác thực truy cập

Cập nhật 19/10/2026. Landing tiếng Việt ở `/`, dành cho mọi người; tên Financial Manager, hướng sản phẩm tinh tế và câu chuyện công cụ từ nhu cầu thật.

## Nội dung và trạng thái

Hero → preview → Thu nhập/Chi tiêu/Tiết kiệm/Đầu tư/Quỹ an toàn → câu chuyện → trạng thái phát triển/FAQ → CTA. Nền kem, xanh xô thơm, Nunito, dark mode hệ thống, Lucide/SVG và reduced motion. Không bịa người dùng, lời chứng thực, tiểu sử hay hứa hẹn lợi ích đầu tư.

`src/features/catalog.ts` giữ tên, mô tả và trạng thái module: `implemented`, `partial`, `planned`. Thu nhập/Chi tiêu/Tiết kiệm/Đầu tư/Quỹ an toàn có triển khai; Tổng quan và Thiết lập có một phần. Trạng thái này nói về source, không chứng minh đã triển khai cloud. Không quảng bá tài sản ròng toàn hệ thống, kết nối ngân hàng hoặc ghi dữ liệu offline như chức năng hiện có.

## Preview

Năm tab Thu nhập, Chi tiêu, Tiết kiệm, Đầu tư và Quỹ an toàn, mở đầu Chi tiêu. Có nhãn Dữ liệu minh họa, tháng cố định 06/2026 và số liệu cố định. Không gọi API tài chính, dùng workspace thật, đọc tài khoản hoặc ghi dữ liệu. Chuyển tab bằng click/mũi tên/Home/End; nút che tiền chỉ tác động preview, không lưu localStorage, giữ hình dạng biểu đồ. Giá trị bị che được loại khỏi nội dung hiển thị và accessibility tree.

Đổi giao diện sản phẩm thì rà soát preview cùng thay đổi. Đây là mô phỏng gọn, không phải sandbox thực thi đầy đủ nghiệp vụ. Nội dung và preview mặc định render phía server; chuyển tab/form cần JavaScript.

## Luồng truy cập

| Trạng thái | Hành vi |
| --- | --- |
| Khách ở `/` | Xem landing/preview, nút Đăng nhập; CTA vào /overview qua server guard |
| Đã đăng nhập ở `/` | Vẫn ở landing, có menu avatar/hồ sơ/đăng xuất và Vào ứng dụng |
| Mở trang ứng dụng khi chưa đăng nhập | Redirect /login?next=<đường dẫn ứng dụng đã encode> trước khi render workspace |
| Đăng nhập thành công | Về next trong whitelist; mặc định /overview |
| Đã đăng nhập mở /login | Redirect đến next hợp lệ, mặc định /overview |
| Auth thiếu cấu hình | Trang login giải thích chưa kết nối; không mở ứng dụng |
| Auth tạm gián đoạn | Trang bị bảo vệ/login hiện retry, landing vẫn đọc được; không tự coi là logout |
| Đăng xuất | Về /; nếu Auth đã xóa phiên local thì rời ứng dụng kể cả remote revoke báo lỗi |

Whitelist dùng đường dẫn chính xác của catalog và /profile; từ chối URL ngoài, query/hash, route lạ, login/callback và vòng lặp. Proxy refresh cookie, mỗi page xác minh getUser trước render, API tiếp tục xác minh owner/RLS độc lập. Bearer không cấp quyền mở trang HTML. Page guard không được thay bằng layout/client check.

Landing HTML không chờ Auth phía server: avatar được xác minh trong trình duyệt, giữ nội dung công khai đọc được khi dịch vụ Auth gián đoạn. Proxy không gọi Auth cho `/` và ảnh Open Graph. Public/app layout tách route group, giữ nguyên URL. App và login noindex. `APP_ORIGIN` đặt origin triển khai cho URL chia sẻ Open Graph; khi để trống, metadata dùng localhost:3000. PWA start_url /overview, chỉ cache offline.html, không cache dữ liệu tài khoản. Không đổi API tài chính hoặc database.

## Duy trì và nghiệm thu

Theo AGENTS.md, mỗi thay đổi sản phẩm cần rà soát catalog, landing, preview, README và docs liên quan. Đây là bước phát triển cùng source, không có CMS hoặc tác vụ nền cập nhật nội dung.

Kiểm tra đăng nhập OTP/callback, whitelist, mọi route ứng dụng, profile/logout, Auth gián đoạn/hết phiên, preview độc lập API, desktop/mobile/WebKit, dark mode, reduced motion, zoom và no-JavaScript. Kết quả thực tế và giới hạn ghi tại [validation](../07-validation.md); Auth double/PostgreSQL local không thay bằng chứng cloud hoặc thiết bị thật.

## Bổ sung Đầu tư — 18/10/2026

Catalog/landing giới thiệu thêm Đầu tư đã triển khai trong source: tổng danh mục, tiền chờ và lãi/lỗ; không hứa từng mã, giá trực tuyến, DCA hoặc liên kết toàn bộ tài sản. Preview thêm tab Đầu tư với tài sản minh họa 72 triệu = cổ phiếu 65 triệu + tiền chờ 7 triệu, ngày định giá 30/06/2026. Dữ liệu là hằng số, không fetch API tài chính hoặc đọc tài khoản. Privacy Mode của preview tiếp tục độc lập. Bàn phím End chuyển đến tab cuối Đầu tư.


## Bổ sung backup toàn tài khoản — 18/10/2026

Đã rà soát copy và preview minh họa: bổ sung FAQ về chuyển dữ liệu từ backup sang tài khoản mới và ghi chú Cài đặt trong preview. Không thêm nút export/import lên landing; preview tiếp tục dùng dữ liệu cố định, không gọi API tài khoản.


## Rà soát loading — 18/10/2026

Avatar public dùng vòng xoay chung khi xác minh hồ sơ; landing vẫn đọc được ngay. Catalog, copy và preview đã đối chiếu: không đổi trạng thái module hoặc số liệu minh họa; preview chuyển tab bằng dữ liệu hằng số, không tạo request hay trạng thái tải giả. Loading mới của workspace không đọc dữ liệu tài khoản vào preview.


### Rà soát tải backup và Cài đặt — 18/10/2026

Rà soát copy/preview cùng sửa Cài đặt: FAQ nhắc liên kết lưu trực tiếp, preview giữ ghi chú thao tác ở Cài đặt. Không có trigger tải/nhập hoặc API tài khoản trong preview.


Ngày 18/10/2026 rà soát cùng thay đổi dialog: catalog bổ sung khả năng đọc chi tiết/lịch sử; copy landing và preview nhấn mạnh số liệu chính, nhãn bảng và ngày định giá. Preview vẫn chỉ minh họa cố định, chuyển tab/che tiền; không mô phỏng đầy đủ dialog và không gọi API tài chính.


### Rà soát cập nhật ngầm — 19/10/2026

Đã đối chiếu catalog, copy landing và preview với thay đổi quay lại ứng dụng: khả năng tài chính, trạng thái module và số liệu minh họa không đổi. Không quảng bá đồng bộ tức thời; Tổng quan/Chi tiêu/Thu nhập kiểm tra khi quay lại theo độ mới của dữ liệu. Preview vẫn chuyển tab bằng hằng số và không đăng ký cơ chế foreground hoặc gọi API tài khoản. README, kiến trúc, hướng UX và đặc tả phản hồi/Thu nhập/Chi tiêu cập nhật cùng source.


## Preview Quỹ an toàn — 19/10/2026

Preview có thêm tab Quỹ an toàn với bộ số liệu cố định: living expense 9 triệu, Emergency 27/54 triệu, Rainy Day 6,75/9 triệu, Sinking 9/18 triệu, tổng dự phòng 42,75 triệu. Cây Emergency ở 50%; hỗ trợ ẩn tiền và điều hướng tab bằng phím. Không đọc account API.

## Đồng bộ giao diện — 19/10/2026

Landing/login dùng cùng lựa chọn theme trên trình duyệt. Preview vẫn cố định, phân biệt nhãn thu cố định/phát sinh và giới thiệu nhắc khoản thiếu; không truy cập API tài chính. Footer giới thiệu hỗ trợ web/thiết bị di động và copyright Bình Nguyễn. Catalog cập nhật mô tả Thu nhập/Cài đặt và nhãn planned.

## Giới thiệu Help — 20/10/2026

FAQ giải thích cách dùng Hướng dẫn và giữ bản nháp khi tra cứu. Preview có phụ lục thu gọn riêng cho từng tab, nội dung cố định và nhãn minh họa rút gọn; không dùng HelpProvider của workspace, không đọc dữ liệu tài khoản hoặc API tài chính. Catalog thêm mô tả khả năng hướng dẫn dùng chung, giữ nguyên trạng thái module.


### Trình bày Help — 20/10/2026

FAQ/catalog mô tả vị trí mới cạnh tiêu đề; phụ lục preview nói rõ mục lục đánh số và nhấn ý chính. Preview vẫn dùng nội dung cố định, không đọc tài khoản.
