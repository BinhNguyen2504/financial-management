# Rà soát UI/UX — 17/10/2026

Giữ phong cách Zen, bảng Chi tiêu trên desktop và thẻ trên điện thoại.

- Bảng: tiêu đề cột tiền và giá trị cùng căn phải; số dùng tabular numerals. Ô tiền và nhóm thao tác căn giữa theo chiều cao dòng. Cột thao tác giữ vị trí nút sửa thống nhất, có chỗ cho Dùng tiền. Bảng rộng cuộn trong vùng riêng.
- Thu nhập: tên/mô tả, số tiền và nút thao tác có vùng riêng trên desktop; xếp dọc trên điện thoại. Không lặp lại ghi chú khi nội dung giống mô tả. Giảm chiều cao dòng tổng tiền và khoảng trống không cần thiết ở phần đầu trang.
- Thông báo lỗi: chữ và nút thử lại cách nhau rõ ràng, tự xuống hàng trên màn hình nhỏ. Thử lại tải dữ liệu mà không chuyển khỏi trang.
- Dialog dùng chung: bấm nền hoặc Escape đóng lớp trên cùng; nút X và Hủy vẫn hoạt động. Bắt đầu kéo/chọn chữ bên trong rồi thả ra ngoài không đóng nhầm. Trong lúc kiểm tra/lưu bất đồng bộ, thao tác đóng được chặn đến khi có kết quả.
- Dialog con: giữ dialog cha và vị trí cuộn khi mở form sửa/xóa/biểu tượng/phân loại. Hủy, Escape hoặc bấm nền quay lại cha và khôi phục focus. Khi lưu thành công, kết thúc luồng như trước và tải lại dữ liệu. Lớp bị che có inert/aria-hidden; từng dialog có ID tiêu đề riêng. Khóa cuộn nền đến khi đóng dialog cuối.
- Safari/WebKit: quản lý focus ở mousedown, tránh hành vi mặc định làm nút mất focus trước click. Khắc phục focus không quay về nút mở và trường hợp menu tài khoản đóng trước sự kiện click Đăng xuất sau khi điều hướng bằng bàn phím.
- Minh họa: tám cảnh SVG dùng chung bảng màu sáng/tối — chăm cây, hũ, mầm non, giỏ thu hoạch, vườn cây, đường tới mục tiêu, nhà kính và đá cân bằng. Phân bố theo nội dung trang; hình trang trí không tham gia cây truy cập. Giới hạn kích thước minh họa để không tạo khoảng trống lớn trên điện thoại.

Kiểm thử hồi quy mới nằm trong `tests/browser/ui-feedback.spec.ts`. Chạy bằng Node 22.12.0:

```sh
TEST_WEBKIT=1 npm run test:e2e
```

Runner dùng production build Next riêng, PostgreSQL và Auth double local. Kiểm tra gồm desktop Chromium, Chromium mô phỏng điện thoại và WebKit mô phỏng iPhone; sáng/tối, reduced motion, viewport 320/768/1024/1440/1920, đo tọa độ căn cột/nút, lỗi mạng/thử lại và dialog lồng nhau. Kết quả này không thay thế nghiệm thu cloud hoặc thiết bị vật lý.


## Loading trực quan — 18/10/2026

- Component dùng chung `src/components/loading.tsx`: vòng xoay CSS nhỏ và thông báo tải có `role="status"`, `aria-atomic`. Vòng xoay trang trí không được đọc thêm bởi screen reader.
- Dùng cho Tổng quan, Thu nhập, Chi tiêu, Tiết kiệm, Đầu tư, hồ sơ, kiểm tra trạng thái và xem trước backup trong Cài đặt; avatar có vòng xoay khi xác minh tài khoản. Tiết kiệm hiện trạng thái khi cập nhật lại cả khi đã có dữ liệu.
- Các nút đăng nhập/đăng xuất, xem trước/lưu bốn module, lưu hồ sơ, xuất/nhập backup hiện vòng xoay cạnh nhãn khi chờ server; giữ khóa thao tác cũ và thêm `aria-busy`. Chỉ báo thành công sau phản hồi thật.
- Tải lại Tổng quan/Thu nhập/Chi tiêu bật lại loading; lỗi kết thúc vòng xoay và giữ nút thử lại. Không đặt timeout giả hoặc che nội dung đã tải bằng overlay.
- Màu theo token sáng/tối; vòng xoay không co lại khi chữ xuống dòng. Reduced motion tắt quay, vẫn giữ biểu tượng và lời nhắn dễ đọc.

Kiểm chứng loading trong `tests/browser/loading.spec.ts`: giữ request để quan sát trạng thái chờ, trả kết quả thật, lỗi/thử lại, disabled/aria-busy, sáng/tối, giảm chuyển động, điện thoại 375px và xoay ngang. Xem kết quả theo ngày tại [validation](../07-validation.md).

Đã rà soát catalog, landing copy và preview: trạng thái module và khả năng tài chính không đổi; preview public vẫn là dữ liệu cố định, chuyển tab ngay không cần giả lập loading. Avatar của landing dùng cùng vòng xoay xác minh tài khoản. README và tài liệu UX đã cập nhật cùng source.


## Dialog có nhiều dữ liệu — 18/10/2026

- Bốn module dùng chung khung native dialog: header luôn hiện, một vùng `.dialog-body` cuộn, footer thao tác nằm ngoài vùng cuộn và vẫn liên kết với form qua ID. Detail tối đa 960px, form 760px, xác nhận 480px; điện thoại dưới 640px gần toàn màn hình, có safe area.
- Tóm tắt số liệu đặt trước danh sách; nhãn, ngày dữ liệu, tiền và đề mục có cấp độ riêng. Bảng có tiêu đề cột/căn tiền trên desktop, chuyển thành thẻ có nhãn trên mobile. Ghi chú dài có disclosure để đọc đầy đủ.
- Tab có số lượng và điều hướng phím mũi tên/Home/End, giữ trạng thái các panel. Danh sách tối đa 20 dòng/trang, mới trước; tìm tên/nội dung/ghi chú không dấu, bộ lọc loại/trạng thái/ngày khi phù hợp, đếm kết quả và thông báo không khớp. Không cắt bỏ lịch sử cũ. Preview cũng phân trang, nhãn Trước/Sau và giữ quyền xác nhận khi đổi trang.
- Tiết kiệm: tiền/ví có lịch sử; vàng có Đợt vàng/Giao dịch, tiền gửi có Sổ tiền gửi/Giao dịch. Mặc định còn nắm giữ/đang gửi, có xem tất cả và đã bán/tất toán. Chỉ lấy giao dịch đến ngày số dư đang xem. Biến động tiền theo phía tài khoản gồm phí/thuế, không suy dấu từ tiền ròng toàn giao dịch. Lãi trả ra ngoài sổ và lãi nhập gốc/tái tục có nhãn riêng.
- Đầu tư: tổng hợp danh mục trước lịch sử; chi tiết giao dịch hiện trạng thái hiện hành và ảnh hưởng trước/sau, revision nằm trong tab riêng, mới nhất trước. Giao dịch hủy có trạng thái và không hiển thị tác động như đang có hiệu lực.
- Chi tiêu: tab Theo tháng/Các lần sử dụng/Lịch sử thay đổi, tab sử dụng chỉ cho hũ tích lũy; quản lý hũ nằm ở phần riêng. Phương thức/nhóm có tab, tìm kiếm và phân trang. Thu nhập phát sinh có tổng kỳ và danh sách có tìm kiếm, không thêm tab rỗng.
- Mở màn hình con giữ parent inert/aria-hidden và trạng thái đọc. Hủy/đóng hoặc lưu thành công quay lại màn hình cha, cập nhật số liệu, giữ tab/bộ lọc/trang/vị trí. Khi nút cũ bị xóa, focus trở về điều khiển còn tồn tại trong parent. Hành vi lưu này thay thế việc kết thúc cả luồng đã ghi ở ngày 17/10.
- Chế độ riêng tư che giá trị và khối lượng trong summary, bảng, preview và nội dung hỗ trợ đọc; không thêm số thô vào aria-label/title. Preview public vẫn dùng hằng số, không đọc tài khoản.

Kiểm thử chuyên biệt: `tests/browser/dialogs.spec.ts`; hồi quy bốn module, loading, tooltip và dialog stack. Bằng chứng chạy và giới hạn môi trường được ghi thêm tại `docs/07-validation.md` sau kiểm chứng.


## Cập nhật ngầm khi quay lại — 19/10/2026

Hành vi này thay thế việc bật loading mỗi lần quay lại của Tổng quan/Thu nhập/Chi tiêu được mô tả ngày 18/10. Khi đã có view, giữ nội dung và không chèn vòng xoay/thông báo tải gây dịch chuyển bố cục. Lần mở đầu, thử lại khi chưa có dữ liệu và đổi năm Thu nhập vẫn hiện LoadingStatus. Nút thử lại báo busy và bị khóa trong khi chờ, kể cả đang giữ dữ liệu cũ; lỗi tải tự động vẫn có thông báo và nút thử lại, lỗi xác thực xóa view.

`createRefreshController` và `useForegroundRefresh` gộp focus/visibilitychange/online theo mỗi view: dữ liệu mới hơn 60 giây không tải lại khi focus; reconnect hoặc đổi ngày Việt Nam có thể tải sớm hơn, tối thiểu 5 giây giữa các lần tải tự động. Bỏ qua khi đang ẩn/offline hoặc còn request. Thành công cập nhật mốc thời gian, lỗi có thể thử lại sau 5 giây khi quay về tiếp theo. Gợi ý khôi phục tài khoản trống dùng cùng cơ chế để tránh gọi status trùng. Không polling, không cache tài chính bền vững; lần mở trang, lưu, retry và timer qua ngày không bị chặn.

Kiểm thử chính sách trong `tests/foreground-refresh.test.ts`; kiểm request thật, dữ liệu server đổi, bố cục, lỗi/thử lại, 401, offline/reconnect và bản nháp trong `tests/browser/foreground-refresh.spec.ts`. Các kiểm loading lần đầu tiếp tục ở `loading.spec.ts`.

## Rà soát mở rộng — 19/10/2026

Quy chuẩn form, trạng thái dữ liệu, cột bảng, tooltip, theme, điều hướng và ma trận 33 phản hồi được mô tả trong [đợt rà soát 19/10](interface-feedback-2026-10-19.md). Kiểm tra cùng loại lỗi xuyên module, gồm cả tình huống sửa rồi hoàn tác, dữ liệu thiếu so với số 0, hành động ngừng và dữ liệu lịch sử.

## Help và dialog lồng nhau — 20/10/2026

Help dùng dialog stack hiện có với biến thể bên phải/toàn màn hình; Escape được chặn lan truyền khỏi dialog đang xử lý. Nút giải thích dùng pointer-focus helper để trả focus đúng trên WebKit. Bộ kiểm thử Help kiểm tra mở trên hai dialog, giữ bản nháp và scroll, khóa cuộn cho đến khi lớp cuối đóng, kích thước 375px/landscape, theme và chữ lớn. Kết quả môi trường được ghi ở validation, không suy thành kiểm chứng thiết bị thật.

Khi hồi quy Help, phát hiện hydration ở tiêu đề SVG của hướng dẫn cài đặt: nhiều React text node bị trình duyệt gộp trong `<title>`. Chuyển tiêu đề thành một chuỗi template duy nhất để markup server/client khớp; không dùng suppressHydrationWarning.

Rà soát bàn phím bổ sung Tab từ tiêu đề được mục lục focus: Help đưa focus về nút đóng thay vì thoát sang thanh trình duyệt; Shift+Tab từ nút đóng quay về mục cuối. Thanh đầu trang cho phép xuống hàng khi phóng lớn; bộ chọn kỳ Thu nhập dưới 400px dùng selector đủ cụ thể để giữ hai cột, tránh phụ thuộc thứ tự stylesheet.

## Bộ chọn cột và thông tin phụ — 21/10/2026

`ColumnPicker` dùng native auto popover trên top layer, không mở nội dung trong luồng bảng hoặc bị vùng cuộn cắt. Đặt nút ở thanh tiêu đề ngữ cảnh khi có; Chi tiêu đưa cạnh số hũ. Popover có công tắc căn hàng, nhãn cột cố định và nút reset; đóng bằng nút, bấm ngoài hoặc Escape. Escape trả focus về nút mở và chỉ đóng popover; reset đưa focus về công tắc vì nút reset trở thành disabled. Điện thoại hẹp dùng panel căn giữa để dành đủ chỗ cho các lựa chọn; viewport ngang ngắn tận dụng chiều cao màn hình, danh sách cuộn riêng.

Logo phụ trợ không nên cạnh tranh với tên hũ: dùng biểu tượng 20px không có ô viền lớn; icon nhóm 16px. Nhãn và icon là một cụm không bị tách dòng; nhiều cụm dùng flex-wrap có khoảng cách, thay chuỗi text/bullet xen các khối inline cao thấp. Kiểm bằng tọa độ căn giữa, chiều cao hàng và ảnh; không chỉ xác nhận asset tải được. Xem [Chi tiêu](expenses.md#cột-hiển-thị-và-nhận-diện-phương-thức--21102026).


## Tinh chỉnh Help theo phản hồi — 21/10/2026

Nút Hướng dẫn chuyển về cạnh h1, dùng biểu tượng sách và nhãn chữ nhẹ; giữ nhãn trên điện thoại. Mục lục và mục lớn đánh số 01–06; mục con 3.1/4.1… có khoảng cách và đường phân cách. Tư duy, ví dụ và điểm dễ nhầm có khối nền khác nhau; từ khóa, công thức và số tiền minh họa được nhấn có chọn lọc bằng đậm/màu theo theme.

Help trượt vào từ phải 280ms và thu về 220ms. Đóng giữa chuyển động lấy vị trí/độ mờ hiện tại để tránh giật; modal giữ focus và khóa cuộn đến khi xong. Timeout 300ms giải phóng bảng nếu animationend bị thiếu, timer được dọn khi rời route. Reduced motion bỏ hiệu ứng và đóng ngay. Các dialog khác giữ cách đóng hiện có.

Kiểm thử bổ sung đo vị trí giữa animation, kiểm focus/khóa cuộn trong lúc đóng, fallback khi tắt animation, reduced motion, phân cấp nội dung và không lộ dấu nhấn source trong bài đã render. Kết quả và phạm vi local được ghi tại [validation](../07-validation.md).

## Chủ đề Khu vườn / Dòng nước — 21/10/2026

Bổ sung hai thẻ chủ đề và nhóm chế độ hiển thị riêng. Đổi áp dụng ngay, giữ state/bản nháp, đồng bộ giữa các tab; storage bị chặn dùng bộ nhớ phiên. Nhánh minh họa và lời dẫn được CSS chọn trước paint, giảm nguy cơ nháy sai hình khi hydration. Chuyển màu 180ms chỉ bật sau thao tác chọn, tôn trọng reduced motion. Xem [themes](themes.md) và bằng chứng tại [validation](../07-validation.md).

## Bổ sung Kim ngân — 21/10/2026

Thêm chủ đề vàng với đủ sáng/tối, icon, lời dẫn, tám cảnh SVG và ba cảnh Quỹ. Bộ chọn có ba thẻ; desktop ba cột, tablet hai cột và điện thoại một cột. Landing/preview cố định, login, Help và offline cùng áp dụng lựa chọn. Không đổi dữ liệu, bản nháp, thuật ngữ nghiệp vụ hay màu logo. Chi tiết: [themes](themes.md); bằng chứng local và giới hạn: [validation](../07-validation.md).

## Trạng thái lưu và nhập liệu xuyên ứng dụng — 21/10/2026

- Thông báo kết quả lưu dùng toast chung, ở trên dialog đang mở. Chỉ báo thành công sau phản hồi ghi nhận; lỗi có thông báo tại chỗ và giữ bản nháp. Mất phản hồi khi ghi là kết quả chưa rõ, không kết luận đã lưu hay thất bại; lỗi tải lại sau lưu được báo riêng.
- Ô tiền VND có dòng đọc số `1.000.000 ₫` ngay dưới, ô trống có gợi ý và chế độ riêng tư che số. Lượng vàng, tỷ lệ, hệ số không đọc như tiền. Nhãn cần nhập đặt `*` sát tên và giải thích một lần đầu form. Lỗi kiểm tra trình duyệt, nghiệp vụ và API hiện dưới ô, liên kết bằng `aria-describedby`; focus tới lỗi đầu tiên khi gửi.
- Dialog cuộn phần nội dung, giữ hàng nút ổn định, kể cả khi mở Help hoặc form con. Xem trước Quỹ an toàn nêu giao dịch và các số trước/sau thực sự khác nhau, kèm mức tăng giảm; chi tiết phụ nằm trong vùng mở rộng.
- Hồ sơ sắp xếp lại vùng nhận diện, nút quay lại và lưới form. Nút thu gọn ở đầu sidebar desktop; mobile có biểu tượng cùng tên ứng dụng. Nút Hướng dẫn có nền/viền rõ hơn ở trạng thái thường trên cả ba chủ đề.

## Bổ sung Lửa ấm — 22/10/2026

Thêm chủ đề đỏ gạch/san hô với đủ sáng/tối, lời dẫn/icon, tám cảnh SVG và ba cảnh Quỹ theo tiến độ. Bộ chọn bốn thẻ xếp hai cột desktop/tablet, một cột dưới 561px. Landing/preview, login, Help và offline kế thừa lựa chọn; giữ dữ liệu, bản nháp, logo, emoji và ngữ nghĩa cảnh báo/lỗi. Minh họa lửa tĩnh, chỉ có phản hồi ngắn khi tương tác và tôn trọng giảm chuyển động. Xem [themes](themes.md) và [validation](../07-validation.md).


## Bổ sung Đất lành — 22/10/2026

Hoàn thành bộ năm chủ đề bằng Nâu — Đất lành với sáng/tối riêng, lời dẫn/icon, tám cảnh SVG và ba cảnh Quỹ. Địa hình, tầng đất, đá cuội, đất nung và ruộng bậc thang tạo khác biệt với Khu vườn. Bộ chọn ba cột desktop, hai cột 561–900px và một cột dưới 561px. Theme lưu theo trình duyệt, áp dụng ngay cho app/login/offline/landing thành viên, giữ bản nháp và chế độ hiển thị. Landing marketing khách giữ palette riêng. Xem [themes](themes.md) và [validation](../07-validation.md).
