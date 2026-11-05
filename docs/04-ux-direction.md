# Hướng UI/UX

## Nguyên tắc

Ngày 05/11/2026: lịch sử thay đổi Tiết kiệm có khung thu gọn, số lần cập nhật và phạm vi toàn bộ sổ. Dòng thời gian ưu tiên tên thao tác; thời gian ghi nhận và lần ghi là thông tin phụ, lý do tách riêng. Desktop căn thời gian bên phải; điện thoại xếp dọc, giữ nội dung dài và thao tác bàn phím của disclosure native. Giữ Nunito, năm theme và hướng sổ tài chính hiện có.

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

Rà soát spacing 04/11/2026: khối bộ lọc sở hữu lề 24px giữa các nhóm (16px ở màn hình ≤639px), kể cả khi thu gọn; thanh mở/đặt lại cách nội dung lọc 12px. Trang dùng grid không cộng thêm lề của tiêu đề/hướng dẫn vào gap cha. Nhãn thống kê 14px, số tiền nổi bật hơn và tự xuống dòng khi cần; chú thích và nút giải thích cách bảng/biểu đồ 16px. Xem [phạm vi và bằng chứng](features/workspace-spacing-2026-11-04.md).

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

Từ 02/11/2026: giữ bốn tab Danh mục, Giao dịch, Báo cáo, Quản lý. Bảng desktop/thẻ mobile hiển thị vốn đang đầu tư, tài sản đã mua, tiền chờ, tổng giá trị và lãi/lỗ phần đang giữ. Ví quản lý trong chi tiết danh mục. Bỏ lãi đã bán và kết quả kỳ khỏi UI/CSV. Mua/bán qua ví cùng danh mục; bán hết về ví không tự lưu trữ.

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

Tinh chỉnh 30/10/2026: tab Giao dịch dùng cột tiền căn phải, nút có icon và chữ thống nhất; tìm kiếm luôn hiện, bộ lọc phụ trong dialog mở theo nhu cầu. Tab Nơi giữ tiền đặt tên/trạng thái và nút Sửa ngắn ở hàng đầu, số dư theo cặp nhãn/giá trị. Lịch sử phân cấp hành động/thời gian/số tiền, mở để đối chiếu snapshot trước/sau và lý do. Card sinh hoạt tách số tiền/tháng, tháng nguồn và danh sách hũ. Tùy chọn cập nhật nguồn ở vùng riêng trước danh sách hũ, có giải thích trạng thái giữ/cập nhật và fieldset hũ khóa khi giữ mức cũ. Cùng bố cục áp dụng ba quỹ, vi/en và chế độ che tiền; tóm tắt dialog thu gọn trên điện thoại để dành chỗ cho nội dung.

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

### Tổng quan tải đúng bố cục — 29/10/2026

Mặc định mới gồm năm thẻ Thu nhập, Chi tiêu, Tiết kiệm, Đầu tư và Quỹ, chỉ giữ số chính cùng cảnh báo cần thiết. Giữ nguyên bố cục tài khoản đã lưu. Trước response đầu hiện trạng thái tải chung; không dựng sáu widget mặc định trước khi biết cấu hình. Tùy chỉnh vẫn có 10 loại widget. Cần chú ý chỉ theo module có widget đang hiện, không kiểm tra module đã ẩn. Gợi ý khôi phục không còn trên Tổng quan; khôi phục vẫn tại Cài đặt. Bản nháp, nguồn lỗi và cập nhật nền giữ phản hồi rõ ràng. [Chi tiết](features/overview.md).

### Lý do chặn khôi phục và làm trống — 29/10/2026

Thẻ khôi phục giải thích mục nào còn dữ liệu và loại bản ghi bằng ngôn ngữ người dùng; không gọi số lượng hàng DB là số giao dịch, không hướng dẫn xóa từng giao dịch để đạt điều kiện trống. Thông báo hệ thống chưa sẵn sàng độc lập với dữ liệu đang có. Nút làm trống riêng mở dialog có tài khoản, phạm vi xóa, tải backup, xác nhận đã lưu và nhập cụm xác nhận. Focus đầu ở Hủy, footer cố định/body cuộn theo Modal dùng chung; lỗi tại thao tác. Mất phản hồi giữ mã yêu cầu cho retry, không tự kết luận thành công. Sau reset không tự nhập file; hồ sơ và tùy chọn giữ nguyên.

### Phân biệt lỗi quyền và mất phản hồi reset — 30/10/2026

**Bổ sung 04/11/2026:** dialog reset dùng chỉ báo hai bước luôn hiện ở đầu vùng cuộn; email nổi bật, phạm vi xóa và thông tin giữ lại tách nhóm, số bản ghi căn hàng và có giải thích. Sau khi tạo backup, tiêu đề bước xác nhận nhận focus; ô nhập có border/nền/focus rõ trong sáng/tối. Chỉ hiện nút xóa ở bước xác nhận. Chi tiết ở [dialog làm trống](features/settings-reset-dialog-2026-11-04.md).

Lỗi quyền xử lý đã rollback báo rõ hệ thống chưa đủ quyền, dữ liệu chưa bị xóa và cho phép đóng hộp thoại. Mất phản hồi mạng giữ mã yêu cầu để kiểm tra lại, không tự khởi tạo thao tác xóa khác. Giữ bản sao lưu/bản nháp và hiển thị lỗi tại thao tác bằng vi/en.

## Mục tiêu — 30/10/2026

Trang trả lời “đã chuẩn bị bao nhiêu, còn thiếu gì và bước tiếp theo là gì”. Thẻ hai cột desktop/một cột mobile, tiến độ cùng cơ sở tính và hạn; nguồn có tỷ lệ còn khả dụng. Dữ liệu thiếu khác 0. Form nhóm rõ, preview trước/sau và xác nhận; hoàn thành không tự rút tiền. Không cộng tiến độ thành tổng tài sản. Giữ token/font/shell, năm theme, che tiền và vi/en. Xem [Goals](features/goals.md).

## Cột giao dịch Quỹ an toàn — 02/11/2026

Danh sách ngoài trang và dialog ba quỹ dùng cột thao tác 96px trên desktop: hai nút icon 44×44px cách nhau 8px, tên trợ năng/tooltip đầy đủ vi/en. Tiền căn phải với chữ số đều, tiền và thao tác giữa dọc hàng. Container tối đa 700px đưa thao tác xuống hàng riêng; tối đa 480px đặt loại giao dịch/tiền ở đầu, metadata bên dưới. Chỉ nhóm nút trong hàng giao dịch không xuống dòng; các nhóm nút khác giữ responsive hiện có. Tiền dài và ghi chú được xuống dòng trong cột riêng, không cắt giá trị. Xem [đặc tả Quỹ](features/funds.md).

## Bố cục thao tác toàn ứng dụng — 02/11/2026

Nhóm nút thường cách 12px, icon gọn 8px, mô tả/thông báo cách nút tối thiểu 16px. Footer tự quản lý spacing cho mọi module, mobile từ ba nút dành hàng cuối cho nút chính; nhãn dài xuống dòng và giữ thứ tự Tab. Giữ cột giao dịch Quỹ 96px cùng cặp nút 44px/khe 8px. Rà vị trí theo nội dung liên quan, trạng thái trống/lỗi/preview và dialog con; đo hình render, xem ảnh, kiểm tra WebKit/Firefox. Xem [checklist bắt lỗi từ một ví dụ](features/action-layout-2026-11-02.md).

Ô nhập chữ/ngày/select/textarea giữ token 16px kể cả khi module dùng `font: inherit` từ nhãn 14px; kiểm tra cả toolbar, bộ lọc và dialog để tránh co chữ, xuống dòng bất cân đối hoặc zoom khi focus trên điện thoại.

Ở chữ 200%, nhãn Help dài được xuống dòng thay vì đẩy trang tràn ngang. Header mobile dành vùng co giãn theo cỡ chữ cho tên ứng dụng, cho các nút xuống hàng khi cần; menu tài khoản mở dưới chiều cao header hiện tại, có cuộn và giữ trong viewport.

## Thông báo lỗi kiểm tra dữ liệu — 02/11/2026

Toast của form Quỹ, Chi tiêu, Thu nhập và Tiết kiệm dùng tóm tắt dễ đọc cho lỗi kiểm tra dữ liệu; chi tiết ở đúng trường, không hiển thị mảng lỗi Zod. Ghi giao dịch Quỹ phân biệt tiền trống (“Nhập số tiền giao dịch.”), số 0 và số dài quá 24 chữ số; focus ô cần sửa, giữ bản nháp và dừng trước yêu cầu xem trước/lưu. Vi/en có cùng hành vi; trạng thái chưa rõ kết quả ghi giữ thông báo cảnh báo riêng. Xem [phản hồi giao diện](features/ui-feedback.md).

## Select và hàng phụ bộ lọc — 02/11/2026

Select một lựa chọn trong ứng dụng/dialog giữ HTML native nhưng chuẩn hóa khung đóng, mũi tên theo theme, chữ 16px và chiều cao tối thiểu 44px; control tăng theo cỡ chữ. Giữ kích thước gọn riêng của Năm/Tháng và ngôn ngữ, không thêm mũi tên thứ hai. Forced colors dùng lại giao diện native.

Bộ lọc giao dịch Đầu tư dùng grid 4/2/1 cột theo vùng nội dung 900/560px, các ô cao 46px tại cỡ chữ chuẩn, căn đáy và cách 16px. Tùy chọn hiện giao dịch đã hủy ở hàng phụ cùng mép trái; checkbox 20px, chữ cách 10px và vùng nhãn bấm tối thiểu 44px. Giữ thứ tự DOM/Tab và lọc trực tiếp. Xem [đặc tả và kiểm chứng](features/select-controls-2026-11-02.md).


## Báo cáo chung — 02/11/2026

Bộ lọc tháng/quý/năm dùng chung cho sáu tab Tổng hợp, Thu–chi, Tiết kiệm, Đầu tư, Quỹ an toàn, Mục tiêu; lựa chọn nằm trên URL. Giữ shell/font và năm chủ đề. Hướng Achromatic ledger (seed 1459982955), giữ màu/chữ sản phẩm và sidebar hiện có vì đây là màn hình trong app. Chỉ số nhóm trong một vùng, số căn phải/tabular trong bảng, bảng dài cuộn trong vùng dữ liệu. Dữ liệu thật, nhãn thiếu/tạm tính rõ; không có số tài sản ròng tổng hợp.

Bấm chỉ số mở dialog đối chiếu chỉ đọc, phân trang 20 dòng; sửa tại module gốc. Kỳ đang diễn ra so với cả kỳ trước, có nhãn chưa kết thúc. Mục tiêu luôn hiện ngày cập nhật và không tham gia so sánh kỳ cũ. Biểu đồ có bảng thay thế, tooltip chuột/chạm/Tab và chế độ che tiền. CSV xuất dữ liệu đầy đủ theo tab, độc lập phân trang và vẫn chứa số đầy đủ như các CSV hiện có. Landing chỉ dùng dữ liệu minh họa cố định.

## Lời nhắn có nhịp riêng — 02/11/2026

Một chút bình yên là điểm nghỉ ngắn trước nội dung làm việc: câu serif nghiêng 18–24px, nhãn nhỏ và dấu ngoặc kép SVG, nền tint phẳng cùng theme, không emoji. Không cắt câu, không tự xoay theo giờ, không chiếm focus. Chuyển trang/reload đổi câu; thao tác trong trang giữ câu để tránh phân tâm. Việt/Anh cùng ID; tất cả theme dùng chung kho. Tổng quan giữ vị trí widget nếu đang bật, nếu không hiển thị đầu trang; luôn chỉ một câu. Preview công khai giữ câu cố định. Xem [quote](features/quotes.md).

### Dấu tiếng Việt trong quote — 04/11/2026

Thay chuỗi serif hệ thống bằng Noto Serif tải kèm đủ latin/vietnamese, dùng bản nghiêng thật 400. Bỏ ép sát khoảng chữ, nâng line-height lên 1.65, giữ cỡ 18–24px. Cùng quy tắc áp dụng ở dải đầu trang, widget Tổng quan và câu minh họa trong preview.

## Help trước mô tả và trạng thái khôi phục — 04/11/2026

Đợt trước bỏ sót Cài đặt: nút Help đứng trước đoạn văn vẫn cách 0px. Kiểm bố cục nội dung/thao tác theo cả hai hướng, gồm tiêu đề → Help → mô tả; khối chứa sở hữu gap 16px. Trạng thái khôi phục ưu tiên câu điều kiện và tên/trạng thái từng mục, chi tiết sổ/lịch sử mở khi cần. Không đưa tổng bản ghi vào nhãn thu gọn để tránh hiểu là số giao dịch. Hướng tiếp tục và trạng thái hệ thống luôn rõ; link làm trống chỉ dẫn đến hướng dẫn. Xem [đặc tả](features/settings-restore-layout-2026-11-04.md).

## Giữ mạch thao tác — 04/11/2026

Giữ năm theme và quote đầy đủ, đưa minh họa nhỏ cạnh tên chức năng. Số chính và thao tác thường dùng được ưu tiên ở màn hình đầu. Mobile mở bộ lọc nâng cao và thao tác phụ khi cần; luôn giữ trạng thái kỳ, tạm tính/thiếu giá/cũ gần số liệu. Khi rời biểu mẫu có thay đổi, chọn Tiếp tục nhập hoặc Bỏ thay đổi. Kỳ/tab/bộ lọc theo từng sổ được nhớ trong phiên tài khoản, có điều khiển về hiện tại/đặt lại. Menu chia nhóm; Cài đặt một trang với thao tác làm trống cuối cùng. Xem [đặc tả và tiêu chí](features/workspace-comfort-2026-11-04.md).

## Chờ dữ liệu và sau lưu — 04/11/2026

Sau commit, màn hình dùng view đã xác nhận từ server và giữ kỳ/tab/bộ lọc; response tải cũ không ghi đè kết quả mới. Lỗi ghi chưa rõ kết quả giữ command/nháp để retry. Cài đặt gộp sự kiện trở lại trang; báo cáo chỉ tính khi phần tương ứng cần. Các con số preview cố định, không mô phỏng lưu vào tài khoản. Xem [hành vi và giới hạn](features/performance-2026-11-04.md).


## Nội dung và hướng dẫn tại chỗ — 04/11/2026

Các trang có phần mở rộng giải thích cách bắt đầu và đọc số liệu; Tổng quan nêu rõ việc tiếp theo, tên quỹ và nguồn thu dùng ngôn ngữ gần gũi. Xem [hợp đồng nội dung và đối chiếu tác vụ](features/friendly-content-2026-11-04.md). Không đổi API, schema, dữ liệu hoặc cách tính tiền.

## Preview công khai — 04/11/2026

Dùng tiêu đề module thật và thứ tự câu nhắn → tiêu đề → hướng dẫn → kỳ (nếu có) → số liệu. Sidebar minh họa chỉ giữ menu và một câu ngắn; giải thích nghiệp vụ thuộc hướng dẫn tùy mở. Thẻ Tổng quan có hành động Mở sang tab mẫu cùng sổ, nhãn trước số tiền và chú thích sau. Che tiền đặt ở chrome phía trên như ứng dụng thật; không thêm bộ chọn kỳ chung cho Tổng quan. Chi tiết tại [landing](features/landing.md).

Rà cuối 05/11/2026: menu preview lấy thứ tự từ catalog điều hướng của app; tên truy cập nút Mở bao gồm cả hành động và tên sổ trong hai ngôn ngữ.


## Bố cục Mục tiêu — 05/11/2026

Giữ Nunito/năm theme, tăng phân cấp bằng số liệu và nhóm nội dung thay vì kéo giãn nhãn/giá trị. Bộ lọc tìm kiếm rộng, trạng thái vừa đủ, reset/sắp xếp theo kích thước nội dung. Chi tiết dẫn bằng tiến độ, kế hoạch góp và sổ riêng/nguồn liên kết. Giao dịch dùng cặp biểu tượng 44px và nhãn truy cập; sắp xếp nhiều mục diễn ra trong một hộp thoại có nháp và xác nhận. Xem [kiểm chứng bố cục](features/goals-layout-2026-11-05.md).

## Dialog phân loại và đơn giá vàng — 05/11/2026

Lỗi thiếu schema logo/icon cho phép tiếp tục sửa hoặc đóng qua xác nhận bỏ thay đổi; dialog con giữ bản nháp cha. Nhãn giá vàng ghi rõ đơn vị danh mục, giải thích tổng giá vốn riêng với giá bán lại của một đơn vị. Archive/Restore dùng icon có tên truy cập. Báo cáo Đầu tư hiện đủ bộ lọc trong grid responsive và tách nhãn/select biểu đồ. Xem [đặc tả và kiểm chứng](features/feedback-2026-11-05.md).

## Thao tác Ví tiền chờ — 05/11/2026

Nút thêm ví thuộc nhóm tiêu đề; tên ví và số dư dẫn mỗi hàng. Ba thao tác thường dùng chuyển thành icon 44px có tooltip hover/focus; “Thêm thao tác” gom mở đầu, sửa, lưu trữ/khôi phục thành phần mở rộng có nhãn. Escape đóng tooltip/phần mở rộng trước khi đóng dialog; điện thoại xếp thao tác dưới số dư, không ép sáu nút chữ trên một dòng. Giữ Nunito/năm theme và luồng xem trước/xác nhận. Xem [đặc tả Đầu tư](features/investments.md).


## Nguồn danh mục trong Mục tiêu — 05/11/2026

Danh sách nguồn Đầu tư có một dòng cho mỗi danh mục, gồm tài sản và toàn bộ tiền chờ. Ghi chú giải thích hai cơ sở tính, dùng chung Việt/Anh và che tiền. Liên kết cũ được gom cùng dòng, giữ tỷ lệ từng phần; bỏ chọn rồi chọn lại dùng tổng danh mục qua xem trước/xác nhận. Không tự thay tiến độ hoặc snapshot cũ. Preview landing giữ ví dụ Mua xe dùng sổ riêng và số liệu cố định, chỉ cập nhật hướng dẫn nguồn. Xem [quy tắc](features/goals.md).


## Căn hàng các bước khôi phục — 05/11/2026

Thanh Chọn file → Kiểm tra → Khôi phục dùng `gap` cho khoảng cách, bỏ margin dọc kế thừa từ danh sách trong panel để số và nhãn thẳng hàng. Từng bước được xuống hàng khi thiếu chỗ. Giữ điều kiện tài khoản trống và luồng xem trước/xác nhận; xem [đặc tả sao lưu](features/backup.md#căn-hàng-các-bước-khôi-phục--05112026).
