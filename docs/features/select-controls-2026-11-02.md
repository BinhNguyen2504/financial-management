# Select và bộ lọc giao dịch — 02/11/2026

## Lỗi trước sửa

Production build local trước sửa tái hiện select Đầu tư chỉ cao 27px trên WebKit/iPhone mô phỏng tại viewport 1440px, trong khi Chrome khoảng 46px. Quy tắc bỏ native appearance trước đây chỉ áp dụng cho Chi tiêu và một phần Thu nhập. Checkbox chung hàng flex với các trường có nhãn bên trên tạo hàng lệch và xuống dòng thiếu nhóm.

## Quy tắc triển khai

- Select một lựa chọn trong main của app và dialog dùng một quy tắc appearance, box sizing, chữ 16px, chiều cao tối thiểu 44px và mũi tên theo token theme. Giữ `<select>`, option, focus/disabled/invalid, picker hệ điều hành và bàn phím native.
- Mũi tên có khe riêng 38px; select Năm/Tháng dùng biến 28px để giữ control gọn. CSS đủ ưu tiên trước các shorthand background/font của từng route khi chuyển trang. Không reset multiple/listbox; forced colors dùng lại appearance native. Bộ chọn ngôn ngữ public giữ chevron riêng.
- Bộ lọc Đầu tư là container riêng: nội dung từ 900px có bốn cột, từ 560px có hai cột, hẹp hơn có một cột. Bốn trường có khe 16px, control cùng hàng căn đáy và cao 46px tại cỡ chữ chuẩn, tăng theo chữ lớn.
- Checkbox giữ boolean và nghĩa “hiện cả giao dịch đã hủy”, ở hàng phụ cách grid 16px và cùng mép trái. Ô 20×20px không co, chữ cách 10px và được xuống dòng, toàn nhãn bấm được với chiều cao tối thiểu 44px.
- Không đổi API, schema, dữ liệu, bước xem trước/xác nhận, bản nháp, giá trị và logic bộ lọc.

## Kiểm chứng và tài liệu

`tests/browser/select-controls.spec.ts` đo hình render, container 559/560/561/899/900/901px, viewport 320/390/768/1440px và landscape, nhãn vi/en, năm theme, sáng/tối, chữ 125%/200%, chuyển trang và dialog. Kiểm tra lọc ngày/danh mục/ví/loại, nhãn checkbox và Space, lựa chọn select bằng bàn phím, không ghi khi lọc, và ngôn ngữ public không lặp mũi tên. Các suite hiện có tiếp tục kiểm tra nghiệp vụ và form.

`TEST_WEBKIT_DESKTOP=1` bật project `webkit-desktop` riêng, không dùng user agent/touch/mobile emulation của iPhone. Project WebKit cũ tiếp tục kiểm tra iPhone mô phỏng; thay viewport trong project đó chỉ là kiểm tra chiều rộng, không đại diện profile desktop. Tiêu đề trang được phép ngắt từ khi chữ 200% để tránh nhãn “Investments” tràn 2px ở 320px.

Đã rà catalog, hai landing, preview minh họa và README; cập nhật mô tả lọc trong catalog/Help preview vi/en cùng tài liệu Đầu tư, kiến trúc và UX. Preview giữ dữ liệu cố định và không gọi API tài khoản. Kết quả từng lượt và giới hạn ghi tại [validation](../07-validation.md); WebKit mô phỏng không đại diện Safari/thiết bị vật lý.
