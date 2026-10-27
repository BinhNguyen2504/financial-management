# Dữ liệu mẫu để review UI/UX

Lựa chọn ngày 16/10/2026: **nạp vào tài khoản Supabase hiện tại**. Không cần cung cấp mật khẩu, OTP hoặc service-role key. `data:sample` chỉ sinh file local. Khi `.env.local` đã kết nối app với Supabase, `data:import` có thể nạp bằng đúng role runtime, giữ RLS. SQL Editor là cách thay thế và dùng cho reset sau review.

## Tạo và nạp mẫu

Đăng nhập ứng dụng một lần để tài khoản xuất hiện trong Supabase → Authentication → Users. Sao chép **User UID** của chính tài khoản đó; đây không phải project ID. Dùng Node 22:

```bash
nvm use 22
npm run data:sample -- --owner <USER_UID>
```

Script in ra đường dẫn `imports/ui-review-<ngày>-<mã>/`. Thư mục `imports/` đã được loại khỏi Git. Mỗi lần tạo có mã dataset riêng; giữ nguyên cả bộ cho đến hết review. File được tạo với quyền chỉ user hiện tại đọc/ghi.

| File               | Cách dùng                                                                                 |
| ------------------ | ----------------------------------------------------------------------------------------- |
| `sample-data.json` | Xem mẫu và nguồn tham khảo; không phải định dạng restore của app                          |
| `00-inspect.sql`   | Kiểm tra UID tồn tại, số record ở 14 bảng và marker của bộ mẫu                            |
| `01-seed.sql`      | Chạy trong Supabase SQL Editor bằng role `postgres`/chủ bảng; tải lại app cùng tài khoản  |
| `02-backup.sql`    | Xuất record tài chính của owner dưới dạng JSON trước khi reset; lưu kết quả ra file riêng |
| `03-reset.sql`     | Chỉ dùng sau khi chốt UI/UX; mặc định từ chối chạy vì chưa xác nhận                       |

Cần áp dụng đủ hai migration trong `supabase/migrations/` và cấu hình ứng dụng theo [hướng dẫn cloud](09-expenses-cloud.md). Chọn đúng Supabase project. Chạy nguyên nội dung từng file SQL để giữ transaction. Không đặt connection admin vào `DATABASE_URL` của app; runtime vẫn dùng `expense_api`.

**Seed không ghi đè dữ liệu tài chính có sẵn.** Có thể dùng lại sổ Chi tiêu vừa khởi tạo: version 1, chỉ có audit khởi tạo, tối đa một command khởi tạo, đúng một năm hiện tại chưa chốt, chưa có hũ/nhãn/số tiền/giao dịch. Seed giữ audit/command ban đầu, đưa tháng bắt đầu về tháng 1 để có lịch sử mẫu và thêm marker mới ở version 2. Các trường hợp khác bị từ chối. Không tự xóa dữ liệu để seed thành công. Chạy lại đúng bộ đã nạp giữ nguyên chỉnh sửa review; bộ khác sẽ bị từ chối.

Nếu app đã có `.env.local` với `DATABASE_URL` của `expense_api`, có thể chạy ngay trong terminal:

```bash
# Mặc định chỉ đọc số record, không ghi database.
npm run data:import -- --file imports/<BỘ_MẪU>/sample-data.json
# Nạp nguyên tử sau khi lưu backup owner vào backups/ (đã gitignore).
npm run data:import -- --file imports/<BỘ_MẪU>/sample-data.json --apply
```

Importer không dùng admin hoặc service-role key; từ chối connection không phải `expense_api`, đặt owner trong transaction như backend và vẫn chịu RLS. Database FK xác nhận owner tồn tại. Các file SQL admin vẫn dùng được độc lập; không cần chạy SQL seed lại sau khi CLI import thành công.

## Nội dung mẫu

- **18 hũ** lấy tên/phương thức/mức tham khảo từ ảnh Notion và ảnh Expenses bổ sung: Thúy đại học, tiền nhà cho thuê, ăn uống & cà phê, mượn bác Thịnh, sinh hoạt, quan hệ, mua sắm, điện/nước, đồ gia dụng, du lịch, lãi dì hai, bỏ bóp, YouTube, thu rác, cắt tóc, Internet, iCloud.
- **5 phương thức**: MoMo, Timo, Cash, HSBC, ShopeePay. Nhóm mục đích: Gia đình/Bản thân. Nhãn `Saving` ở các dòng học phí, mượn, đồ gia dụng, du lịch, lãi được dùng để chọn hũ tích lũy trong **bộ mẫu**; chưa xác nhận đây là phân loại nghiệp vụ thật của từng khoản.
- **Thu nhập**: Lương FSOFT, tiền nhà cố định; Freelance / Thưởng là phát sinh một lần. Dùng mức quý I nhìn thấy trong ảnh, thêm số liệu minh họa đến tháng hiện tại. Tháng 1–2 lương bằng 0, tháng 3 trở đi 19 triệu; tiền nhà 2,6 triệu/tháng. Đều là dữ liệu review, không xác nhận các khoản đã thực nhận.
- Số liệu từ tháng 1 đến hôm nay theo giờ Việt Nam của năm hiện tại; tháng còn lại chỉ có kế hoạch. Có số dư chuyển tháng, bổ sung tiền, mua sắm vượt mức, sử dụng tích lũy và lịch sử nhập thu để xem bảng, báo cáo tháng/quý/năm và biểu đồ.

Ảnh có tổng **21 dòng**, nhưng một số dòng/tên bị cắt. Bộ mẫu chỉ dùng 18 tên đọc được qua các ảnh; không suy diễn ba dòng thiếu. Không ép tổng mẫu bằng 19,7 triệu vì ảnh ở các thời điểm khác nhau và có cả tiền dành riêng. Số dư `Hiện tại`, ngân sách, `Month`, `Vượt` trong ảnh không tự động trở thành số dư khởi tạo thật. Số dư đầu mẫu là 0; lịch sử phát sinh và số dư trong app là minh họa có thể tính lại bằng domain engine.

Hai dòng mượn/trả lãi là hũ dành tiền để review; chưa tạo dư nợ hoặc giao dịch vay. Mô tả/ghi chú có nhãn **DỮ LIỆU MẪU UI/UX**. Đây vẫn là record trong database, đồng bộ theo tài khoản và có thể sửa/xuất như record bình thường.

Bộ mẫu 16/10 gồm `/income`, `/budgets` và phần `/overview` đang đọc Chi tiêu. Bộ bổ sung 17/10 bên dưới thêm `/savings`, giữ nguyên bộ Thu nhập/Chi tiêu trước đó. Đầu tư, Quỹ, Mục tiêu và Phân bổ chưa có persistence nghiệp vụ.

## Review rồi bắt đầu từ đầu

Kiểm tra bảng desktop, thẻ mobile, lọc tháng/phương thức/nhóm, báo cáo tháng/quý/năm, đổi emoji, nhập số dư, sử dụng tích lũy, chỉnh mức có hiệu lực và Privacy Mode. Có thể sửa mẫu bình thường. CSV/backup chứa số đầy đủ kể cả khi bật Privacy Mode.

Sau khi bạn xác nhận UI/UX xong:

1. Dừng nhập trên mọi thiết bị. Chạy `02-backup.sql`, xuất ô JSON trong kết quả và lưu thành file riêng. Backup là snapshot thô của 14 bảng cho owner, có audit/command/năm chốt; chưa có công cụ tự restore, không thay thế backup của Supabase.
2. Trong `03-reset.sql`, thay chuỗi `NOT_CONFIRMED` trong biến `confirmation` bằng `RESET REVIEW <USER_UID>` như README của bộ đã ghi.
3. Chạy nguyên file bằng role `postgres`/chủ bảng. Script xác nhận UID và mã dataset trong audit của **cả hai module**, rồi xóa toàn bộ Thu nhập/Chi tiêu của owner đó, gồm record thêm/sửa khi review, lịch sử lệnh, nhãn và backup năm đã chốt trong DB. Chỉ dùng khi owner còn dành cho giai đoạn review; chưa nhập dữ liệu thực cần giữ.
4. Reset cũng trả JSON snapshot ngay trước khi xóa. Xuất kết quả này để giữ bản mới nhất. Chạy lại inspect: cả 14 bảng count 0. Refresh app; Chi tiêu yêu cầu chọn tháng bắt đầu mới.

Reset **giữ tài khoản Auth, email, hồ sơ và các owner khác**. Tùy chọn riêng tư trên thiết bị vẫn theo lựa chọn của bạn. Không reset tài khoản Supabase hoặc cấu trúc DB.

Database khóa lịch sử bằng 5 trigger. Reset cần quyền admin/chủ bảng để tạm tắt **đúng các trigger này** trong transaction sau khi khóa bảng; xóa theo owner rồi bật lại trước commit. Không tắt RLS, không dùng `TRUNCATE`, không đổi role runtime. Lỗi/xung đột/timeout rollback cả dữ liệu và trạng thái trigger. Khóa bảng có thể làm phiên khác chờ trong thời gian reset; chạy khi ngừng thao tác. Mặc định file reset không xóa.

## Xác minh

`npm test` kiểm tra mẫu qua domain engine; `npm run test:db` chạy seed/backup/reset trong PostgreSQL local biệt lập, kiểm tra cách ly owner, marker, rollback và khóa lịch sử. Kiểm tra local không xác nhận import, đăng nhập, đồng bộ hoặc reset đã chạy trên Supabase thật. Sinh bộ file cũng chưa nạp dữ liệu vào cloud.

Ngày 16/10/2026 đã nạp bộ mẫu vào tài khoản do người dùng chỉ định bằng kết nối Supabase có sẵn của app, dùng đúng role `expense_api` và RLS. Trước khi nạp đã kiểm tra sổ chỉ có khởi tạo, lưu backup owner trong `backups/`, giữ nguyên audit/command ban đầu. Đọc lại sau commit xác nhận 18 hũ, 180 dòng tháng, 20 lần dùng tích lũy, 7 nhãn, 2 danh mục thu, 20 số thu tháng và 3 phát sinh. UID, mã dataset và backup cụ thể nằm trong bộ file private `imports/` và `backups/`, không đưa lên Git. **Chưa chạy reset trên Supabase; chưa xác minh đăng nhập hoặc đồng bộ trên thiết bị thật trong lượt này.**

Kết quả local: 71 unit test, 23 PostgreSQL integration test, 2 browser smoke của bộ mẫu (desktop và iPhone 13 giả lập), typecheck/build đều qua. 38 browser hồi quy hiện có cũng qua trong lượt chạy đầy đủ; sau khi sửa việc đọc response trước điều hướng và selector trong test mới, chỉ chạy lại 2 smoke mới. Ảnh: `artifacts/browser/review-{budgets,income,overview}-{desktop,mobile}.png`. Dùng `npm run test:e2e -- review-data.spec.ts` để chạy lại riêng bộ mẫu; runner vẫn tạo PostgreSQL/Auth double biệt lập, không dùng cloud.


## Bổ sung Tiết kiệm — 17/10/2026

Dữ liệu gồm **6 danh mục**: Ví thần tài MoMo, VIB, Techcombank, Vàng/Vàng tích lũy, Sổ tiết kiệm cũ (đã tất toán và lưu trữ), Vàng nhẫn dự phòng. Tham khảo gốc Techcombank 100 triệu và sáu giá vốn vàng cộng 62,2 triệu trong `Notion/saving.png`. Các số lượng/đơn vị vàng, ngày giao dịch, lãi, đóng góp và giá định giá được tạo để review, không xác nhận là giao dịch hoặc tài sản thật. Tất cả ghi chú có nhãn DỮ LIỆU MẪU UI/UX.

Có 9 đợt vàng mở/mua (ở tháng 7 trở đi), bán 0,5 từ đợt cũ, phí bán, chuyển MoMo → VIB, rút ngoài, lãi nhập gốc/nhận tiền, tái tục và sổ sắp đáo hạn. Dữ liệu bắt đầu tháng 12 năm trước để xem báo cáo xuyên năm. Một danh mục vàng mang giá từ kỳ trước để hiện cảnh báo; danh mục chính có giá từng tháng. Không tạo giao dịch thực tế sau ngày sinh mẫu.

### Review ngay trên local

```bash
nvm use 22
npm run data:preview
```

Chờ dòng `REVIEW READY`, mở URL in ra, dùng **review@example.test**, mã **12345678**. Bản preview chạy production build với PostgreSQL và Auth double local riêng, chứa đủ Thu nhập/Chi tiêu/Tiết kiệm. Chỉ bind 127.0.0.1; không dùng tài khoản/email/OTP thật, không dùng `.env.local`, không ghi dữ liệu cloud, không dừng server đang chạy ở cổng 3000. Ctrl+C dừng preview. Mỗi lần chạy tạo một bộ mới; chỉnh sửa review local không chuyển vào cloud. Thông tin mở phiên nằm trong `artifacts/review-preview.json` (gitignore).

### Chuẩn bị cùng tài khoản Supabase đang review

```bash
npm run data:savings:sample -- --base imports/<BỘ_MẪU_16_10>/sample-data.json
```

Lệnh giữ owner và mã dataset cũ, sinh thư mục `imports/savings-review-<ngày>-<mã>/` có quyền riêng tư. Không nạp đè Thu nhập/Chi tiêu và không reset. Các trường hợp seed vào tài khoản thông thường hoặc Tiết kiệm đã có dữ liệu không khớp marker đều bị từ chối.

| File mới | Công dụng |
|---|---|
| `01-enable-and-seed.sql` | Chạy trong Supabase SQL Editor bằng role migration/admin. Tạo đủ 8 bảng Tiết kiệm nếu chưa có và seed trong cùng transaction; nếu schema dở dang thì từ chối. Yêu cầu marker Thu nhập/Chi tiêu trùng bộ cũ. Nếu đã seed đúng bộ, giữ các chỉnh sửa review. |
| `00-inspect.sql` | Sau khi bật Tiết kiệm, kiểm tra counts và marker cả ba module. |
| `04-seed-savings-only.sql` | Chỉ seed sau khi migration đã áp dụng; không thay đổi schema. |
| `02-backup.sql` | Snapshot tất cả **22 bảng** theo owner. |
| `03-reset.sql` | Reset **cả ba module** sau xác nhận riêng; mặc định NOT_CONFIRMED, giữ Auth/hồ sơ/owner khác. |

Khi schema đã có, `npm run data:import -- --file imports/<BỘ_MẪU_TIẾT_KIỆM>/sample-data.json --apply` dùng runtime `expense_api`, backup trước và kiểm tra marker/counts sau commit. Không có quyền tạo bảng trong kết nối runtime; dùng SQL Editor cho migration. Không cấp quyền admin cho ứng dụng để nạp mẫu.

**Dùng script reset 22 bảng mới sau khi hoàn tất review Tiết kiệm**, thay cho script cũ chỉ gồm 14 bảng. Reset yêu cầu marker cùng dataset ở cả Thu nhập, Chi tiêu, Tiết kiệm; xuất backup trước, nhập đúng `RESET REVIEW <UID>`. Nó khóa bảng, chụp snapshot mới nhất, tạm tắt 11 trigger lịch sử được chỉ định trong transaction, xóa theo owner/đúng thứ tự FK rồi bật lại, kiểm tra counts bằng 0. Mọi lỗi rollback dữ liệu và trạng thái trigger. Không chạy tự động trên cloud.

Lần kiểm tra cloud ngày 17/10: vẫn có 18 hũ và 2 danh mục thu thuộc bộ mẫu trước; chưa có schema Tiết kiệm, role runtime không có quyền CREATE. Đã lưu snapshot owner hiện tại vào `backups/` và trạng thái vào `cloud-state-before.json` trong bộ private mới. **Chưa nạp Tiết kiệm trên cloud, chưa chạy reset cloud.** File `01-enable-and-seed.sql` là bước cần thực hiện trong SQL Editor để review tại kết nối Supabase hiện tại.

## Bổ sung preview Đầu tư — 18/10/2026

`npm run data:preview` vẫn dùng database/Auth local riêng, không `.env.local` hoặc kết nối cloud; mở mặc định `/investments` với `review@example.test` / mã `12345678`. Giữ dữ liệu mẫu Thu nhập/Chi tiêu/Tiết kiệm và thêm bộ Đầu tư tổng danh mục từ `scripts/lib/investment-review-data.mjs`: 2 ví, 4 danh mục đang giữ và 1 danh mục đã bán hết/lưu trữ; số dư đầu, mua, bán lãi/lỗ, nạp/rút/chuyển, định giá mới và cũ. Bộ mẫu tính ngày theo hôm nay tại Việt Nam, có lịch sử tháng 12 năm trước và năm hiện tại. Không lấy tiền thật từ ảnh Notion.

Bộ fixture được đối chiếu bằng cách chạy từng action qua domain thật; seed vào PostgreSQL local trong preview. Thao tác sửa dữ liệu preview không chuyển sang cloud. Các file import/reset cloud 22 bảng từ 17/10 ở phần trên **không bao gồm sáu bảng Đầu tư mới**; không coi chúng là reset toàn ứng dụng sau khi đã có Đầu tư. Bản thay đổi này không chạy migration, import hoặc reset cloud.

Đã kiểm tra phiên review 18/10: đăng nhập demo, read-back 7 danh mục/ví và 16 giao dịch/định giá; tổng minh họa 176.140.000 VND, không lỗi JavaScript/tràn ngang tại 390px. Metadata phiên ở `artifacts/review-preview.json`, bằng chứng ở `artifacts/investments-review-readback.json`. Phiên này chỉ nằm trên máy local; URL không phải bản cloud/deploy.

## Bộ review Đầu tư cùng tài khoản và reset 28 bảng — 18/10/2026

Đã kiểm tra cloud của UID người dùng chỉ định: có bộ Thu nhập/Chi tiêu/Tiết kiệm cùng dataset, gồm 18 hũ, 2 danh mục thu và 6 danh mục Tiết kiệm. Chưa có cả sáu bảng Đầu tư. Kết nối `expense_api` không có quyền CREATE trên schema public hoặc database. Đã sao lưu toàn bộ record của owner tại 22 bảng hiện có vào file private `backups/before-investments-review-*.json`; metadata và counts ở `cloud-state-before.json` trong bộ mới. Không thay đổi ba module cũ.

Tạo phần bổ sung, giữ nguyên owner và dataset cũ:

```bash
npm run data:investments:sample -- --base imports/<BỘ_MẪU_TIẾT_KIỆM>/sample-data.json
```

Đầu ra `imports/investments-review-<ngày>-<mã>/` có 00-inspect, 01-enable-and-seed, 02-backup, 03-reset, 04-seed-investments-only, JSON và README. 01-enable-and-seed chạy bằng Supabase SQL Editor/admin, tạo schema nếu cả sáu bảng đều thiếu và nạp Đầu tư trong cùng transaction; từ chối schema dở dang. Các module cũ phải có đúng marker bộ review. Chạy lại đúng bộ giữ nguyên các chỉnh sửa review. Không dùng quyền admin trong runtime ứng dụng.

Bộ Đầu tư có **8 danh mục/ví, 44 bản ghi giao dịch và 22 bản ghi định giá (gồm revision), 76 audit** tại ngày 18/10. Giá vốn/định giá mở đầu tham khảo ảnh `investment-1.png`: Cổ phiếu 46.293.098/44.491.500; Quỹ cổ phiếu 11.196.750/11.509.468; Quỹ trái phiếu 5.005.620/5.017.437; Crypto 7.500.000/5.667.000 VND. Tiền chờ mở đầu 12.349 VND, không sao chép giá trị 0/ROI −100% của Notion. Toàn bộ ngày mở đầu và các giao dịch phát sinh là dữ liệu minh họa, có nhãn DỮ LIỆU MẪU UI/UX.

Các ca bổ sung: nạp theo tháng, mua TCBS/ghi chú HPG, hai ví, chuyển/rút tiền, mua/bán trực tiếp Bên ngoài, bán lãi/lỗ sau phí/thuế, mất toàn bộ vốn thu 0, hai danh mục tất toán/lưu trữ, định giá cũ/mới, sửa định giá và hủy một khoản nạp ghi trùng. Đây vẫn là tổng danh mục, không tạo mã hoặc khối lượng cổ phiếu/crypto.

**Trạng thái cloud trong lượt chuẩn bị này:** importer đã dừng ở kiểm tra thiếu migration; **chưa nạp Đầu tư lên cloud**. Cần chạy 01-enable-and-seed.sql bằng SQL Editor trước; không cần gửi mật khẩu, OTP hoặc secret. Sau đó có thể dùng 00-inspect.sql hoặc chạy lại `npm run data:import -- --file <BỘ_MỚI>/sample-data.json --apply` để backup/read-back qua runtime RLS.

**Reset mới đủ 28 bảng của cả bốn module**, thay cho bản 14/22 bảng cũ. Chỉ dùng sau khi người dùng xác nhận hoàn tất UI/UX, dừng nhập ở mọi thiết bị và xuất backup mới nhất. Mặc định `NOT_CONFIRMED` nên không xóa. Nó kiểm UID/dataset ở cả bốn module, giữ Auth/hồ sơ và owner khác, khóa bảng, chụp snapshot, tạm tắt đúng 15 trigger lịch sử, xóa theo FK rồi bật lại và kiểm counts bằng 0. Lỗi rollback cả dữ liệu lẫn trigger. Chưa chạy reset cloud.


## Giới hạn bộ reset cũ khi đã có Fund — 19/10/2026

Các bộ review/reset 28 bảng ở trên chỉ bao phủ bốn module cũ, không phải reset toàn tài khoản của phiên bản có Fund. Không dùng chúng để làm trống tài khoản có quỹ; xuất backup V2 tại Cài đặt để giữ đủ năm module. Triển khai Fund không chạy seed hoặc reset cloud.

## Bổ sung Fund và reset 35 bảng — 19/10/2026

Kiểm tra cloud trong lượt này: đúng UID được chỉ định đang có bộ review bốn module cùng dataset (18 hũ, 2 danh mục thu, 6 danh mục Tiết kiệm, 8 danh mục/ví Đầu tư). Cả 7 bảng Fund và bảng biên nhận `data_imports` đều chưa có; `expense_api` không có CREATE. Đã sao lưu các bảng hiện có theo đúng owner trong `backups/before-funds-review-*.json` với quyền 0600. **Chưa nạp Fund hoặc reset cloud.** Thông tin source/local không chứng minh deploy.

```bash
npm run data:funds:sample -- --base imports/<BỘ_ĐẦU_TƯ>/sample-data.json --snapshot backups/<OWNER_INSPECTION_BACKUP>.json
npm run data:funds:import -- --file imports/<BỘ_FUND>/sample-data.json
# Khi schema đã được bật, thêm --apply để nạp và đối soát.
```

Generator yêu cầu snapshot đúng owner, dùng hũ/version hiện tại thay vì bản cũ trong manifest Đầu tư. Năm hũ mẫu: Ăn uống & cà phê, Phí sinh hoạt, Mua sắm, Hóa đơn điện và Hóa đơn nước, tổng 6 triệu/tháng. Hệ số cuối Emergency/Rainy Day/Sinking là 9/7/9 để giữ mục tiêu tham khảo 54/42/54 triệu trong ảnh. Không sửa Chi tiêu hay tạo Financial Goals. Các số dư và ngày hoàn toàn minh họa.

| Quỹ | Số dư mẫu | Mục tiêu | Tỷ lệ |
|---|---:|---:|---:|
| Emergency | 27.000.000 | 54.000.000 | 50% |
| Rainy Day | 44.100.000 | 42.000.000 | 105% |
| Sinking | 13.500.000 | 54.000.000 | 25% |

Tổng 84,6 triệu, Emergency bằng 4,5 tháng sinh hoạt đã xác nhận. Có 37 giao dịch gốc, 39 revision (36 giao dịch hiện hành), hai cấu hình, sáu nơi giữ và 48 audit. Thể hiện thêm/rút/bổ sung, chuyển nội bộ/liên quỹ, sửa số tiền, hủy ghi trùng, nơi giữ hết tiền/ngừng và nơi giữ mới. Danh sách đủ hai trang để kiểm tra tìm/lọc/phân trang.

Package private `imports/funds-review-<ngày>-<dataset>/` gồm:

| File | Công dụng |
|---|---|
| `00-inspect.sql` | Chỉ đọc, dùng được cả khi thiếu bảng; báo counts/marker/schema. |
| `01-enable-and-seed.sql` | SQL Editor/admin: tạo Fund khi cả 7 bảng thiếu, từ chối schema dở dang, nạp đúng owner trong cùng transaction; không đổi bốn module cũ. |
| `04-seed-funds-only.sql` | Nạp nếu schema đã có; runtime CLI dùng `expense_api`/RLS, không dùng admin. |
| `02-backup.sql` | Snapshot vận hành đủ 35 bảng và `data_imports` nếu có; không phải định dạng app restore. |
| `03-reset.sql` | Mặc định `NOT_CONFIRMED`; chỉ reset sau xác nhận UI/UX riêng, đúng owner và marker năm module. |

Seed kiểm lại tháng Việt Nam, version và mức hiệu lực của từng hũ trước lần nạp đầu; thay đổi thì phải tạo package mới. Chạy lại đúng bộ giữ các chỉnh sửa review. CLI mặc định chỉ kiểm tra; luôn lưu snapshot trước, không chạy seed khi thiếu migration. Không tăng quyền tài khoản ứng dụng. Migration `202610180002_data_imports.sql` cần được áp dụng riêng để dùng restore tại Cài đặt; Fund seed không tự thay đổi schema này.

**Reset mới thay bản 14/22/28 bảng:** sau duyệt UI/UX và sao lưu mới nhất, nhập đúng `RESET REVIEW <UID>` vào file guard. Reset khóa ghi đồng bộ với các module/restore, chụp thêm snapshot, xóa đúng owner ở 35 bảng cùng biên nhận `data_imports` nếu tồn tại, giữ Auth/hồ sơ và owner khác. Lỗi rollback cả dữ liệu và trigger lịch sử. Chưa thực hiện reset cloud.

`npm run data:preview` hiện chứa đủ năm module trong database/Auth local riêng; mở `/funds` sau đăng nhập demo để review ngay trong khi chờ migration cloud. Preview này chuyển sang bộ Đầu tư cùng cấu trúc cloud review (8 danh mục, 44 revision giao dịch, 22 revision định giá); lịch sử mô tả bản preview 18/10 ở trên vẫn là bằng chứng của bản cũ. Public landing preview vẫn dùng dữ liệu cố định riêng, không đọc tài khoản/API tài chính.

### Cập nhật cloud — 20/10/2026

Người dùng đã chạy script 01. Kiểm tra lại bằng `expense_api`/authenticated RLS xác nhận đủ schema Fund, marker đúng owner/dataset và toàn bộ lịch sử khớp package (version 48, 37 giao dịch gốc, 39 revision, 6 nơi giữ). Số dư 27 / 44,1 / 13,5 triệu, tổng 84,6 triệu; không cần nạp lại. Đã sao lưu lại owner, chỉ đọc và đối soát, không ghi đè hoặc reset. Bằng chứng ở `artifacts/fund-review-cloud-verified-2026-10-20.json`. Các ghi nhận thiếu schema ngày 19/10 ở trên là lịch sử trước khi người dùng chạy script; `data_imports` vẫn cần migration riêng nếu sử dụng restore tại Cài đặt.
