import type { FundId, FundTransaction } from "@/domain/funds/schema";
export const fundNames: Record<FundId, string> = {
  emergency: "Emergency Fund",
  rainy_day: "Rainy Day Fund",
  sinking: "Sinking Fund",
};
export const transactionNames: Record<FundTransaction["kind"], string> = {
  opening: "Số dư ban đầu",
  deposit: "Thêm tiền",
  withdraw: "Rút tiền",
  transfer: "Chuyển tiền",
};
export const guides: Record<
  FundId,
  {
    label: string;
    concept: string;
    principle: string;
    build: string;
    use: string;
    replenish: string;
  }
> = {
  emergency: {
    label: "Gốc rễ vững vàng",
    concept:
      "Khoản dự phòng giúp bạn duy trì chi phí thiết yếu khi mất thu nhập hoặc gặp biến cố lớn.",
    principle:
      "Ưu tiên an toàn và khả năng tiếp cận tiền khi cần. Chọn số tháng phù hợp hoàn cảnh và trách nhiệm của bạn.",
    build:
      "Xác định chi phí sinh hoạt, chọn số tháng muốn bảo vệ rồi góp từng khoản vừa sức. Kiểm tra điều kiện rút tiền ở nơi giữ.",
    use: "Dùng khi gián đoạn thu nhập, bệnh nặng hoặc biến cố cần thiết vượt khả năng chi trả hàng tháng.",
    replenish:
      "Dùng quỹ đúng lúc là quỹ đang làm việc. Sau biến cố, bổ sung dần phần đã dùng theo khả năng.",
  },
  rainy_day: {
    label: "Một khoảng trời được che chở",
    concept:
      "Khoản đệm cho chi phí cần thiết, bất ngờ và tương đối nhỏ, giúp tháng hiện tại ít bị xáo trộn.",
    principle:
      "Giữ tiền dễ tiếp cận. Phân biệt khoản phát sinh với chi tiêu thường xuyên đã có trong ngân sách.",
    build:
      "Nhìn lại những khoản sửa xe, sửa đồ hoặc chi phí nhỏ từng phát sinh; chọn hệ số phù hợp và bắt đầu từ khoản góp nhỏ.",
    use: "Dùng cho một lần sửa xe bất ngờ hoặc thay thiết bị thiết yếu hỏng đột xuất.",
    replenish:
      "Kiểm tra sau mỗi lần dùng và góp bù khi có thể, để sẵn sàng cho lần phát sinh tiếp theo.",
  },
  sinking: {
    label: "Bắc cầu cho những khoản đã biết",
    concept:
      "Khoản dự phòng cho chi phí cần thiết đã biết trước nhưng không phát sinh đều mỗi tháng, như bảo dưỡng hoặc thay thiết bị.",
    principle:
      "Tách khoản chi dự kiến khỏi tình huống khẩn cấp. Hệ số tháng ở đây là cách bạn chọn quy mô dự phòng.",
    build:
      "Liệt kê các khoản cần chuẩn bị và dành tiền từng bước. Mục tiêu ở đây vẫn được tính bằng mức sinh hoạt nhân hệ số bạn nhập.",
    use: "Dùng cho bảo dưỡng theo lịch hoặc thay thiết bị cần thiết đã dự trù. Các mục tiêu mua sắm và cuộc sống thuộc định hướng trang Mục tiêu riêng, hiện đang phát triển.",
    replenish:
      "Sau khi thanh toán khoản đã dự trù, xem lại nhu cầu tiếp theo rồi tiếp tục góp hoặc điều chỉnh quy mô quỹ.",
  },
};
export function localDateTime(iso: string) {
  return new Date(Date.parse(iso) + 7 * 3600000).toISOString().slice(0, 16);
}
export function displayTime(iso: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}
