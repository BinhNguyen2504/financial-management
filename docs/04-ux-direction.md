# Hướng UI/UX

## Nguyên tắc

Tinh chỉnh 26/10/2026: nhóm thao tác bảng hũ căn giữa theo số nút thực tế; sửa và dùng tiền dùng icon có cùng kích thước, nhãn truy cập và tooltip. Nền bảng phải nằm trong đường bo của khung, kể cả khi bảng cuộn ngang. Nút xác nhận ghi tiền trong form giữ chữ rõ ràng; card mobile giữ nhãn chữ.

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

`JarRule.emoji` và `ExpenseRow.emoji` là trường tùy chọn; hũ cũ dùng gợi ý tự động. `createJar` chấp nhận emoji tùy chọn. Command `setJarEmoji` nhận `jarId`, `month`, `emoji` (một emoji Unicode hợp lệ, bao gồm emoji ghép, hoặc null để tự động), dùng cơ chế version/idempotency/audit hiện tại. Command chỉ thay metadata trong rules JSONB, giữ nguyên input, trạng thái hoạt động và mọi phép tính tiền. Năm đã chốt không được chỉnh; snapshot cũ không bị viết lại. Không cần migration database mới.

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

Tinh chỉnh Tổng quan 28/10/2026: nút Đọc các chỉ số tháng nằm trong cụm tiêu đề tháng, bên phải trên desktop; mobile không quá 639px đặt ở hàng riêng dưới tiêu đề với khoảng cách 16px. Số hũ/trạng thái ở dưới tên tháng, giữ nút trợ giúp tách rõ khỏi dòng TỪNG BƯỚC NHỎ, MỖI THÁNG.

Các điểm Giải thích nằm cạnh tiêu đề và trong form, không lặp theo mọi dòng. Đóng Help bằng nút, Escape hoặc nền chỉ đóng lớp Help; giữ bản nháp, bộ lọc, scroll và focus của form cha. Ví dụ có nhãn Minh họa, không dùng số thật của tài khoản. Xem [Help](features/help.md).


### Tinh chỉnh Help theo phản hồi — 20/10/2026

Đề mục 01–06 và mục con được đánh số; đường phân cách, khoảng trắng và khối nền làm rõ cấu trúc. Nhấn đậm từ khóa/quy tắc, dùng màu theme cho số liệu minh họa. Các khối tư duy, ví dụ, lưu ý có nhãn và biểu tượng phù hợp. Bảng trượt vào/thu về nhẹ (280/220ms), không đổi kích thước layout; reduced motion bỏ chuyển động. Giữ focus/khóa cuộn đến khi đóng xong và có timeout dự phòng.

## Hai chủ đề, cùng nhịp sử dụng — 21/10/2026

Giao diện trong Cài đặt gồm thẻ Khu vườn/Dòng nước/Kim ngân/Lửa ấm/Đất lành và nhóm Sáng/Tối/Theo hệ thống. Thẻ có radio, minh họa đúng chủ đề, mô tả và dấu chọn; desktop ba cột, tablet 561–900px hai cột, dưới 561px một cột. Đổi tức thời, giữ bộ lọc và bản nháp. Mỗi nhóm radio có một điểm Tab trên lựa chọn đang chọn; các mục còn lại đi bằng phím mũi tên, giữ focus rõ trên WebKit. Xanh lục giữ thiết kế hiện có; xanh lam dùng nền trắng xanh/xanh đêm, suối, hợp lưu và hồ tích nước. Kim ngân dùng nền kem, vàng mật ong/vàng champagne, đồng xu, thỏi vàng, túi tiền và rương tích lũy. Lửa ấm dùng đỏ gạch/đỏ san hô, bếp lửa, đèn lồng và than hồng; cảnh núi lửa là hình tĩnh cách điệu. Đất lành lấy địa hình làm đặc trưng: tầng đất, đồi núi, đá cuội, đất nung và ruộng bậc thang, khác hình cây lá của Khu vườn. Cảnh Quỹ phản ánh tỷ lệ thật, che tiền vẫn giữ tỷ lệ.

Lời dẫn và icon trang trí theo chủ đề; thuật ngữ nghiệp vụ, màu cảnh báo/lỗi, logo thanh toán và emoji người dùng giữ nguyên. Chỉ chuyển màu 180ms sau thao tác và phản hồi Quỹ ngắn; không hoạt ảnh nền lặp, reduced motion tắt hiệu ứng. Chủ đề áp dụng cả public/login/offline. Chi tiết: [themes](features/themes.md).

## Quy chuẩn form và phản hồi — 21/10/2026

Các luồng tạo, sửa, hủy/ngừng và khôi phục cho biết kết quả bằng toast sau phản hồi xác nhận. Khi lưu lỗi, giữ nội dung và báo tại form; khi kết quả ghi chưa rõ, hướng dẫn kiểm tra/thử lại cùng yêu cầu. Mỗi ô tiền VND có số định dạng bên dưới và chịu chế độ riêng tư. Trường cần nhập dùng dấu `*` sát nhãn, có chú giải đầu form. Lỗi nằm sát trường, được mô tả cho trình đọc màn hình và nhận focus khi gửi. Dialog giữ header/footer và chỉ cuộn nội dung; Quỹ an toàn đối chiếu những giá trị thay đổi trước và sau. Nút thu gọn sidebar ở vùng đầu, nhận diện ứng dụng vẫn có trên mobile; Hồ sơ và Hướng dẫn giữ khả năng đọc ở màn hình hẹp, sáng/tối của cả năm chủ đề.

## Thông tin phụ gọn và chọn cột — 21/10/2026

Ưu tiên tên hũ và các số tiền. Phương thức/nhóm dùng icon nhỏ cùng nhãn, không bọc như một nút lớn; biểu tượng thương hiệu tách khỏi wordmark nếu asset có hai phần. Nút tùy chọn cột đặt cạnh tiêu đề ngữ cảnh, mở panel nổi thay vì kéo dài luồng nội dung. Panel có danh sách một cột dễ quét, công tắc, thông tin luôn hiện và reset; giữ vị trí bảng khi mở/đóng. Xem [đặc tả Chi tiêu](features/expenses.md#cột-hiển-thị-và-nhận-diện-phương-thức--21102026).


## Trang chủ khách và thành viên — 22/10/2026

Khách chưa đăng nhập có nhận diện marketing riêng được người dùng chọn: sáng, tinh tế, nền ngà `#FAF9F6`, chữ `#242420`, điểm nhấn cam đồng `#A74425`. Typography lớn, khoảng thở, thẻ tài chính tĩnh và nội dung hướng đến lợi ích; không dùng cây/nước/vàng/lửa. Trình tự lợi ích → preview → khả năng sản phẩm → câu chuyện → FAQ → CTA. Không thêm số người dùng, lời chứng thực hoặc kết quả tài chính chưa có bằng chứng.

Trang thành viên giữ nguyên giao diện theo theme hiện tại. Từ 27/10/2026, server khởi tạo provider bằng user đã xác minh để shell, nội dung, CTA và menu tài khoản đúng ngay trong HTML đầu tiên; không nháy marketing hoặc thay menu bằng spinner khi hydrate. Tải lỗi Auth vẫn đọc được nội dung công khai và thử lại qua nút tài khoản. Theme và mode đã lưu không bị ghi đè. Preview khách có cùng số liệu/keyboard/ẩn tiền, dùng biểu đồ trung tính. Màn hình hẹp xếp hero và feature thành một cột; FAQ dùng details/summary, CTA là link thật; không có chuyển động nền lặp.

## Logo trung tính và Anh/Việt — 22/10/2026

Logo hũ/đồng xu dùng than–ngà, đảo sáng/tối và phù hợp năm theme. Cài đặt có radio Tiếng Việt/English, tiếng Việt mặc định; đổi ngay kèm toast. English dùng en-GB, tiền VND và giờ Việt Nam. Không gian app/Help có hai ngôn ngữ. Cập nhật 27/10/2026: trang chủ, preview và khung công khai/login cũng theo lựa chọn Việt/Anh dùng chung. Khi đổi, giữ bản nháp, bộ lọc, vị trí và lựa chọn cột. Ô số lỗi giữ nguyên chữ cùng định dạng lúc nhập, báo tại chỗ và chặn lưu thay vì bỏ tùy ý dấu chấm/phẩy. Xem [đặc tả](features/localization.md).

## Bố cục gọn và điều khiển ổn định — 23/10/2026

Tab giữ nguyên nhãn trên một hàng và cuộn trong thanh khi thiếu chỗ; mục đang chọn luôn nhìn thấy, không làm nhảy trang/dialog. Toolbar bảng đứng ngoài vùng dữ liệu cuộn ngang. Thu nhập có mũi tên hai đầu bộ chọn kỳ, hàng bảng cơ sở 48px và nút nhập thiếu 44px không cộng thêm padding dọc. Audit theo nhóm lỗi trên toàn ứng dụng được ghi tại [ma trận bố cục](features/layout-scroll-2026-10-23.md).

### Cuộn đến nội dung — 27/10/2026

Liên kết đến vị trí khác trong cùng trang và các thao tác trong dialog (mục lục Help, xem trước, phân trang, quay lại vị trí tab và đưa tới ô lỗi) cuộn mượt bằng hành vi trình duyệt. Focus dùng `preventScroll` trước khi cuộn để tránh nhảy đột ngột. `prefers-reduced-motion: reduce` giữ cuộn tức thời. Chuyển route và đóng dialog vẫn giữ quy tắc điều hướng/khôi phục vị trí hiện có.


## Vị trí nút thu gọn menu — 26/10/2026

Nút chevron thu gọn/mở rộng sidebar desktop nằm trên mép phân cách bên phải, ngang tâm logo. Hình tròn 28px nền surface/viền nhẹ nằm giữa vùng bấm 44 × 44px; hover và focus tăng độ rõ, focus có vòng viền riêng. Nút cố định theo viewport và theo chiều rộng sidebar ở cả hai trạng thái, tránh vùng cuộn cắt nút; nhãn theo ngôn ngữ, trạng thái cho công nghệ hỗ trợ và lựa chọn trình duyệt được giữ. Dưới 960px dùng menu mobile. Chuyển màu nhẹ 150ms, tắt khi giảm chuyển động.

## Chú thích hướng dẫn cài đặt — 26/10/2026

Chú thích minh họa và liên kết hướng dẫn chính thức cách cụm card 24px, cách lưu ý kết nối mạng bên dưới 12px. Dùng chung cho iPhone/iPad, Android và máy tính; chữ và liên kết xuống dòng tự nhiên theo chiều rộng màn hình.

## Nhận diện liên kết ngoài — 26/10/2026

Các liên kết ngoài dùng chung `.external-link`: màu `--primary` theo theme, chữ đậm 700 và gạch chân luôn hiển thị với khoảng cách 3px. Hover và focus bàn phím làm nét gạch chân đậm hơn; giữ viền focus dùng chung. Liên kết dài được xuống dòng tự nhiên trên mobile. Áp dụng cho hướng dẫn cài đặt, nguồn tham khảo Quỹ an toàn và Mở Supabase ở Thu nhập.

## Minh họa tích lũy và danh mục — 26/10/2026

Tiết kiệm và Đầu tư có cảnh riêng trong mỗi theme: tích góp/gìn giữ so với chăm sóc/phân bổ nhiều tài sản. Mười bố cục SVG tĩnh dùng semantic tokens sáng/tối; CSS chọn cảnh trước paint, không phụ thuộc dữ liệu tài chính. Tiêu đề Đầu tư giữ minh họa gọn trên mobile; trạng thái trống dùng cảnh khởi đầu riêng. Preview thành viên dùng cùng bộ hình, preview khách giữ phong cách marketing. Chi tiết trong [chủ đề giao diện](features/themes.md).

## Bảng Tiết kiệm — 27/10/2026

Danh mục, giao dịch tháng và giao dịch nguồn báo cáo dùng cột rõ trên desktop; khi vùng nội dung tối đa 760px, hàng chuyển thành danh sách có nhãn, giữ tên/ghi chú đầy đủ và vùng thao tác riêng. Căn phải số tiền với chữ số đều, giữ số 0, che tiền bằng Privacy Mode, đếm dòng theo bộ lọc. Trạng thái lưu trữ có chữ, không chỉ màu. Dùng bộ chọn cột chung và giữ tên/thao tác luôn hiện. Xem [chi tiết và kiểm chứng](features/savings-ledgers-2026-10-27.md).

## Tỷ lệ hình trong tiêu đề — 26/10/2026

Bố cục `illustrated-heading` tách vùng chữ/hình/thao tác, áp dụng cho năm trang tài chính và bốn trang dự kiến. Hình lớn 240–320px trên desktop/tablet; ở màn hình không quá 700px, chữ chiếm toàn hàng và hình 216px nằm dưới, không ép tiêu đề thành cột hẹp. Nút Phân loại/Thêm hũ và Nơi giữ tiền/Điều chỉnh mục tiêu vẫn ở tiêu đề, trên hàng riêng. Nền tỏa nhẹ dùng token theme, không chuyển động hoặc che chữ. Tổng quan giữ khối chào mừng riêng; Hồ sơ/Cài đặt giữ bố cục chức năng. Xem [chủ đề](features/themes.md).

### Nhập mã đăng nhập — 27/10/2026

Email thực tế của người dùng trả mã 8 chữ số. Biểu mẫu dùng 8 ô vuông, focus ô đầu sau khi gửi/gửi lại; gõ từng số chuyển ô kế tiếp. Nhập ô cuối hoặc dán/tự điền đầy đủ mã tự xác nhận một lần, có trạng thái đang xử lý. Backspace/Delete giữ vị trí các số khác; mũi tên/Home/End chuyển ô. Lỗi giữ mã để sửa/thử lại, không tự lặp request; nút Đăng nhập vẫn hỗ trợ xác nhận thủ công. Các ô dùng token màu/font hiện có, bố cục một hàng thích ứng 320px. Xem [đặc tả OTP](features/email-otp.md).


## Bộ chọn ngôn ngữ trang chủ — 27/10/2026

Thay thế giới hạn tiếng Việt của trang công khai trong ghi chú cũ: header có select native Tiếng Việt/English cạnh đăng nhập hoặc tài khoản, có focus rõ và thông báo xác nhận theo ngôn ngữ mới. Ở màn hình hẹp, header cho nhóm thao tác xuống hàng, không rút tên ngôn ngữ. Dịch cả landing khách/thành viên, preview, menu/footer, CTA, FAQ và nhãn truy cập; giữ bản sắc marketing/themed, VND, trạng thái tab và che tiền. Dùng chung lựa chọn với Cài đặt và login.

## Trạng thái điều khiển và bảng dialog — 28/10/2026

Trường không thể thay đổi do quy tắc nghiệp vụ hiển thị là giá trị cố định; áp dụng cho loại phân loại Chi tiêu và loại giao dịch khi sửa Đầu tư. Nút xóa/ngừng giữ màu ngữ nghĩa ở hover/focus. Table dialog dùng căn giữa theo chiều dọc; logo và tên có khoảng cách rõ, tên dài xuống dòng. Mobile bỏ chiều rộng cố định của cột thao tác/ngày, căn nhãn với giá trị và giữ 44px cho nút. Preview Chi tiêu dùng primitive focus/cuộn chung, tách thời gian khỏi tên/chỉ tiêu. Xem [rà soát](features/expense-feedback-2026-10-28.md).


## Tinh chỉnh phản hồi thao tác — 28/10/2026

Scrollbar menu mảnh trên nền trong suốt; menu mobile giới hạn theo chiều cao viewport và cuộn riêng. Chú thích trường bắt buộc chuyển thành “* Bắt buộc” nhỏ, căn phải; dấu sao nhãn dùng màu phụ để dành màu lỗi cho thông tin cần sửa. Toast có icon, tiêu đề ngắn, nội dung chi tiết và cạnh màu theo success/error/warning, cùng bề mặt nhẹ và nút đóng dễ bấm. Thông báo thành công dừng tự đóng trong lúc đọc bằng chuột/bàn phím. Áp dụng cùng token hiện có cho sáng/tối; giữ hướng Zen và bản nháp. Xem [quy chuẩn giao diện](features/ui-feedback.md).


## Bộ chọn kỳ Thu nhập — 28/10/2026

Thu nhập bỏ hai nút tháng trước/sau, dùng trực tiếp select Năm và Tháng như Chi tiêu. Hai ô cùng hàng trên desktop/mobile, đủ vùng bấm 44px và không cắt giá trị. Chọn năm vẫn tải dữ liệu năm đó; chọn tháng giữ tab và bộ lọc báo cáo. Thay đổi này thay thế bố cục có mũi tên ngày 23/10, giữ lịch sử nghiệm thu cũ.

## Refactor source — 28/10/2026

Các editor, workspace, dialog và CSS được tổ chức lại để bảo trì; thiết kế và luồng thao tác hiện tại giữ nguyên. Controller tiếp tục sở hữu draft, filter, preview và trạng thái chưa xác định kết quả lưu; không remount form để đồng bộ dữ liệu hoặc locale. Dialog stack/focus/scroll lock dùng một primitive chung; các phần của stylesheet tương tác giữ nguyên thứ tự và specificity. Quy ước source và cách kiểm hồi quy được ghi trong [hướng dẫn bảo trì](11-source-maintenance.md); các mốc UX trước vẫn là lịch sử độc lập.


## Dialog phân loại Chi tiêu — 28/10/2026

Danh sách hai trường dùng tên bên trái và cặp thao tác bên phải ở mọi độ rộng. Bỏ nhãn “Tên/Thao tác” lặp trên từng thẻ mobile; giữ 44px cho mỗi nút, 8px giữa nút và cho tên dài xuống dòng. Bộ emoji 90 gợi ý có ô nhập emoji riêng và lỗi tại ô; tìm kiếm không xóa biểu tượng đã chọn. Chọn thương hiệu phân nhóm ngân hàng/ví, giữ logo màu gốc. Chi tiết tại [Chi tiêu](features/expenses.md#phân-loại-mobile-emoji-và-thương-hiệu--28102026).

## Quy tắc nhất quán — 28/10/2026

Viết cho người dùng phổ thông, ưu tiên dễ đọc và thao tác được. Hai ô Năm/Tháng cùng hàng; dialog mobile tối đa 90% vùng hiển thị, giữ góc bo và cuộn riêng; menu đóng khi chạm ngoài hoặc focus đi ra. Phân cấp chữ bằng vai trò, không thu nhỏ tùy trang để né tràn. Xem [đặc tả và phạm vi](features/usability-consistency-2026-10-28.md).


## Responsive và nội dung phổ thông — 29/10/2026

Giữ nhận diện hiện tại. Header mobile ưu tiên cùng hàng với điều khiển gọn; preview là khung điện thoại cuộn nội bộ. FAQ là section riêng, mở độc lập và đẩy nội dung mượt. Nội dung thường trực chỉ giải thích điều cần cho người dùng quyết định hoặc thao tác. Xem [quy tắc và kiểm chứng](features/responsive-disclosures-2026-10-29.md).

## Tổng quan theo nhu cầu — 29/10/2026

Thay phần chào lớn bằng tiêu đề gọn; mặc định 6 widget bao phủ 5 module và việc cần chú ý. Bốn widget tùy chọn cho phân bổ, hũ, đáo hạn và lời nhắn theo theme. Tùy chỉnh có nút di chuyển thay vì phụ thuộc kéo thả; Xem thử/Lưu/Hủy, khôi phục mặc định phải Lưu. Hai cột khi vùng nội dung từ 760px, mobile một cột và dialog toàn màn hình. Dùng nhãn kỳ, thiếu định giá, tạm tính và lỗi từng nguồn. [Chi tiết](features/overview.md).

### Form Đầu tư — 29/10/2026

Ghi giao dịch là một form chia ba nhóm, hai cột trên desktop và một cột trên điện thoại. Ô nhập/select căn đầu, nhãn bắt buộc cùng dòng và lỗi ngắn ngay dưới trường. Giữ bước xem trước tác động trước khi lưu. Xác nhận bỏ nội dung dùng dialog ứng dụng, mặc định tiếp tục nhập; bản nháp số sai định dạng cũng được bảo vệ. Xem [quy chuẩn phản hồi](features/ui-feedback.md).
