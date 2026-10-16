"use client";
export default function ErrorPage({ reset }: { reset: () => void }) { return <div className="panel" role="alert"><h1>Chưa tải được nội dung</h1><p>Hãy kiểm tra kết nối rồi thử lại.</p><button className="button" onClick={reset}>Thử lại</button></div>; }
