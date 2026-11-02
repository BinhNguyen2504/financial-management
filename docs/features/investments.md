# Đầu tư: tài sản đang giữ và tiền chờ

Đặc tả hiện hành ngày **02/11/2026** tại `/investments`. Theo dõi tổng danh mục VND như Cổ phiếu, Trái phiếu, Bitcoin; chưa có từng mã/lô, ngoại tệ hoặc giá trực tuyến. Source implementation không tự xác nhận triển khai cloud.

## Danh mục và công thức

Mỗi danh mục sở hữu một hoặc nhiều ví tiền chờ; một ví chỉ thuộc một danh mục. Tạo danh mục chưa có tài sản và ví mặc định với giá trị 0 trong cùng command. Tiền mới nạp vào ví được tính ngay vào tổng giá trị; không yêu cầu khai báo một định giá 0 riêng. Ví được quản lý trong chi tiết danh mục, không đứng ngang hàng với danh mục đầu tư.

- **Vốn đang đầu tư:** giá vốn phần tài sản còn giữ, gồm phí/thuế mua.
- **Giá trị tài sản đã mua:** tổng giá trị thị trường phần còn giữ do người dùng nhập, có ngày định giá.
- **Tiền chờ:** tổng số dư ví thuộc danh mục.
- **Tổng giá trị hiện tại:** giá trị tài sản đã mua + tiền chờ.
- **Lãi/lỗ phần đang giữ:** giá trị tài sản đã mua − vốn đang đầu tư. Tỷ lệ chia cho vốn; vốn 0 hiển thị `—`.

Nạp 10 triệu, mua 7 triệu thì ví còn 3 triệu. Định giá phần đã mua thành 8 triệu: tổng danh mục 11 triệu, lãi 1 triệu. Tiền chờ không tham gia phép tính lãi/lỗ. Bán hết về ví 12 triệu rồi rút 4 triệu: tổng còn 8 triệu, vốn/giá trị tài sản/lãi lỗ bằng 0. Mua lại chỉ tính phần đang giữ mới.

## Luồng và giao diện

Giữ bốn tab Danh mục, Giao dịch, Báo cáo, Quản lý. Desktop dùng bảng, mobile dùng thẻ với cùng ý nghĩa chỉ số. Chi tiết danh mục chứa tài sản, các ví, thao tác giao dịch và lịch sử liên quan của cả danh mục/ví.

1. Tạo danh mục; ví tiền chờ mặc định được tạo đồng thời. Có thể thêm ví riêng trong chi tiết.
2. Ghi tài sản/số dư mở đầu tại ngày bắt đầu nếu đã có. Đây không phải khoản nạp mới. Mở đầu phải trước mọi phát sinh liên quan.
3. **Nạp → mua → định giá → bán về ví → rút.** Mua/bán mới bắt buộc qua ví cùng danh mục; không có lựa chọn Bên ngoài.
4. Mua tăng vốn bằng tiền mua + phí + thuế, trừ ví. Bán nhập giá vốn phần bán, giảm vốn và đưa tiền bán − phí − thuế về ví. Khi mua/bán, bắt buộc nhập tổng giá trị phần tài sản còn giữ sau giao dịch.
5. Định giá riêng bất cứ lúc nào, chỉ nhập phần tài sản đã mua, không cộng tiền chờ; không đổi giá vốn hoặc số dư ví.
6. Bán hết tự lấy toàn bộ vốn và giá trị còn giữ 0; tiền bán do người dùng nhập. Không tự lưu trữ danh mục. Chỉ lưu trữ khi vốn, giá trị và toàn bộ tiền chờ bằng 0; thiếu định giá không bằng 0.

Không hiển thị kết quả đã bán, kết quả đầu-cuối kỳ đã loại dòng tiền, hay những danh mục mẫu mang tên tất toán/mất vốn. Các trường kế toán cũ có thể còn trong engine/backup để giữ lịch sử kỹ thuật, không dùng làm lãi/lỗ hiển thị.

### Bộ lọc giao dịch — 02/11/2026

Bốn trường Từ ngày, Đến ngày, Danh mục/ví và Loại giao dịch dùng grid theo chiều rộng nội dung: từ 900px có bốn cột, 560–899px có hai cột, dưới 560px có một cột; khe 16px. Nhãn ở trên, các ô cùng hàng căn đáy và cao 46px tại cỡ chữ chuẩn, tăng theo chữ lớn. Checkbox “Hiện cả giao dịch đã hủy” nằm dưới grid, cách 16px và cùng mép trái; ô vuông 20px, cách chữ 10px, toàn nhãn là vùng bấm cao tối thiểu 44px.

Select dùng quy tắc chung để tránh control WebKit co nhỏ. Giữ picker native, nhãn trợ năng, thứ tự Tab, lọc ngay khi đổi và giá trị bộ lọc hiện tại; không thêm nút Áp dụng hoặc thay nghĩa giao dịch đã hủy. Xem [quy tắc control và kiểm chứng](select-controls-2026-11-02.md).

## Lịch sử, API và lưu trữ

Giữ sáu bảng `investments_*`; JSONB của ví bổ sung `parentCategoryId`. Danh mục tài sản có parent null, ví bắt buộc trỏ tới danh mục tài sản cùng owner. Không đổi loại danh mục; ví có lịch sử kể cả đã hủy không đổi chủ sở hữu. Dữ liệu test cũ không có quan hệ ví phải tạo lại, không tự đoán liên kết.

- `createCategory` cho danh mục tạo ví cùng transaction; `walletId` tùy chọn, mặc định suy ra ổn định từ ID danh mục để preview/retry nhất quán. Tạo thêm ví yêu cầu `parentCategoryId`.
- Mua/bán yêu cầu `cashCategoryId` là ví thuộc danh mục và hoạt động tại ngày giao dịch.
- `GET /api/v1/investments` trả thêm `portfolios`: các position tài sản kèm `wallets`, `cash` tổng và `total`; `state.positions` giữ các nguồn tài sản/ví độc lập.
- Giữ preview, version, idempotency, atomic writes, sửa/hủy có revision, thứ tự gốc cùng ngày, kiểm tra lại mốc lưu trữ sau sửa quá khứ. Tiền là chuỗi số nguyên/BigInt, ngày theo Asia/Ho_Chi_Minh và không vượt hôm nay.
- Trang vẫn await server page-access; API kiểm Auth, Origin, owner và runtime RLS. Không thêm quyền admin cho ứng dụng.

## Báo cáo và tích hợp

Báo cáo tháng/quý/năm/khoảng ngày dùng trạng thái cuối kỳ: vốn, tài sản, tiền chờ, tổng giá trị và lãi/lỗ phần đang giữ. Lọc danh mục bao gồm các ví con. Lọc loại giao dịch chỉ lọc hoạt động/dòng tiền, không bỏ lịch sử tính số dư. CSV dùng cùng ý nghĩa, có chống công thức ô văn bản; không có cột lãi đã bán.

Dùng định giá gần nhất không muộn hơn ngày đang xem; định giá cũ có ngày/cảnh báo, thiếu định giá không thay bằng 0. Không dựng số thực tế tháng tương lai hoặc trước ngày bắt đầu. Tổng toàn module cộng từng tài sản/ví đúng một lần.

Tổng quan dùng lãi/lỗ phần đang giữ và tổng giá trị có tiền chờ. Mục tiêu tiếp tục có nguồn tài sản và ví riêng; giá trị nguồn tài sản không cộng ví để tránh tính hai lần. Backup/restore toàn tài khoản giữ `parentCategoryId` và kiểm tra trước mọi ghi; dữ liệu Đầu tư cũ không tương thích phải báo lỗi, không tự bỏ phần dữ liệu đó. Privacy Mode tiếp tục che số tiền, tooltip, trợ năng và preview; file xuất có dữ liệu đầy đủ.

## Dữ liệu mẫu và môi trường

Bộ mẫu mới có Cổ phiếu (đúng ví dụ 10/7/3/8 triệu), Quỹ cổ phiếu, Trái phiếu, Bitcoin và Quỹ chỉ số; minh họa nhiều ví, bán một phần, bán hết, mua lại, sửa/hủy và định giá cũ. Không đọc tài khoản vào public landing preview.

Thay mock chỉ được giới hạn sáu bảng Đầu tư cho đúng owner test, có snapshot trước và kiểm tra không còn tham chiếu Mục tiêu. Script chuẩn bị gói SQL admin; không dùng reset toàn tài khoản hoặc nới RLS/immutable-history của runtime. Kiểm thử gói thay dữ liệu trên PostgreSQL local trước khi bàn giao. Cloud và thiết bị vật lý phải báo riêng theo bằng chứng thực tế.

## Lịch sử trước 02/11/2026

Các mục dưới đây ghi nhận cách triển khai/kiểm thử cũ; ngữ nghĩa hiện hành ở phía trên thay thế các phần nói về lãi đã bán và ví độc lập.

## Bộ mẫu theo ảnh Notion cho cùng tài khoản — 18/10/2026

`data:investments:sample -- --base <bộ mẫu Tiết kiệm>/sample-data.json` tạo phần bổ sung Đầu tư có marker cùng bộ review, các số vốn/định giá tham khảo ảnh và nhiều tình huống tự tạo. Không ghi đè ba module trước. Có SQL migration+seed nguyên tử cho admin, seed qua runtime sau khi có schema, backup và reset đủ 28 bảng. Reset mặc định chưa xác nhận, chỉ được dùng sau review.

Lần kiểm tra tài khoản mục tiêu: đã có Tiết kiệm trên cloud, chưa có schema Đầu tư; runtime không có quyền tạo bảng. Đã lưu backup các module trước và chuẩn bị file 01-enable-and-seed.sql, **chưa nạp Đầu tư cloud**. Xem [hướng dẫn dữ liệu review](../10-sample-data.md#bộ-review-đầu-tư-cùng-tài-khoản-và-reset-28-bảng--18102026).


## Giao diện chi tiết — 18/10/2026

Chi tiết danh mục ưu tiên giá trị/vốn/lãi lỗ, lịch sử có lọc và phân trang. Chi tiết giao dịch ưu tiên phiên bản hiện hành, ảnh hưởng Trước/Sau, tách tab lịch sử sửa/hủy. Mở form không đóng parent; lưu thành công cập nhật và quay về đúng nơi. Preview dùng nhãn Trước/Sau và footer luôn tiếp cận được. Xem [quy chuẩn dialog](ui-feedback.md).

## Help theo ngữ cảnh — 20/10/2026

Hướng dẫn tổng danh mục, ví tiền chờ, giá vốn bán nhập tay, giá trị sau giao dịch, định giá và kết quả kỳ; không mô tả quản lý từng mã hoặc lấy giá trực tuyến. Xem [Help theo từng trang](help.md).

## Quy chuẩn giao diện dùng chung — 20/10/2026

Bảng rộng cho chọn cột và giữ lựa chọn trên trình duyệt; cột định danh/thao tác luôn hiện. Form sửa vô hiệu lưu/xem trước khi dữ liệu nghiệp vụ chưa đổi, kể cả khi chỉ nhập lý do. Tiền nguyên bỏ số 0 đầu khi blur/submit; field bắt buộc và lỗi có chỉ báo, nội dung lỗi tiếng Việt và tổng hợp lỗi dẫn về trường tương ứng. Thao tác sửa/hủy có icon, hành động hủy giao dịch dùng màu nguy hiểm; đóng form con tiếp tục giữ ngữ cảnh dialog cha. Xem [đối chiếu phản hồi toàn ứng dụng](interface-feedback-2026-10-19.md).

## Phản hồi nhập liệu — 21/10/2026

Tiền, giá theo đơn vị, phí và thuế đọc số VND dưới ô; số lượng và tỷ lệ giữ đơn vị riêng. Lỗi kiểm tra hoặc API ở đúng trường, kèm focus. Toast phân biệt ghi thành công, thất bại và chưa rõ kết quả; lỗi tải lại sau ghi có thông báo riêng. Footer dialog giữ vị trí khi nội dung dài.

## Anh/Việt — 22/10/2026

Giao diện, Help và thông báo dùng ngôn ngữ trong Cài đặt; định dạng vi-VN/en-GB, vẫn VND và giờ Việt Nam. Tên/ghi chú và dữ liệu tài chính giữ nguyên. CSV nhận `locale=vi|en` (mặc định vi), dịch tên cột/nhãn hệ thống nhưng giữ số/ngày dạng chuẩn và chống công thức CSV. Không có migration hay đổi cấu trúc backup. Xem [đặc tả ngôn ngữ](localization.md).

## Bố cục và cuộn — 23/10/2026

Tab workspace một hàng cuộn ngang; điều hướng phím giữ vị trí trang. Bảng danh mục/báo cáo tách toolbar khỏi vùng dữ liệu cuộn ngang. Xem [ma trận rà soát](layout-scroll-2026-10-23.md).

## Minh họa riêng theo chủ đề — 26/10/2026

Tiêu đề dùng vườn cây ăn quả, thuyền buồm, cân tài sản, lò gốm hoặc cầu đá theo năm theme, khác hình Tiết kiệm. Trạng thái trống dùng cảnh khởi đầu thay cho việc lặp hình tiêu đề. Minh họa hiện cả trên điện thoại và trong preview thành viên, hỗ trợ sáng/tối; hình trang trí tĩnh không phản ánh số dư, kết quả hoặc cam kết sinh lời. Xem [bảng minh họa](themes.md#minh-họa-tiết-kiệm-và-đầu-tư--26102026).

## Tỷ lệ minh họa tiêu đề — 26/10/2026

Giữ bộ năm cảnh Đầu tư riêng, dùng bố cục tiêu đề chung thay các kích thước cũ 180/120/96px. Khung hình mới 240–320px trên desktop/tablet và 216px ở hàng riêng dưới chữ trên điện thoại. Không đổi cảnh khởi đầu hoặc các chỉ số tài chính. Xem [chủ đề giao diện](themes.md).

## Tổ chức source — 28/10/2026

Đầu tư tách model/replay khỏi xử lý command; editor tách action/controller/trường nhập/preview, workspace tách hook dữ liệu. CSV có bản dịch ở lớp trình bày; giữ vốn nhập tay, phí/thuế, lịch sử và retry như trước. Không đổi HTTP/schema hoặc áp migration cloud. Xem [hướng dẫn bảo trì](../11-source-maintenance.md) và [bằng chứng kiểm tra](../07-validation.md).

### Nhất quán toàn ứng dụng — 28/10/2026

Đã đối chiếu nội dung, cỡ chữ, dialog/menu và bộ chọn kỳ với [quy tắc dùng chung](usability-consistency-2026-10-28.md). Giữ quy tắc nghiệp vụ, lịch sử và giới hạn chức năng; kết quả kiểm chứng ghi riêng theo môi trường.


## Responsive và nội dung phổ thông — 29/10/2026

Thông tin danh mục và ghi chú dài dùng thành phần mở rộng chung. Lời nhắc lưu chưa xác nhận được rút gọn, vẫn nói rõ nội dung tạm giữ nguyên; logic khóa/retry không đổi. Xem [quy tắc và kiểm chứng](responsive-disclosures-2026-10-29.md).

## Chỉnh form giao dịch và tùy chọn cột — 29/10/2026

Form một màn chia Thông tin giao dịch, Số tiền và định giá, Thông tin bổ sung; desktop hai cột, mobile một cột. Phí/thuế cùng nhóm riêng, giá trị sau giao dịch có hướng dẫn ngay dưới ô. Control một dòng cao 46px ở chữ mặc định và tăng theo cỡ chữ; nhãn, dấu bắt buộc, hướng dẫn và lỗi không kéo giãn control bên cạnh. Header/footer giữ vị trí, phần nội dung cuộn. Vẫn xem trước tác động rồi xác nhận lưu; mọi chỉnh sửa, kể cả bản nháp số sai định dạng, làm mất hiệu lực preview cũ.

Lỗi schema được chuyển thành hướng dẫn theo trường và toast tóm tắt; không hiển thị JSON UUID/regex. Lỗi dưới trường dùng văn bản ngắn, xuống dòng theo từ; tổng hợp lỗi liên kết tới ô sai và đưa focus về trường đầu tiên. Giới hạn tiền nguyên tối đa 24 chữ số, quy tắc cho phép 0 và điều kiện số dương vẫn do schema hiện có quyết định.

Đóng bằng X, nút đóng, Escape hoặc backdrop dùng cùng kiểm tra thay đổi. Nếu có nội dung chưa lưu, dialog ứng dụng cho Tiếp tục nhập hoặc Bỏ thay đổi; focus mặc định vào Tiếp tục nhập. Đóng xác nhận quay lại bản nháp và vị trí đọc, kể cả số sai định dạng đang giữ riêng trong LocalizedInput. Form chưa đổi hoặc đã trở về ban đầu đóng ngay. Đang lưu/chưa rõ kết quả tiếp tục khóa đóng và sửa, giữ command ID cho retry.

CSS workspace loại checkbox/radio và hàng tùy chọn cột khỏi kiểu form. Rà cùng nguyên nhân ở Tiết kiệm và Quỹ, giữ công tắc 34×20px trong hàng tối thiểu 44px. Không thay API, schema, backup hoặc migration. Bằng chứng local được ghi riêng trong [validation](../07-validation.md).

## Chuẩn bị thay mock tài khoản test

`node --env-file=.env.local scripts/prepare-investment-refresh.mjs --source imports/<existing-review>/sample-data.json` đọc runtime/RLS, lưu snapshot sáu bảng và sinh `replace-investments.sql`. Đây là thao tác chuẩn bị, không ghi cloud. SQL cần kết nối migration/admin vì runtime không được xóa lịch sử. Script kiểm tra snapshot còn khớp, chặn mọi liên kết Mục tiêu, giữ nguyên module khác, khôi phục trigger khi commit hoặc rollback, và trả snapshot sau thay. Không triển khai schema hoặc dùng reset toàn tài khoản.
