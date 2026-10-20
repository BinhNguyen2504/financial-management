# Hướng UI/UX

## Nguyên tắc

Thiết kế cho thao tác hàng ngày trên điện thoại và kiểm tra sâu trên máy tính. Ưu tiên nhập nhanh và nhìn rõ nguồn số liệu. Ảnh Notion cho biết nội dung cần quản lý, không bắt buộc giữ bố cục bảng dài, màu sắc hay trang trí của Notion.

Skill `ui-ux-pro-max` được dùng để tra hướng dashboard dữ liệu, accessibility và Next.js. Hướng Zen và emoji do người dùng chọn được ưu tiên hơn các gợi ý màu/icon tự động của skill. Kết quả tự động có các gợi ý landing/enterprise không phù hợp; không dùng chúng làm cấu trúc ứng dụng. Bản định hướng dưới đây được điều chỉnh cho tác vụ tài chính cá nhân.

## Landing và đăng nhập — 17/10/2026

Landing theo hướng sản phẩm tinh tế: hero “Một nơi rõ ràng hơn cho tài chính của bạn”, preview có tab, lợi ích các module đã triển khai, câu chuyện từ nhu cầu thật, trạng thái phát triển/FAQ và CTA cuối. Giữ Zen/Nunito, cây chỉ là điểm nhấn; không thêm thành tích hay lời chứng thực chưa có.

Trang công khai có header riêng, không sidebar hoặc Privacy Mode của dữ liệu tài khoản. Avatar thay nút đăng nhập sau khi xác minh phiên, có trạng thái chờ và thử lại. Đăng nhập riêng ở `/login`, quay về đúng trang được yêu cầu; người đã đăng nhập vẫn xem được landing. Logo trong ứng dụng dẫn về landing, mục Tổng quan vẫn có trong điều hướng.

Preview minh họa sát giao diện thật, chỉ đổi module và che tiền trong preview. Không persist trạng thái, không đọc tiền thật. Desktop có sidebar/biểu đồ thu nhỏ; mobile ưu tiên thẻ và nội dung vừa màn hình. Tab hỗ trợ phím mũi tên/Home/End; trạng thái ẩn không giữ số tiền trong accessibility tree. Các phần nội dung chính render được khi chưa có JavaScript; Auth/form vẫn cần JavaScript.

Trang ứng dụng kiểm tra Auth phía server; lỗi gián đoạn có retry. Chưa cấu hình Auth chuyển đến hướng dẫn ở trang đăng nhập. Điều này thay thế hành vi P0 cho phép mở khung ứng dụng ẩn danh.

## Cấu trúc thông tin

| Khu vực | Câu hỏi mà màn hình trả lời |
| --- | --- |
| Tổng quan | Hiện tôi có bao nhiêu, tháng này thế nào, cần làm gì tiếp? |
| Thu & chi | Tiền vào/ra vì lý do gì? |
| Ngân sách | Đã dành bao nhiêu, đã dùng bao nhiêu, còn bao nhiêu? |
| Tài khoản | Tiền đang ở đâu, số dư có khớp thực tế? |
| Tiết kiệm | Khoản nào đang gửi, khi nào đáo hạn, gốc/lãi ra sao? |
| Đầu tư | Đang giữ gì, vốn và giá trị hiện tại thế nào? |
| Quỹ an toàn | Bao nhiêu tiền đã dành cho từng loại biến cố? |
| Mục tiêu | Đã đi được bao xa và còn thiếu bao nhiêu? |
| Báo cáo | Điều gì thay đổi theo thời gian và vì sao? |
| Thiết lập | Danh mục, tài khoản đăng nhập, nhập/xuất và đồng bộ |

P0 có sidebar desktop và menu có nhãn trên màn hình nhỏ, mọi trang có URL riêng. Khi bắt đầu tác vụ hàng ngày, đánh giá bottom navigation tối đa 4–5 mục: Tổng quan, Thu chi, Thêm, Kế hoạch, Khác; dùng dữ liệu hành vi thực tế để chốt, không nhét 10 mục vào bottom bar.

## Luồng dự kiến

**Nhập nhanh:** mở form → chọn Thu/Chi/Chuyển tiền → nhập tiền → chọn tài khoản/danh mục → lưu. Ngày hôm nay theo giờ Việt Nam, tài khoản gần dùng được gợi ý nhưng vẫn thấy rõ trước khi lưu. Các trường ghi chú, split và quỹ mở theo nhu cầu. Có bàn phím số, hiển thị phân cách tiền khi nhập và thông báo lỗi gần trường.

**Định kỳ:** kỳ mới tạo đề xuất hoặc giao dịch theo chế độ người dùng chọn. Khoản dự kiến không được cộng vào số thực nhận/thực chi. Bản nhắc có thể xác nhận, sửa hoặc bỏ qua mà không sinh trùng ở lần chạy sau.

**Mua/bán:** chọn tài sản, số lượng, giá, tài khoản tiền chờ và phí. Trước khi xác nhận, hiển thị tổng tiền và ảnh hưởng hai phía. Sau lưu có một mục lịch sử liên kết đầy đủ biến động; không yêu cầu nhập dòng rút riêng.

**Đổi ngân sách:** nhập mức mới và ngày hiệu lực; xem trước tháng nào bị ảnh hưởng. Không reset số tháng hoặc clone toàn bộ bảng. Khi vượt ngân sách, hiển thị số vượt và nguồn giao dịch.

**Đối soát:** nhập số dư thực tế và ngày chốt → so sánh số tính được → xem giao dịch khác biệt → chỉ tạo entry điều chỉnh khi đã chọn lý do. Không âm thầm sửa số dư để ép khớp.

## Dashboard và báo cáo

- Tổng quan tập trung tài sản, dòng tiền, ngân sách và việc đến hạn; drill-down đến giao dịch nguồn.
- Luôn phân biệt thực tế/dự kiến, gốc/lãi, vốn góp/lợi nhuận và tổng tài sản/tài sản ròng.
- Biểu đồ thu/chi dùng cột; biến động tài sản theo thời gian dùng đường; tỷ trọng dùng thanh hoặc donut cho số nhóm ít.
- Mỗi chart có đơn vị, kỳ, nhãn, thời điểm giá và bảng dữ liệu thay thế; trạng thái rỗng/lỗi có giải thích.
- Giá cũ có nhãn ngày cập nhật. Không vẽ đường lịch sử giá từ số liệu chưa có hoặc tự nối thành lợi nhuận thực tế.
- Trên điện thoại ưu tiên thẻ/tóm tắt và chi tiết theo dòng; bảng rộng có vùng cuộn riêng và giữ cột nhận diện nếu cần, không làm cả trang cuộn ngang.

## Visual system — Zen & Growth (15/10/2026)

Phong cách hiện tại là không gian tài chính an yên: nền kem `#F7F3EB`, bề mặt `#FFFCF6`, xanh xô thơm `#506B50`, chữ nâu `#3F3A32`, sắc chi tiêu/cảnh báo cam đất `#9B5D42`. Dark mode theo hệ thống dùng nền `#1F2520`, bề mặt `#29312B`, chữ `#F3EEE3` và xanh `#B4CAA7`. Semantic tokens, màu biểu đồ và minh họa cùng được quản lý trong `src/app/globals.css`; các thành phần Zen dùng `src/app/zen.css`.

Nunito variable với Latin/tiếng Việt được phục vụ qua `next/font`; trình duyệt không gọi Google Fonts. Nội dung nét 400, tiêu đề 600, số tiền dùng tabular numerals. Card bo góc 16–24px, spacing 4/8px, hiệu ứng nhẹ và tôn trọng reduced motion. Minh họa SVG cây, hũ và bình tưới xuất hiện ở phần chào, đăng nhập và trạng thái trống. Câu nhắc mỗi ngày là nội dung tự viết, chọn theo ngày Việt Nam, không chạy carousel.

Tổng quan lấy dữ liệu tháng hiện tại từ API Chi tiêu: mức tháng, thực chi và số còn trong hũ, với nhãn tạm tính. Chưa có module tài sản ròng nên không suy ra chỉ số này. Thu nhập đã có module riêng và được đồng bộ theme/Privacy Mode; Tổng quan vẫn tập trung vào hũ. Các module chưa triển khai có nhãn đang xây dựng.

Danh sách hũ giữ bảng đầy đủ trên máy tính và thẻ trên điện thoại; thẻ nhấn mạnh số còn trong hũ, số phụ nằm trong phần mở rộng. Emoji luôn đi cùng tên hũ; bộ chọn có gợi ý theo tên và lựa chọn cụ thể. Hũ chi tháng dùng thanh đã sử dụng ngân sách; hũ tích lũy dùng cây/số dư, không coi mức góp tháng là mục tiêu tiết kiệm tổng.

Báo cáo Chi tiêu mở vào biểu đồ. Donut biểu diễn cơ cấu thực chi (tối đa năm lát, gộp phần còn lại thành Khác); thanh ngang bo tròn so kế hoạch/thực chi hoặc nhu cầu tiền; đường có vùng tô nhẹ biểu diễn diễn biến đã ghi nhận. Có nhãn, đơn vị VND, lựa chọn bằng chạm/bàn phím và bảng thay thế. Số tạm tính, kế hoạch và tháng tương lai được phân biệt. Biểu đồ không tạo dữ liệu minh họa khi không có khoản ghi nhận.

## Privacy Mode và biểu tượng hũ

Nút mắt ở header điều khiển số tiền trong Tổng quan, Chi tiêu và Thu nhập. Lựa chọn được nhớ trên thiết bị bằng `fm-privacy`; localStorage chỉ giữ tùy chọn giao diện, không giữ dữ liệu tài chính. Trước khi đọc xong lựa chọn, số tiền được che để tránh lóe khi tải. Trình duyệt chặn storage vẫn dùng được nút trong phiên hiện tại.

Khi che, lớp hiển thị thay giá trị bằng `•••••• ₫` trong bảng, lịch sử, tooltip và accessibility tree. Phần trăm và hình dạng biểu đồ được giữ lại. Đây là quyền riêng tư ở giao diện, không phải mã hóa hay loại bỏ dữ liệu khỏi response. File backup và CSV vẫn chứa dữ liệu đầy đủ.

Form che cả ô tiền và bản xem trước. Nút “Hiện tiền trong form” chỉ mở phạm vi form hiện tại; đóng form hoặc rời nền sẽ che lại. Các form nhập tiền cần được mở số trước khi xem trước/lưu, và nội dung nhập vẫn được giữ khi che lại.

`JarRule.emoji` và `ExpenseRow.emoji` là trường tùy chọn; hũ cũ dùng gợi ý tự động. `createJar` chấp nhận emoji tùy chọn. Command `setJarEmoji` nhận `jarId`, `month`, `emoji` (một giá trị trong bộ hỗ trợ hoặc null để tự động), dùng cơ chế version/idempotency/audit hiện tại. Command chỉ thay metadata trong rules JSONB, giữ nguyên input, trạng thái hoạt động và mọi phép tính tiền. Năm đã chốt không được chỉnh; snapshot cũ không bị viết lại. Không cần migration database mới.

## Trạng thái và truy cập

- Phân biệt “chưa có dữ liệu” với số 0. Dấu `—` ở P0 là chưa có dữ liệu, không phải số dư 0.
- Label luôn nhìn thấy, focus rõ, thứ tự tab hợp lý; hỗ trợ bàn phím và screen reader.
- Action có vùng chạm tối thiểu 44×44 CSS px cho tác vụ chính trên điện thoại; không phụ thuộc hover/drag/swipe.
- Khi gửi: có trạng thái đang lưu; chỉ thông báo thành công khi server xác nhận. Nếu lưu chờ offline, ghi rõ đang chờ.
- Lỗi mạng giữ dữ liệu đang nhập và có retry; lỗi nhiều trường có tóm tắt liên kết trường.
- Thao tác hủy/xóa có giải thích ảnh hưởng và khôi phục/đảo giao dịch theo chính sách; không ẩn lịch sử tiền.
- Hỗ trợ reduced motion, zoom/text scaling, dark mode và safe-area.
- Không lộ số tiền nhạy cảm trong thông báo push mặc định; nội dung chi tiết chỉ khi người dùng bật.

## PWA và iOS

P0 có manifest, icon thường/maskable, Apple touch icon, đăng ký service worker production và offline fallback trung tính. Không cache trang tài khoản hay API. Hiện không có form nhập liệu ngoại tuyến.

PWA production cần HTTPS; iPhone/iPad có hướng cài qua Safari → Chia sẻ → Thêm vào Màn hình chính. Kiểm tra khả năng cài và lifecycle thực tế trên iOS trước khi tuyên bố hỗ trợ hoàn chỉnh. Web Push trên iOS có điều kiện phiên bản và cài lên màn hình chính; chỉ triển khai khi đã cần nhắc việc, theo [hướng dẫn Next.js PWA](https://nextjs.org/docs/app/guides/progressive-web-apps).

App iOS tương lai dùng Flutter/Dart, giữ mô hình nghiệp vụ/API nhưng có navigation, input, secure token storage và lifecycle riêng. Không mặc định giữ y nguyên bố cục web. Mục tiêu là cài trên iPhone cá nhân; cách ký/cài và hạn sử dụng profile được nêu trong tài liệu deploy.

## Đầu tư — 18/10/2026

Bốn tab đã được người dùng chọn: Danh mục, Giao dịch, Báo cáo, Quản lý. Danh mục tổng tiền; bảng desktop và thẻ mobile, ví tiền chờ tách thành khu vực riêng. Sáu chỉ số đầu trang phân biệt tài sản/vốn/tiền chờ và lãi đã/chưa chốt/tổng. Không tính ROI cho tiền chờ.

Form mua/bán nhập giá trị còn giữ sau giao dịch và nguồn/đích ví hoặc Bên ngoài; có xem trước và xác nhận, giữ nháp khi lỗi/xung đột, khóa nội dung khi kết quả lưu chưa xác định. Chi tiết giao dịch thể hiện hai phía trước/sau và revision. “Xóa / lưu trữ” chỉ thực hiện khi hết tài sản, có thể khôi phục.

Biểu đồ đường tài sản, cột nạp/rút hoặc kết quả, thanh cơ cấu cùng bảng số liệu thay thế. Giá trị mang tiếp có ngày/cảnh báo cũ, tháng hiện tại tạm tính. Privacy Mode áp dụng cả form, lịch sử, tooltip và trợ năng; xuất file vẫn đầy đủ. Landing bổ sung preview Đầu tư cố định, không đọc API tài chính.


## Bổ sung backup toàn tài khoản — 18/10/2026

Sao lưu và khôi phục tập trung tại Cài đặt, thay các nút JSON rải trong module; CSV báo cáo giữ nguyên. Luồng chọn file → xem trước → xác nhận, checkbox hồ sơ mặc định tắt. Tổng quan chỉ gợi ý tài khoản trống và dẫn đến Cài đặt. Lỗi hồ sơ sau commit tài chính có nút thử lại riêng; xem [đặc tả](features/backup.md).


## Loading trực quan — 18/10/2026

Dùng vòng xoay CSS nhỏ màu theo token và giữ nguyên thông báo tiếng Việt bên cạnh khi tải Tổng quan, Thu nhập, Chi tiêu, Tiết kiệm, Đầu tư, hồ sơ và kiểm tra dữ liệu Cài đặt. Khi tải lại, giữ nội dung đã có và hiển thị trạng thái đang cập nhật. Các nút đăng nhập, đăng xuất, xem trước/lưu và backup hiển thị vòng xoay khi chờ server, có disabled/aria-busy. Không thêm thời gian chờ hoặc phần trăm tiến độ giả.

`LoadingStatus` là vùng `role="status"` với nội dung nguyên câu; vòng xoay trang trí có `aria-hidden`. Chỉ dùng CSS transform, không timer/animation JavaScript; `prefers-reduced-motion: reduce` giữ vòng tĩnh và chữ. Dừng trạng thái tải khi có kết quả hoặc lỗi; thử lại bật trạng thái tải mới.


### Rà soát tải backup và Cài đặt — 18/10/2026

Cài đặt dùng hai thẻ thao tác, ưu tiên nút xuất; chọn file/xem trước/xác nhận chỉ mở khi có thể khôi phục. Lỗi nằm cạnh hành động, URL file được giữ để có liên kết Lưu file JSON, hướng dẫn cài PWA thu gọn. Giữ Zen và token hiện tại; mobile 320px xếp dọc.


### Căn đều thẻ Cài đặt — 18/10/2026

Hai thẻ Sao lưu/Khôi phục trong cùng hàng dùng grid stretch, tự bằng chiều cao của thẻ dài hơn cả khi xuất hiện thông báo tải file hoặc preview import. Không đặt chiều cao cố định. Dưới breakpoint 1000px, các thẻ xếp dọc và giữ chiều cao theo nội dung.

### Chú thích biểu đồ Tiết kiệm — 18/10/2026

Điểm và nhãn tháng không dùng chung vùng focus SVG, tránh viền kéo dài từ điểm xuống trục khi bấm chuột. Tab có vòng quanh điểm hoặc viền quanh cột/lát đang đọc. Tooltip theo màu giao diện hiện tại, cho điểm tháng, từng cột nạp/rút, lát donut và hàng chú giải; hỗ trợ hover, chạm, Tab và Escape. Nội dung ghi đúng tháng/chỉ số, giá trị, tỷ trọng và trạng thái tạm tính; số thiếu/tương lai không thay bằng 0. Tooltip che số tiền theo Privacy Mode, vẫn giữ phần trăm; nằm ngoài vùng cuộn SVG để tránh bị cắt trên điện thoại.


## Dialog và dữ liệu dài — 18/10/2026

Tóm tắt số liệu quan trọng trước, tab theo nội dung sau; giữ header và thao tác lưu/đóng tiếp cận được khi cuộn. Bảng desktop chuyển thành thẻ có nhãn trên mobile. Danh sách dài có tìm kiếm, bộ lọc theo ngữ cảnh và 20 dòng/trang. Xem trước có nhãn Trước/Sau, đọc được toàn bộ thay đổi. Dialog con quay lại parent cùng vị trí kể cả khi lưu; không làm người dùng tìm lại nội dung vừa đọc. Xem [quy chuẩn và phạm vi](features/ui-feedback.md#dialog-có-nhiều-dữ-liệu--18102026).


### Quay lại ứng dụng — 19/10/2026

Tổng quan, Chi tiêu và Thu nhập chỉ hiện thông báo tải ở lần mở đầu, khi chưa có dữ liệu hoặc đổi năm Thu nhập. Quay lại tab giữ nguyên nội dung, bộ lọc, vị trí và bản nháp; cập nhật ngầm khi dữ liệu đã tải ít nhất 60 giây. Focus/hiển thị lại tab được gộp; chưa có mạng hoặc trang đang ẩn thì chưa tải tự động. Có mạng trở lại/đổi ngày Việt Nam được kiểm tra sớm hơn, với khoảng cách tối thiểu 5 giây. Không polling định kỳ. Thao tác lưu/thử lại/timer đổi ngày vẫn tải trực tiếp, lỗi mạng giữ dữ liệu cũ và nút thử lại có tiến trình; lỗi xác thực xóa dữ liệu khỏi view và yêu cầu đăng nhập. Tiết kiệm/Đầu tư giữ hành vi tải hiện có, chưa có cơ chế tải lại khi foreground.


## Vườn an toàn — 19/10/2026

Emergency dùng cây lớn, Rainy Day dùng tán ô mở, Sinking dùng cây cầu xây dần. SVG từ tỷ lệ thực tế, số tiền và phần trăm rõ ràng, giữ hình khi ẩn tiền. Hình hoàn thiện ở 100%, phần vượt vẫn ghi số. Không animation liên tục; reduced motion tắt hiệu ứng. Thiết lập ba bước, xem trước Trước/Sau rồi lưu. Chi tiết chia bốn tab, dialog con giữ vị trí parent.

## Quy tắc rà soát — 19/10/2026

Mỗi lỗi ví dụ cần được tìm theo nhóm thành phần trên toàn ứng dụng. Kiểm tra trạng thái, thao tác, bố cục và khả năng hoàn thành công việc; ưu tiên chỉ rõ nơi còn thiếu/sai và cho bổ sung ngay. Dùng icon cùng nhãn/màu, không chỉ text hoặc chỉ màu. Theme, menu/cột tùy chỉnh và hướng dẫn cài đặt theo thiết bị nằm trong [ma trận 33 phản hồi](features/interface-feedback-2026-10-19.md).

## Thiếu migration logo phân loại — 20/10/2026

Thiếu metadata logo không khóa màn hình Chi tiêu hoặc thao tác hũ/phân loại không có metadata. Nếu lưu logo/icon tùy chọn khi database chưa sẵn sàng, dùng luồng lỗi lưu hiện có: báo rõ cần cập nhật schema, giữ dialog/bản nháp để người dùng thử lại; không báo mất kết nối chung hoặc tự bỏ metadata. Không đổi bố cục hay công thức tiền.

## Hướng dẫn theo ngữ cảnh — 20/10/2026

Nút Hướng dẫn nằm cạnh tiêu đề trên đủ 12 trang trong app, có biểu tượng sách và nhãn đầy đủ kể cả trên điện thoại. Desktop là bảng bên phải tối đa 640px, dưới 768px toàn màn hình. Tiêu đề/nút đóng cố định, phần đọc cuộn riêng; mục lục đưa focus đến tiêu đề mục. Nội dung 16px, theo theme hiện có, không có tour tự bật hoặc chuyển động bắt buộc.

Các điểm Giải thích nằm cạnh tiêu đề và trong form, không lặp theo mọi dòng. Đóng Help bằng nút, Escape hoặc nền chỉ đóng lớp Help; giữ bản nháp, bộ lọc, scroll và focus của form cha. Ví dụ có nhãn Minh họa, không dùng số thật của tài khoản. Xem [Help](features/help.md).


### Tinh chỉnh Help theo phản hồi — 20/10/2026

Đề mục 01–06 và mục con được đánh số; đường phân cách, khoảng trắng và khối nền làm rõ cấu trúc. Nhấn đậm từ khóa/quy tắc, dùng màu theme cho số liệu minh họa. Các khối tư duy, ví dụ, lưu ý có nhãn và biểu tượng phù hợp. Bảng trượt vào/thu về nhẹ (280/220ms), không đổi kích thước layout; reduced motion bỏ chuyển động. Giữ focus/khóa cuộn đến khi đóng xong và có timeout dự phòng.
