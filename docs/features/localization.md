# Logo và ngôn ngữ — 22/10/2026

## Trải nghiệm

Logo hũ tích lũy kết hợp đồng xu có một hình dùng chung trên sidebar, mobile, trang giới thiệu, preview, favicon và icon PWA/Apple. Màu than `#292724` và ngà `#F7F3EB` đảo theo nền sáng/tối, độc lập năm chủ đề. Icon cài app dùng nền than cố định; tên Financial Manager giữ nguyên. Master SVG ở `public/icons/icon.svg`; component `AppLogo` dùng cùng đường nét. Chạy `node scripts/generate-app-icons.mjs` bằng Node 22 để tạo lại PNG từ SVG với sharp có trong bộ cài Next.js; maskable và Apple có nền kín.

Cài đặt → **Ngôn ngữ / Language** có Tiếng Việt và English, áp dụng ngay kèm thông báo xác nhận. Tiếng Việt mặc định. Phạm vi: mọi workspace, hồ sơ, trang dự kiến, Help, biểu đồ, tooltip, accessibility, lỗi/thông báo và nội dung riêng từng theme. Cập nhật 27/10/2026: biểu mẫu đăng nhập bằng mã email theo lựa chọn Việt/Anh đã lưu. Cập nhật 27/10/2026: bộ chọn Tiếng Việt/English trên header công khai áp dụng ngay cho cả landing khách/thành viên, preview và khung giới thiệu, dùng chung lựa chọn với Cài đặt và đăng nhập. Nội dung người dùng nhập giữ nguyên.

Lựa chọn `fm-locale` trong localStorage theo origin và cookie cùng tên phục vụ SSR; không đồng bộ tài khoản, không vào backup. Cookie là tùy chọn trình bày, không cấp quyền. Không đổi URL; mỗi trang vẫn await `pageAccess()`. Giữa các tab dùng storage event; lưu trữ bị chặn vẫn đổi được trong phiên, dùng cookie khi có thể. Vùng app khai báo `lang`, SSR và client khởi đầu từ cùng cookie hợp lệ; khi chưa có cookie, nhận lựa chọn localStorage. Cookie mới được ưu tiên sau khi localStorage bị chặn tạm thời, để lựa chọn cũ không ghi đè lần đổi mới.

## Định dạng và bản nháp

| | Tiếng Việt | English |
|---|---|---|
| Locale | vi-VN | en-GB |
| Tiền | 1.000.000 ₫ | 1,000,000 ₫ |
| Số lượng | 1,25 | 1.25 |
| Ngày | 22/10/2026 | 22/10/2026 |

VND nguyên và múi giờ `Asia/Ho_Chi_Minh` giữ nguyên. Số tiền lớn dùng BigInt; số lượng dùng chuỗi thập phân chuẩn, không chuyển qua floating point. Ô nhập nhận số không phân nhóm hoặc phân nhóm đúng ngôn ngữ, không bỏ chấm/phẩy tùy ý. Không làm tròn số VND có phần lẻ.

`LocalizedInput` chỉ gửi giá trị hợp lệ ở dạng chuẩn về form. Bản nháp lỗi giữ nguyên chữ và ngôn ngữ lúc nhập, có lỗi tại chỗ và chặn xem trước/lưu; khi tab khác đổi ngôn ngữ, không diễn giải lại chuỗi cũ. Bản nháp hợp lệ giữ giá trị khi chuyển cách hiển thị. Gợi ý tiền bên dưới theo ngôn ngữ đang chọn. Lịch native phụ thuộc trình duyệt; giá trị input/API vẫn ISO.

Bộ lọc dialog và tùy chọn cột dùng khóa ổn định qua ngôn ngữ. Tên hũ, danh mục, ghi chú và dữ liệu người dùng không được duyệt qua bộ dịch. Nhãn phát sinh của hệ thống được đánh dấu hoặc dịch tại nguồn tạo nhãn.

## Hợp đồng kỹ thuật

- `Locale = "vi" | "en"`; từ điển tách theo module, khóa nguồn tiếng Việt, kiểu `MessageKey`, kiểm tra khóa và tham số trong unit tests. Namespace giữ đúng nghĩa của nhãn như Đã chốt ở Tiết kiệm và Đầu tư.
- `LocaleProvider` trong từng layout app/công khai nhận locale từ server và cập nhật context, không remount workspace hoặc làm mất state. Các formatter nhận locale tường minh; không có biến ngôn ngữ toàn cục phía server. Layout công khai bao quanh cả header/footer và login; login không tạo provider lồng nhau. Header dùng select native có tên ngôn ngữ đầy đủ và toast xác nhận; `lang` tài liệu và tiêu đề cập nhật theo lựa chọn. Namespace `landing` chỉ dịch copy sản phẩm và dữ liệu minh họa cố định. Số tiền preview giữ chuỗi nguyên chuẩn và định dạng theo locale; đổi ngôn ngữ giữ tab/che tiền.
- Help tải bằng dynamic import theo ngôn ngữ khi mở, giữ cùng ID bài/mục/tác vụ. Không gọi API tài chính khi tra cứu. Bản tiếng Anh nằm trong chunk riêng với nội dung Help.
- API lỗi giữ `error`, `code`, `fieldErrors`; thêm `messageKey`, `messageParams`, `fieldErrorMessages` khi nhận diện được thông báo. Client dùng metadata khi có, tương thích payload cũ. Lỗi chưa biết giữ fallback; trạng thái chưa xác nhận kết quả ghi vẫn riêng với lỗi chắc chắn chưa lưu.
- Đơn vị vàng giữ enum `chỉ`/`lượng/cây`/`gram` ở input value và API; chỉ dịch nhãn thành `chi`/`luong/tael`/`gram`.
- CSV của Thu nhập, Tiết kiệm, Đầu tư nhận `locale=vi|en`, mặc định vi. Chỉ dịch nhãn hệ thống; dữ liệu người dùng, số chuẩn, ngày ISO và chống công thức CSV giữ nguyên. Không đổi JSON tài chính hoặc backup V1/V2, không có migration.
- Offline document có hai bản ngôn ngữ; chỉ chọn English cho đường dẫn app đã biết. Service worker vẫn chỉ cache một tài liệu offline trung tính, không cache trang tài khoản/API hoặc hỗ trợ nhập ngoại tuyến.

## Kiểm chứng

Unit tests bao phủ số lớn, chuẩn hóa, khóa/tham số dịch, Help và CSV. Browser tests dùng production build, PostgreSQL/Auth double local và dữ liệu tổng hợp: đủ trang, Help, ma trận theme/chế độ/ngôn ngữ, giữ bản nháp, nhiều tab, lỗi mạng và kết quả lưu không chắc chắn. Fallback service worker được kiểm tra thực trên Chromium/WebKit; Firefox kiểm tra cache và thực thi tài liệu offline bằng mô phỏng response vì chế độ offline của Playwright chặn navigation trước service worker. Kết quả chạy và giới hạn ghi tại [lịch sử validation](../07-validation.md); source không tự chứng minh triển khai cloud hay thiết bị vật lý.

## Đồng bộ ô số khi rời trường — 23/10/2026

Hồi quy bố cục phát hiện `LocalizedInput` giữ chuỗi `000777` sau blur dù form đã nhận `777`, vì giá trị chuẩn không đổi nên callback của form không tạo render mới. Component nay đồng bộ phần hiển thị của bản nháp hợp lệ về giá trị chuẩn khi rời ô, tiếp tục chuyển dấu thập phân theo ngôn ngữ hiện tại. Bản nháp lỗi giữ nguyên chữ/ngôn ngữ lúc nhập và tiếp tục chặn gửi. Các ca hồi quy Thu nhập/Chi tiêu và bộ Việt/Anh kiểm tra hành vi này cùng luồng giữ bản nháp.

### Nhất quán toàn ứng dụng — 28/10/2026

Đã đối chiếu nội dung, cỡ chữ, dialog/menu và bộ chọn kỳ với [quy tắc dùng chung](usability-consistency-2026-10-28.md). Giữ quy tắc nghiệp vụ, lịch sử và giới hạn chức năng; kết quả kiểm chứng ghi riêng theo môi trường.
