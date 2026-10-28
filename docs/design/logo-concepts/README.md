# Ba phương án logo — 29/10/2026

Trạng thái: **phương án để lựa chọn**, chưa phải nhận diện được phê duyệt. Các tên Hũ mở, Gom và Cân bằng chỉ dùng để gọi ý tưởng. Tên thương hiệu mới chưa được chốt.

- [Bảng so sánh PNG](concepts.png) · [bản SVG](concepts.svg).
- [Trang xem và kiểm tra tương tác](preview.html): mở trực tiếp bằng trình duyệt, hoạt động cục bộ, không cần chạy ứng dụng.
- SVG từng mẫu: [A — Hũ mở](a-jar.svg), [B — Gom](b-gather.svg), [C — Cân bằng](c-balance.svg).
- [Vòng phác thảo đầu](iterations/round-1.png), giữ lại để đối chiếu với lần tinh chỉnh.

## Brief và lựa chọn đề xuất

Ứng dụng quản lý tài chính cá nhân bao gồm thu nhập, chi tiêu, tiết kiệm, đầu tư và quỹ an toàn. Logo dành cho người dùng theo dõi tiền hàng ngày trên điện thoại và máy tính; cần tạo cảm giác bình tĩnh, rõ ràng, có trật tự và đáng tin.

Biểu tượng độc lập với tên và năm chủ đề giao diện. Giữ màu than `#292724` và ngà `#F7F3EB` để thử trong ngữ cảnh hiện tại. Hình phải nhận ra ở 16–32 px, dùng được với một màu, không dựa vào chữ, gradient, bóng hoặc chi tiết đồng xu nhỏ.

| Mẫu          | Ý tưởng và cấu trúc                                                                                                                    | Điểm cần cân nhắc                                                                                            |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| A — Hũ mở    | Một đường bao kín tạo thân hũ và miệng mở lệch. Nét chính 28 đơn vị, khoảng miệng 36 đơn vị trên lưới 256.                             | Gần nhận diện hiện có nhất; có thể được đọc thành chiếc bình.                                                |
| B — Gom      | Hai dải gập lồng nhau và một khối vuông rời; các góc mềm nằm bên trong, đầu dải vuông. Từng phần nhỏ cùng tạo một cấu trúc có trật tự. | Trừu tượng, cần thời gian gắn với thương hiệu; một số người có thể liên tưởng đến tín hiệu hoặc lớp dữ liệu. |
| C — Cân bằng | Hai cung đối ứng quay 180°, bán kính ngoài 88, trong 56; khoảng âm ở giữa thoáng và không có mũi tên.                                  | Hình đơn giản, nhưng dễ gợi đồng bộ hoặc vòng lặp.                                                           |

**Đề xuất B — Gom:** hình có nhịp riêng, đọc được khi thu nhỏ và bao quát toàn ứng dụng. A phù hợp nếu ưu tiên tiếp nối biểu tượng hũ; C phù hợp nếu ưu tiên sự tối giản. Đây là khuyến nghị thiết kế, không phải lựa chọn thay người dùng.

## Khảo sát và phát triển

Đã khảo sát thư viện cục bộ của skill `logo-design`: nhóm payments-fintech (37 mẫu), kỹ thuật khoảng âm và các ý tưởng theo lớp. Xem cấu trúc Square, Adyen, Framer, Patreon và Buffer để học cách giảm hình, khoảng cách và nhịp nét; không dùng hình của họ trong SVG hoặc trang xem bàn giao. Không tìm thấy mẫu gắn nhãn jar hoặc balance trong thư viện; điều này không chứng minh ý tưởng chưa tồn tại.

Tránh các công thức quá quen: đồng xu có ký hiệu tiền, mũi tên tăng trưởng, khiên, quả địa cầu và ba lớp hình thoi. Bảng dưới là chấm điểm định hướng chủ quan, tối đa 25 theo năm tiêu chí: rõ ý, khác biệt, đơn giản, phù hợp và khả năng thu nhỏ.

| Ý tưởng sơ bộ                                  | Điểm | Quyết định                               |
| ---------------------------------------------- | ---- | ---------------------------------------- |
| Hũ miệng mở lệch, bỏ đồng xu và vạch trang trí | 22   | Phát triển A                             |
| Hũ có đồng xu rơi vào miệng                    | 17   | Quá sát biểu tượng tài chính thông dụng  |
| Hai hũ giao nhau tạo khoảng âm                 | 18   | Nhiều giao điểm, yếu ở kích thước nhỏ    |
| Hai dải gập và một khối rời bồi đắp            | 23   | Phát triển B                             |
| Ba lớp hình thoi xếp chồng                     | 16   | Gần công thức đã thấy trong thư viện     |
| Các khối tăng dần như bậc thang                | 18   | Dễ đọc thành biểu đồ tăng trưởng         |
| Hai cung đối ứng quanh khoảng mở               | 21   | Phát triển C                             |
| Dấu bằng trong một vòng tròn                   | 18   | Đọc nhanh nhưng ít nét riêng             |
| Hạt tròn chuyển động trên quỹ đạo              | 17   | Dễ trùng công thức thương hiệu công nghệ |

### Hai vòng kiểm tra

1. Dựng ba bản đen/trắng, chạy SVG audit, render và xem [bảng vòng 1](iterations/round-1.png). A có khoảng trên/dưới 48/32 và nét 24, khiến hình thấp và nhẹ khi thu nhỏ. B có trọng tâm mực khoảng `(122.73, 132.27)`, lệch trái và xuống so với tâm lưới.
2. A được nâng lên, nét tăng thành 28, miệng mở và vai hũ được sửa. B giữ cấu trúc, dịch phải 4 và lên 4 đơn vị; trọng tâm mực trở thành khoảng `(126.73, 128.27)`. C giữ hình sau lần kiểm tra lại vì không thấy lỗi hình học cần sửa. Render lại bảng cuối, xem nền sáng/tối, raster nhỏ và đối chiếu với các mẫu tham chiếu ở cùng kích thước.

SVG audit vòng cuối không có `FAIL` hoặc `WARN`. B có hai ghi chú `INFO` về lề không đều: trái/phải 44/36, trên/dưới 36/44; đây là chỉnh quang học có chủ ý, không phải lỗi cắt hình. Điểm audit là heuristic, không phải chứng nhận chất lượng hoặc độc quyền.

## Kiểm chứng và giới hạn

Ngày kiểm tra: **29/10/2026**, môi trường local macOS. Ba SVG dùng khung `256 × 256`, một màu đen và path kín; không có live text, ảnh nhúng, stroke, filter, mask, gradient hay tài nguyên ngoài. Chữ trên bảng trình bày là chú thích, không phải thành phần của logo.

| Trình duyệt local          | Chiều rộng viewport | Kết quả              |
| -------------------------- | ------------------- | -------------------- |
| Google Chrome cài trên máy | 320 / 768 / 1440 px | Đạt cả ba kích thước |
| Firefox qua Playwright     | 320 / 768 / 1440 px | Đạt cả ba kích thước |
| WebKit qua Playwright      | 320 / 768 / 1440 px | Đạt cả ba kích thước |

Chín tổ hợp trình duyệt/viewport không tràn ngang. Ở mỗi tổ hợp, dải SVG giữ đúng 16/24/32/64 CSS px; cả ba chế độ đen/trắng, than/ngà, ngà/than trả đúng màu; 12 ô raster 16/32 px tải xong. Radio chuyển chế độ bằng phím mũi tên trên cả ba trình duyệt. Không có lỗi JavaScript, ID SVG trùng hoặc request HTTP(S) trong lúc kiểm tra. Các liên kết tải file đều tồn tại.

Đã xem trực tiếp bảng PNG cuối, screenshot desktop/mobile, raster phóng lớn của B và bảng đối chiếu với bốn mẫu thư viện. Ở 16 px, ba phần của B còn tách được; đường cong được biểu diễn bằng raster nên bậc thang là bình thường. Bản ngà trên than có cảm giác nét dày hơn nhẹ; bản đảo màu tinh chỉnh riêng thuộc giai đoạn bộ logo hoàn chỉnh.

Vòng kiểm tra đã phát hiện CSS của trang xem làm mẫu 16 px thành 64 px trên mobile; đã bỏ quy tắc đó và chạy lại đầy đủ chín tổ hợp thành công. Kiểm tra cấu trúc riêng xác nhận ba master dùng path, không phụ thuộc font hay tài nguyên ngoài. Không chạy lại test/build ứng dụng vì đợt này không sửa mã runtime.

Các thử nghiệm favicon/icon trên bảng và trang xem là mockup thiết kế. Chưa xuất bộ icon production, đổi favicon/PWA hay xác nhận trên thiết bị vật lý; chưa tra cứu nhãn hiệu hoặc tìm ảnh ngược. Khi chọn được hướng, mới tinh chỉnh bản đảo màu riêng, quy định khoảng trống/kích thước tối thiểu và chuẩn bị bộ bàn giao cuối.

## Tái tạo và tính nhất quán sản phẩm

Từ thư mục repo, chạy với Node 22.12+ và dependencies hiện có:

```sh
node docs/design/logo-concepts/build-review.mjs
```

Lệnh đọc ba SVG, ghi lại `concepts.svg`, `concepts.png` và `preview.html`. PNG dùng Sharp; trang xem nhúng toàn bộ hình và dùng font hệ thống. Bảng SVG có chú thích chữ nên cách render chữ có thể khác nhẹ theo máy; hình logo luôn là path.

Đã rà soát `src/features/catalog.ts`, hai landing, preview, README, hướng UX và tài liệu landing/localization. Đợt này chỉ thêm phương án thiết kế và liên kết tài liệu; giữ trạng thái module, thông điệp sản phẩm, số liệu minh họa, ranh giới đăng nhập, biểu tượng runtime và bộ icon hiện tại. Những thay đổi có sẵn trong worktree nằm ngoài đợt thiết kế này.
