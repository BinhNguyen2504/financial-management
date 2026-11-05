# Kiểm tra API cập nhật và hành vi khi gọi API — 2026-11-05

## Kết luận

Các nhóm API ghi dữ liệu chính hoạt động trong môi trường local có PostgreSQL riêng và Auth giả lập. Chưa thấy lỗi ghi trùng, ghi dở dang hoặc ghi chéo tài khoản trong các ca kiểm chứng. Tuy nhiên, có **4 nhóm lỗi ở phía giao diện/xử lý phản hồi**, được tái hiện bằng 6 tình huống trên Chromium desktop và mobile mô phỏng. Các lỗi này chưa được sửa trong lần kiểm tra này.

Đây không phải xác nhận API cloud đang hoạt động. Không gọi API ghi trên tài khoản thật, không reset hay nhập dữ liệu cloud. Các phản hồi rỗng, HTML 200 và 401 trong các ca chẩn đoán được chủ động giả lập; không có bằng chứng backend hiện tại tự sinh ra các phản hồi thành công sai định dạng đó.

## Phạm vi

Rà source các route, application command, repository, HTTP client, editor và luồng nhận kết quả; đối chiếu với bộ kiểm thử unit, PostgreSQL và browser. Checkout: `e1e23f9` kèm các thay đổi Báo cáo có sẵn trong workspace. Giữ nguyên những thay đổi đó.

| Nhóm | API | Loại lệnh trong schema |
| --- | --- | ---: |
| Chi tiêu | `POST /api/v1/expenses/{preview,commands}` | 11 |
| Thu nhập | `POST /api/v1/income/{preview,commands}` | 8 |
| Tiết kiệm | `POST /api/v1/savings/{preview,commands}` | 9 |
| Đầu tư | `POST /api/v1/investments/{preview,commands}` | 6 |
| Quỹ an toàn | `POST /api/v1/funds/{preview,commands}` | 4 |
| Mục tiêu | `POST /api/v1/goals/{preview,commands}` | 5 |
| Bố cục Tổng quan | `PUT /api/v1/overview/layout` | Lưu theo revision |
| Khôi phục/làm trống | `POST /api/v1/data/{import/preview,import,reset/prepare,reset}` | Các bước chuẩn bị và xác nhận |
| Hồ sơ | Supabase Auth `updateUser` | Cập nhật metadata |

Tổng cộng 43 loại lệnh tài chính được rà source. Kiểm thử HTTP bổ sung chạy lệnh đại diện cho từng nhóm, không phải mọi tổ hợp của 43 lệnh với mọi dạng lỗi. Bộ kiểm thử hiện có bổ sung CRUD, giao dịch, lịch sử sửa/hủy, chốt kỳ, nguồn liên kết, backup/restore và reset.

## Phát hiện

### F1 — P1: có thể báo thành công khi chưa nhận xác nhận ghi hợp lệ

**Lưu Thu nhập:** chặn request ghi và trả `200 {}` mà không gửi đến backend. Giao diện hiện toast thành công, đóng form và tải lại danh sách trống; API đọc xác nhận `book === null`. Bản nháp đã bị đóng dù chưa có dữ liệu được ghi.

`requestJSON` chỉ kiểm tra parse JSON và HTTP status, rồi ép kiểu `T`, không xác thực cấu trúc kết quả: [http-client.ts](../../src/lib/http-client.ts#L31). Hook Thu nhập hiện toast thành công và gọi `onSaved(result.view)` ngay sau đó: [use-income-editor.ts](../../src/features/income/use-income-editor.ts#L145). Cùng client được dùng cho sáu sổ; tái hiện UI trực tiếp trong lần này ở Thu nhập, chưa khẳng định mọi editor có cùng biểu hiện.

**Khôi phục:** chặn `/api/v1/data/import`, trả HTML với HTTP 200 và không thực hiện import. Giao diện vẫn hiện “Đã khôi phục toàn bộ dữ liệu tài chính”, trong khi `/api/v1/data/status` xác nhận tài khoản vẫn trống. Luồng hiện bỏ qua hoàn toàn nội dung phản hồi thành công: [use-settings-workspace.ts](../../src/features/settings/use-settings-workspace.ts#L280).

Hướng sửa: xác thực kết quả command/import trước khi hiện thành công, đóng bản nháp hoặc đánh dấu hoàn tất. Phản hồi không hợp lệ sau một lần ghi cần giữ yêu cầu cũ để đối soát/thử lại an toàn. Import cần kiểm tra bản tóm tắt kết quả phù hợp với bản xem trước; cân nhắc bổ sung mã xác nhận yêu cầu trong hợp đồng phản hồi.

### F2 — P1: Mục tiêu cho phép bỏ yêu cầu khi kết quả ghi chưa rõ

**Mất phản hồi sau commit:** cho request đi qua backend và commit thật trong DB test, sau đó cắt phản hồi. Giao diện có cảnh báo chưa xác nhận, nhưng nút Hủy vẫn bật. Hàm đóng mở hộp thoại “Bỏ thay đổi?” và nút bỏ gọi thẳng `onClose`, không chặn theo `uncertain`: [editor.tsx](../../src/features/goals/editor.tsx#L62), [nút Hủy](../../src/features/goals/editor.tsx#L173), [bỏ thay đổi](../../src/features/goals/editor.tsx#L299). DB đã có version 1. Người dùng có thể hiểu rằng dữ liệu chưa lưu và nhập lại ở một form mới.

**JSON lỗi kèm HTTP 200 sau commit:** backend đã ghi, nhưng phản hồi bị thay bằng nội dung không parse được. Hook chỉ đánh dấu chưa rõ kết quả khi status bằng 0 hoặc từ 500, bỏ sót `INVALID_RESPONSE` kèm status 200: [editor.tsx](../../src/features/goals/editor.tsx#L128). Nút Quay lại vẫn bật và có thể xóa command đang cần thử lại.

Hướng sửa: giữ command/mã yêu cầu khi chưa xác định kết quả; chặn các đường đóng/bỏ/quay lại tương ứng; nhận diện `INVALID_RESPONSE` và lỗi không có xác nhận đáng tin cậy. Giữ thao tác xác nhận lại cùng command khả dụng.

### F3 — P2: HTTP 401 lúc lưu chưa xóa dữ liệu đang hiển thị một cách nhất quán

Tạo một khoản Thu nhập đã lưu, mở form khác rồi cho API ghi trả 401 `UNAUTHENTICATED`. Form hiện lỗi, nhưng khoản thu cũ vẫn còn trong màn hình và editor vẫn mở. Catch của hook không chuyển sang trạng thái hết phiên: [use-income-editor.ts](../../src/features/income/use-income-editor.ts#L154).

Rà source thấy Chi tiêu, Tiết kiệm và Đầu tư cũng chưa chuyển 401 của editor sang cơ chế hết phiên của workspace. Mục tiêu và Quỹ an toàn đã có `onAuthLost`; lưu bố cục Tổng quan cũng có cơ chế xóa số liệu khi nhận 401. Lần này tái hiện trực tiếp tình huống lỗi ở Thu nhập trên cả hai viewport; phạm vi ba sổ còn lại dựa trên source.

Hướng sửa: đồng bộ xử lý 401 từ mutation với luồng hết phiên khi đọc dữ liệu; xóa dữ liệu hiển thị và có đường đăng nhập lại rõ ràng. Phân biệt 401 với gián đoạn Auth 503 để không xóa bản nháp chỉ vì dịch vụ tạm lỗi.

### F4 — P2: form vẫn bị khóa sau khi đã xác nhận xung đột và tải phiên bản mới

Các bước tái hiện ở Thu nhập:

1. Cắt lần ghi đầu trước khi đến backend; form chuyển sang trạng thái chưa xác định kết quả.
2. Ghi một khoản khác qua API, làm tăng version của sổ.
3. Thử lại command đầu; backend trả `VERSION_CONFLICT` và không ghi.
4. Chọn “Tải dữ liệu mới, giữ nội dung nhập”; tải thành công và hiện hướng dẫn kiểm tra lại.
5. Ô Tên và nút Hủy vẫn bị khóa vì `uncertain` chưa được xóa.

Hook chỉ đặt `uncertain = true` khi lỗi không rõ kết quả, nhưng không giải phóng sau lần từ chối xác định và tải lại thành công: [use-income-editor.ts](../../src/features/income/use-income-editor.ts#L159), [reloadAfterConflict](../../src/features/income/use-income-editor.ts#L223). Các hook Chi tiêu/Tiết kiệm/Đầu tư/Quỹ cũng cần được rà cùng cơ chế; chưa tái hiện trực tiếp chuỗi lỗi này trong từng sổ đó.

Hướng sửa: mô hình hóa rõ các trạng thái đang gửi, chưa biết kết quả, đã bị từ chối và đã ghi. Chỉ mở khóa/tạo command mới khi có đủ bằng chứng command trước không được ghi; không xóa trạng thái chưa chắc chắn chỉ vì nhận một lỗi bất kỳ.

## Bằng chứng kiểm chứng

- Unit: **344/345 qua**. Ca lỗi là hướng dẫn tiếng Anh của Báo cáo còn đoạn tiếng Việt, tại `tests/i18n.test.ts:195`; không phải lỗi API ghi. Log: [api-audit-unit.log](../../artifacts/api-audit-unit.log).
- PostgreSQL riêng, áp dụng toàn bộ migration: **120/120 qua**, gồm transaction/rollback, cạnh tranh phiên bản, idempotency, owner isolation, backup/restore/reset và data generation. Log: [api-audit-db.log](../../artifacts/api-audit-db.log).
- Browser production build, Chromium desktop, 14 file test hiện có: **103/106 qua**. Ba ca còn lại có giả định cũ về các link trong nhóm menu đang đóng hoặc bỏ qua hộp thoại bảo vệ bản nháp. Log: [api-audit-browser.log](../../artifacts/api-audit-browser.log). Không coi lượt chạy này là toàn bộ xanh.
- Bản sao ba ca trên trong `artifacts/api-update-audit/compat-*.spec.ts` được chỉnh thao tác theo giao diện hiện tại; kiểm tra lại trên desktop/mobile mô phỏng. Không chỉnh các test/source đang có trong repo.
- Các probe bổ sung kiểm tra sáu nhóm API qua HTTP thật: 200, 400, 401, 403, 405, 409, 413, 415, 422; preview không ghi; header private/no-store; `return=view`; hai lần gửi đồng thời cùng command chỉ tăng version một lần; từ chối nội dung khác dùng chung mã yêu cầu và version cũ.
- Các ca có tên `BUG:` dùng `test.fail()` để ghi lại các hành vi sai đã biết. Playwright có thể tính chúng vào nhóm kết quả đúng kỳ vọng; **không được diễn giải là lỗi đã sửa hoặc hành vi sản phẩm đã đạt**. Mỗi ca phải lỗi tại đúng assertion mô tả phát hiện, sau khi đã xác nhận các bước tiền đề.
- Lượt probe cuối: **22/22 ca hành vi bình thường qua; 12/12 ca chẩn đoán tái hiện đúng lỗi mong đợi** (6 tình huống × desktop/mobile). Không có ca ngoài kỳ vọng, skipped hay flaky. Trong 22 ca bình thường có 6 lần kiểm tra lại ba test cũ theo thao tác hiện tại. Các file cốt lõi được đối chiếu hash và khớp source snapshot dùng để build lượt test cuối.
- Probe và kết quả cuối: [audit.spec.ts](../../artifacts/api-update-audit/audit.spec.ts), [api-audit-verified.log](../../artifacts/api-audit-verified.log), [verified-report.json](../../artifacts/api-update-audit/verified-report.json). Screenshot/trace nằm trong `artifacts/api-update-audit/verified-results/`.

Hai lượt xây dựng probe đầu phát hiện lỗi fixture (body JSON bị serialize thêm, selector status trùng và ví đầu tư chưa có danh mục sở hữu). Đã sửa riêng fixture theo hợp đồng hiện tại; không đổi logic tài chính để làm test qua. Các log trung gian không phải bằng chứng đạt cuối cùng.

## Giới hạn và tài liệu

Node 22.12.0, Next.js 16.4.1; build ứng dụng riêng cho browser test, PostgreSQL local riêng, Supabase Auth double. Không kiểm chứng Supabase Auth/RLS cloud, deployment, mạng thực tế hay thiết bị vật lý. Chưa chạy Firefox/WebKit trong lần audit này. Không cần migration hay triển khai cho chính báo cáo kiểm tra; các hướng sửa ở trên chưa được triển khai.

Đã đối chiếu catalog module, landing/preview, README và tài liệu feedback/validation để hiểu phạm vi sản phẩm. Audit không thay đổi tính năng, UI hay mô hình dữ liệu nên không thay nội dung giới thiệu hoặc trạng thái module; giữ nguyên lịch sử validation và các thay đổi Báo cáo có sẵn.
