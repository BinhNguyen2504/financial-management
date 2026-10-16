# Hướng deploy và vận hành

Đây là kế hoạch cho cloud riêng có đăng nhập. **Chưa tạo project, upload source, cấu hình DNS hoặc deploy.** Bộ khung không có Auth nên chưa phù hợp để đưa dữ liệu tài chính thật lên mạng.

## Phương án chính

Next.js trên Vercel; PostgreSQL + Auth trên Supabase. Chọn vùng DB/compute gần nơi sử dụng nếu nhà cung cấp hỗ trợ; kiểm tra region và quota tại thời điểm tạo. Repository private; mọi trang/API tài chính kiểm session và ownership. Không đồng nhất repository private với ứng dụng đã được bảo vệ: URL app vẫn cần Auth, DB vẫn cần RLS.

Vercel có các môi trường development, preview và production; tách cấu hình tương ứng theo [tài liệu environments](https://vercel.com/docs/deployments/environments). Với dự án này, preview dùng dữ liệu giả và DB riêng, không trỏ vào tài chính production.

| Môi trường | Dữ liệu | Backend | Mục đích |
| --- | --- | --- | --- |
| Local P0 | Không có dữ liệu tài chính | Không cần Supabase | Phân tích và review bộ khung |
| Local P1+ | Dữ liệu giả | Supabase local hoặc project development | Phát triển nghiệp vụ và kiểm thử |
| Preview/staging | Dữ liệu giả cố định | Project staging riêng | Review tính năng trên desktop/iPhone; test Auth/RLS |
| Production | Dữ liệu thật sau migration | Project production riêng | Sử dụng cá nhân, có backup và theo dõi lỗi |

Ở quy mô một người, có thể dùng một DB development cho local+staging để giảm tài nguyên; production luôn tách riêng. Không cấp preview token production cho mọi branch. Preview cũng cần access protection nếu chứa thông tin riêng.

## Trình tự đưa lên cloud

1. Hoàn thành đặc tả P1 và triển khai Auth, schema, migration, RLS/grants cùng kiểm thử. Tắt đăng ký công khai hoặc giới hạn danh tính được phép theo phương án login đã chọn.
2. Tạo repository private và project Supabase staging/production. Chọn login email/Google; cấu hình redirect URL, callback, domain và giới hạn signup. Secret do người dùng cấu hình trong secret manager của môi trường.
3. Đưa migrations lên staging; tạo tài khoản/test data giả. Kiểm tra người chưa đăng nhập và người dùng khác không đọc/ghi được dữ liệu; kiểm foreign key cùng owner và RPC/Storage nếu dùng.
4. Kết nối source với Vercel; runtime Node 22, build `npm run build`; thêm biến môi trường đúng scope. Bản vá runtime/framework phải được rà lại trước production.
5. Chạy CI, DB integration, browser test; kiểm trên điện thoại với HTTPS. Thử thêm giao dịch, chuyển tiền, retry và dùng thiết bị thứ hai.
6. Xác nhận backup và thử restore ở môi trường tách biệt; chạy dry-run migration từ CSV đã đối soát.
7. Trước khi chuyển production, có bản release cụ thể, thay đổi DB và kết quả kiểm tra để người dùng review. Triển khai app, apply migration tương thích, kiểm login/API/database trên URL thật.
8. Dùng song song với Notion trong kỳ đối soát được chọn; chỉ coi chuyển đổi hoàn thành khi số liệu và tác vụ thực tế đã khớp.

Deploy thành công cần URL thực và thao tác đọc/ghi với DB thật. Build local hoặc browser test mock không chứng minh backend online hoạt động.

## Biến môi trường

P0 có `.env.example` nhưng không dùng secret. P1 bổ sung cấu hình có kiểm tra:

- `NEXT_PUBLIC_SUPABASE_URL` và publishable key: có thể công khai, không thay thế kiểm quyền; RLS/grants vẫn bắt buộc.
- Database password, Supabase secret/service-role và secret job: chỉ server/CI có nhu cầu, không có tiền tố `NEXT_PUBLIC_`, không ghi vào source/log.
- Token từ session được xác minh phía server; không tin cookie/JWT chỉ vì parse thành công.
- CI frontend chỉ typecheck/build không cần secret production. Migration job và backup job có quyền tách riêng.

API tài chính không cache công khai hoặc qua service worker. Khi thêm Auth cần kiểm tra lại server rendering/cache để tránh trả dữ liệu một người cho người khác.

## Sao lưu và xuất dữ liệu

Không mặc định free tier có backup/restore đủ dùng. Kiểm tra quyền lợi và retention theo [Supabase backups](https://supabase.com/docs/guides/platform/backups); chọn gói hoặc lịch export phù hợp tại thời điểm triển khai.

Đề xuất mục tiêu ban đầu để người dùng xác nhận: mất tối đa 24 giờ dữ liệu (RPO), phục hồi trong một ngày làm việc (RTO). Trước dùng thật phải thực hiện được, không chỉ ghi trong tài liệu.

- Backup database theo lịch, bản sao mã hóa ở nơi tách tài khoản/provider nếu có thể; quyền tải hạn chế.
- Export toàn bộ dữ liệu người dùng dạng có schema/version phục vụ khôi phục; CSV chỉ phù hợp đối soát, không thay thế full backup có quan hệ.
- Nếu sau này có ảnh hóa đơn/file, backup object storage riêng; backup database không đồng nghĩa đã sao lưu file.
- Thử restore sang DB staging tách biệt, kiểm số dòng, tổng theo tài khoản và giao dịch mẫu. Không thử restore lên production đang chạy.
- Quy tắc lưu giữ gợi ý để chốt: bản hằng ngày 30 ngày và bản theo tháng lâu hơn; tính chi phí/quota thực tế trước khi áp dụng.

## Rollback và theo dõi

Mỗi release ghi commit/build, migration version và kết quả smoke test. Dùng migration bổ sung tương thích trước, chuyển code sau; xóa cột/dữ liệu chỉ ở release riêng khi đã có backup và kiểm tra phụ thuộc.

Rollback app không tự đảo database. Khi có sự cố: dừng tác vụ ghi bị ảnh hưởng nếu cần → xác định phạm vi → rollback code tương thích hoặc forward-fix → đối soát giao dịch. Không restore toàn DB tùy tiện vì sẽ mất phát sinh sau backup.

Log request id, mã lỗi và idempotency conflict; hạn chế số tiền, tên tài khoản, nội dung ghi chú và token. Theo dõi lỗi ghi DB, job bị trùng, giá quá cũ, backup lỗi. Công cụ như Sentry chỉ thêm sau khi cấu hình lọc dữ liệu nhạy cảm; P0 chưa gửi analytics.

## Chi phí và phương án thay thế

Đối chiếu bảng giá chính thức ngày **15/10/2026**. Next.js và PostgreSQL không yêu cầu phí bản quyền sử dụng; phí phát sinh từ dịch vụ vận hành. PostgreSQL đã nằm trong Supabase, không cần trả một gói database PostgreSQL riêng bên cạnh Supabase. Tham khảo [Next.js license](https://github.com/vercel/next.js/blob/canary/license.md) và [PostgreSQL license](https://www.postgresql.org/about/licence/).

| Thành phần | Bắt đầu miễn phí | Khi cần trả phí |
| --- | --- | --- |
| Vercel | Hobby 0 USD/tháng, dành cho cá nhân phi thương mại, có quota | Pro từ 20 USD/tháng cho một developer, cộng usage/add-on khi áp dụng |
| Supabase | Free 0 USD/tháng; 500 MB DB, 1 GB file storage, 5 GB egress; tối đa 2 project active | Pro từ 25 USD/tháng; thêm project từ 10 USD/tháng và có thể thêm usage/add-on |
| Domain | Có thể dùng subdomain mặc định của hosting | Domain riêng tùy nhà đăng ký, không bắt buộc lúc đầu |
| Backup, gửi email, nguồn giá | Tự export hoặc dùng hạn mức phù hợp của dịch vụ đã chọn | Tính theo provider/tính năng; chưa chọn nhà cung cấp bổ sung |

Nguồn: [Vercel pricing](https://vercel.com/pricing), [Supabase pricing](https://supabase.com/pricing). Giá bằng USD, cần kiểm lại thuế, quota và tổng estimate trong dashboard trước khi mua. Free không đồng nghĩa không cần login/RLS hoặc bị buộc công khai dữ liệu.

Đề xuất cho một người dùng: bắt đầu **Vercel Hobby + Supabase Free = 0 USD/tháng** khi nằm trong quota; chưa mua domain/add-on. Supabase Free có thể pause sau một tuần không hoạt động; khi dùng thật cần lịch export/backup và kiểm tra khôi phục. Free không có cùng chính sách daily backup của Pro; xem [Supabase backups](https://supabase.com/docs/guides/platform/backups).

Khi cần thêm khả năng vận hành/backup, cân nhắc Vercel Hobby + Supabase Pro **từ 25 USD/tháng** với một project Micro trong mức bao gồm. Nếu cả Vercel Pro và Supabase Pro thì **từ 45 USD/tháng** cho cấu hình cơ bản một developer/một project; chưa tính thuế, usage vượt mức và tiện ích bổ sung. Nếu staging cũng là project trả phí, cộng compute của staging, không giả định mọi project đều nằm trong 25 USD.

Nếu chọn login email/magic link, cần tính cấu hình gửi email: [SMTP mặc định của Supabase](https://supabase.com/docs/guides/auth/auth-smtp) có giới hạn người nhận và không dành cho production. Google login có thể giảm nhu cầu gửi email đăng nhập, nhưng vẫn cần cấu hình OAuth và giới hạn tài khoản được phép.

Nếu muốn tự host sau này, [Next.js hỗ trợ self-host](https://nextjs.org/docs/app/guides/self-hosting). Cần vận hành Node, reverse proxy/TLS, Postgres, Auth, cập nhật, backup và giám sát. Không cần đổi mô hình nghiệp vụ/API, nhưng chi phí vận hành và migration hạ tầng vẫn phải tính.

## Cài trên iPhone cá nhân

Flutter được dùng cho app iOS ở giai đoạn sau. Có thể cài để phát triển/thử nghiệm trên iPhone của mình mà không phát hành App Store; vẫn cần signing hợp lệ. Build iOS local cần Mac + Xcode + Flutter, kết nối/trust thiết bị và Developer Mode theo [Flutter iOS setup](https://docs.flutter.dev/platform-integration/ios/setup).

| Phương án | Chi phí Apple | Giới hạn chính |
| --- | --- | --- |
| Web PWA: Safari → Chia sẻ → Thêm vào Màn hình chính | Không cần Developer Program | Là ứng dụng web, không phải bản Flutter native; cần HTTPS để dùng PWA đầy đủ |
| Flutter cài từ Xcode/Flutter bằng Personal Team | Miễn phí | Profile hết hạn sau 7 ngày từ khi cấp; cần ký/build/cài lại để tiếp tục chạy |
| Flutter dùng Developer Program + thiết bị đã đăng ký | 99 USD/năm theo giá niêm yết, có thể khác theo vùng | Có thể cài development/ad hoc mà không công khai App Store; profile/certificate vẫn có hạn, phải quản lý và gia hạn |
| TestFlight | Cần Developer Program | Upload qua App Store Connect; mỗi build dùng tối đa 90 ngày, cần build mới; phù hợp beta |

Nguồn: [Apple Personal Team](https://developer.apple.com/help/account/basics/about-your-developer-account), [Apple membership pricing](https://developer.apple.com/programs/enroll/), [ad hoc provisioning](https://developer.apple.com/help/account/provisioning-profiles/create-an-ad-hoc-provisioning-profile/), [TestFlight](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/), [Apple hướng dẫn web app](https://support.apple.com/en-my/guide/iphone/iph42ab2f3a7/ios).

Khi làm native, kiểm tra chế độ build để dùng độc lập sau khi rút cáp/dừng debugger; không dùng kết quả debug qua máy tính để tuyên bố app đã chạy độc lập. Không gửi chứng chỉ/khoá ký riêng lên repository. Dữ liệu thật vẫn đồng bộ cloud; cài lại bản app không được đồng nghĩa xóa dữ liệu cloud.

Đề xuất hiện tại: dùng PWA cho nhu cầu hằng ngày, làm Flutter sau; thử bằng Personal Team trước khi cân nhắc phí membership. Chưa cài toolchain, mua membership, upload App Store Connect hay triển khai mobile trong giai đoạn này.
