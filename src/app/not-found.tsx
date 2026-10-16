import Link from "next/link";
export default function NotFound() { return <div className="panel"><p className="eyebrow">404</p><h1>Không tìm thấy trang</h1><p>Đường dẫn này chưa có trong ứng dụng.</p><Link className="text-link" href="/overview">Về tổng quan</Link></div>; }
