# Xử lý lỗi phát triển local

## Hydration mismatch với `cz-shortcut-listen="true"`

Ảnh lỗi ngày 15/10/2026 chỉ ra thuộc tính ngoài dự kiến trên `<body>`:

```text
<RootLayout>
  <html lang="vi">
    <body
-     cz-shortcut-listen="true"
    >
```

Source `src/app/layout.tsx` không tạo thuộc tính này. Đây là dấu hiệu DOM bị sửa trước khi React hydrate; extension trình duyệt là nguyên nhân phù hợp với bằng chứng. Nếu đang cài ColorZilla, kiểm tra extension đó trước. Chưa trực tiếp kiểm tra danh sách extension của trình duyệt người dùng nên không khẳng định tên extension chỉ từ ảnh.

Cách khắc phục trên trình duyệt đang gặp lỗi:

1. Tắt ColorZilla nếu đang cài, hoặc bỏ quyền chạy trên `localhost`/site này. Nếu vẫn còn, kiểm tra các extension có quyền chỉnh sửa trang khác.
2. Tải lại trang bằng Cmd+Shift+R trên Mac.
3. Kiểm tra bằng profile trình duyệt sạch hoặc cửa sổ ẩn danh **với extension đã tắt**. Extension có thể được cho phép chạy ẩn danh, nên chỉ mở ẩn danh chưa đủ đảm bảo sạch.
4. Nếu chỉ profile có extension bị lỗi, bật lại từng extension để xác định. Khi đó giữ extension gây lỗi tắt trên site khi phát triển.

Kiểm chứng đã thực hiện trên dev server hiện có tại `http://127.0.0.1:3000/overview`, bằng các browser context tách biệt:

| Điều kiện | Thuộc tính trên body | Hydration error |
| --- | --- | --- |
| Context sạch | Không có | 0 |
| Giả lập chèn thuộc tính bằng init script trước React | `cz-shortcut-listen="true"` | 1, cùng thông báo như ảnh |
| Context sạch kiểm lại | Không có | 0 |

Không thêm `suppressHydrationWarning` hoặc tắt SSR để che cảnh báo do extension này. Thuộc tính thêm không cần thiết được xử lý ở nguồn can thiệp; giữ cảnh báo để phát hiện lỗi thật trong source về sau. Chưa thay đổi/tắt extension trong profile của người dùng.

Nếu browser sạch vẫn lỗi với diff khác, lấy diff mới và kiểm tra phần tương ứng: giá trị thời gian/random, locale, dữ liệu SSR/client và HTML nesting. Không mặc định mọi hydration error đều do cùng nguyên nhân.

Tham khảo: [Next.js hydration error — browser extensions modifying HTML](https://nextjs.org/docs/messages/react-hydration-error).
