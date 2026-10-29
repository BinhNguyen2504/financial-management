export type ModuleStatus = "implemented" | "partial" | "planned";

export const moduleStatusLabels: Record<ModuleStatus, string> = {
  implemented: "Có trong bản hiện tại",
  partial: "Đã có một phần",
  planned: "Đang phát triển",
};

export const modules = [
  {
    slug: "overview",
    status: "implemented",
    title: "Tổng quan",
    icon: "overview",
    label: "Bức tranh tài chính",
    description:
      "Xem nhanh năm module với 10 widget; thêm, ẩn và sắp xếp theo tài khoản.",
    scope: [
      "Thu nhập, Chi tiêu tháng này; Tiết kiệm, Đầu tư và Quỹ an toàn hiện tại",
      "Cần chú ý, phân bổ chi tiêu, hũ theo dõi và sổ sắp đáo hạn",
      "Bố cục widget đồng bộ theo tài khoản; không cộng các sổ thành tài sản ròng",
    ],
    questions: [],
  },
  {
    slug: "income",
    status: "implemented",
    title: "Thu nhập",
    icon: "income",
    label: "Thực nhận theo tháng",
    description:
      "Theo dõi thu cố định, khoản phát sinh và báo cáo; nhận biết khoản còn thiếu và nhập ngay theo tháng.",
    scope: [
      "Tổng thực nhận mỗi tháng theo danh mục",
      "Xóa danh mục khi không còn số thu; ngừng nguồn thu đang có dữ liệu",
      "Khoản thu phát sinh một lần",
      "Bảng, biểu đồ và xuất bảng dữ liệu",
      "Chi tiết khoản phát sinh có tìm kiếm và phân trang",
      "Tab gọn trên mobile; nút chọn cột giữ vị trí khi cuộn bảng",
      "Tiêu đề có minh họa theo chủ đề, thích ứng màn hình",
    ],
    questions: [],
  },
  {
    slug: "transactions",
    status: "planned",
    title: "Thu & chi",
    icon: "transactions",
    label: "Ghi nhận một lần",
    description:
      "Một nơi để ghi thu nhập, chi tiêu và chuyển tiền giữa các tài khoản.",
    scope: [
      "Thu nhập theo nguồn và thời điểm thực nhận",
      "Chi tiêu theo danh mục, tài khoản và mục đích",
      "Chuyển tiền liên kết hai tài khoản trong một giao dịch",
      "Mẫu nhập nhanh, giao dịch định kỳ và nhập bảng dữ liệu có xem trước",
    ],
    questions: [
      "Bạn muốn ghi từng giao dịch hay tổng hợp theo ngày/tháng?",
      "Nguồn thu và danh mục chi nào cần theo dõi?",
    ],
  },
  {
    slug: "budgets",
    status: "implemented",
    title: "Chi tiêu",
    icon: "budgets",
    label: "Hũ chi tiêu theo tháng",
    description:
      "Quản lý hũ chi tháng và tích lũy, tự tính tiền cần thêm và báo cáo trong năm.",
    scope: [
      "Kế hoạch theo danh mục và tháng hiệu lực",
      "Thực chi, số còn lại và phần chuyển tiếp kỳ sau",
      "Phân biệt chi phí, trả nợ và tiền dành để tiết kiệm",
      "Tổng hợp nhu cầu tiền theo ví/ngân hàng",
      "Phân loại có logo PNG; xem trước theo tháng và lọc hũ đã ngừng",
      "90 biểu tượng gợi ý, emoji từ bàn phím và 27 thương hiệu ngân hàng/ví",
      "Bảng hũ căn giữa nút điều chỉnh và dùng tiền bằng biểu tượng",
      "Chi tiết hũ theo tab tháng, sử dụng và lịch sử",
      "Tiêu đề có minh họa hũ chi, nút thao tác ở hàng riêng",
    ],
    questions: [
      "Tiền chưa chi có được cộng dồn sang tháng tiếp theo?",
      "Thay đổi ngân sách giữa tháng áp dụng từ thời điểm nào?",
    ],
  },
  {
    slug: "accounts",
    status: "planned",
    title: "Tài khoản",
    icon: "accounts",
    label: "Tiền đang nằm ở đâu",
    description: "Quản lý tiền mặt, ví điện tử, ngân hàng và tiền chờ đầu tư.",
    scope: [
      "Số dư đầu kỳ và số dư tính từ giao dịch",
      "Chuyển khoản, đối soát và điều chỉnh có lịch sử",
      "Theo dõi dư nợ riêng với tài sản nếu cần",
    ],
    questions: [
      "HSBC trong hệ thống hiện tại là tài khoản thanh toán hay thẻ tín dụng?",
      "Bạn cần theo dõi dư nợ và lịch trả nợ đến mức nào?",
    ],
  },
  {
    slug: "savings",
    status: "implemented",
    title: "Tiết kiệm",
    icon: "savings",
    label: "Tích lũy có lịch sử",
    description:
      "Tiền, sổ tiết kiệm và vàng cùng lịch sử giao dịch, định giá và báo cáo nhiều năm.",
    scope: [
      "Chi tiết danh mục, sổ tiền gửi và đợt vàng có lọc, phân trang",
      "Bảng danh mục và giao dịch theo cột trên desktop, có nhãn từng trường trên mobile",
      "Rút, bán, nhận lãi và tái tục có lịch sử",
      "Tài sản, tỷ trọng, dòng tiền và lãi/lỗ; chú thích biểu đồ khi rê chuột, chạm hoặc dùng Tab",
      "Chốt tháng, mở lại có lý do và sao lưu",
      "Minh họa tích góp riêng cho từng chủ đề giao diện",
    ],
    questions: [],
  },
  {
    slug: "investments",
    status: "implemented",
    title: "Đầu tư",
    icon: "investments",
    label: "Vốn và giá trị hiện tại",
    description:
      "Theo dõi tổng danh mục, ví tiền chờ, mua bán, định giá và lãi/lỗ có lịch sử.",
    scope: [
      "Danh mục tổng tiền và nhiều ví tiền chờ, VND",
      "Mua/bán cập nhật tài sản và tiền chờ trong một lần lưu",
      "Giá vốn bán nhập tay; phí, thuế, lãi/lỗ đã chốt và chưa chốt",
      "Định giá theo ngày; báo cáo nhiều năm, xuất bảng dữ liệu và sao lưu",
      "Ghi giao dịch theo nhóm, xem trước tác động rồi xác nhận lưu",
      "Chi tiết giao dịch trước/sau, phiên bản sửa và giữ vị trí khi quay lại",
      "Minh họa danh mục riêng cho từng chủ đề giao diện",
    ],
    questions: [],
  },
  {
    slug: "funds",
    status: "implemented",
    title: "Quỹ an toàn",
    icon: "funds",
    label: "Nền tảng an toàn tài chính",
    description:
      "Xây Emergency, Rainy Day và Sinking từ chi phí sinh hoạt, theo dõi dự phòng bằng những hình ảnh lớn dần.",
    scope: [
      "Mức sinh hoạt từ các hũ chi tháng được chọn; mục tiêu theo hệ số tự nhập",
      "Minh họa theo chủ đề phản ánh tiến độ thực tế",
      "Minh họa bảo vệ ở tiêu đề, độc lập với tiến độ từng quỹ",
      "Ghi sổ độc lập; thêm, rút và chuyển giữa quỹ/nơi giữ",
      "Sửa/hủy có lịch sử, nguồn thay đổi được xem trước rồi áp dụng",
    ],
    questions: [],
  },
  {
    slug: "goals",
    status: "planned",
    title: "Mục tiêu",
    icon: "goals",
    label: "Từ mục tiêu đến kế hoạch",
    description:
      "Theo dõi mục tiêu tiền, hạn hoàn thành và mức tích lũy cần thiết.",
    scope: [
      "Mục tiêu theo số tiền và thời hạn tùy chọn",
      "Tiến độ lấy từ tiền/tài sản đã liên kết",
      "Ước tính phần còn thiếu và kế hoạch góp định kỳ",
    ],
    questions: [
      "Mục tiêu đầu tư đo theo vốn đã góp hay giá trị thị trường?",
      "Có cần mức ưu tiên giữa các mục tiêu?",
    ],
  },
  {
    slug: "reports",
    status: "planned",
    title: "Báo cáo",
    icon: "reports",
    label: "Hiểu biến động tài chính",
    description:
      "Biểu đồ và bảng số liệu cùng sử dụng một nguồn dữ liệu đã đối soát.",
    scope: [
      "Thu chi theo kỳ và danh mục",
      "Tài sản ròng, tài sản thanh khoản và phân bổ tài sản",
      "Lịch sử định giá; phân biệt vốn góp và lợi nhuận",
      "Bộ lọc thời gian, xem giao dịch nguồn và xuất dữ liệu",
    ],
    questions: ["Những báo cáo nào quan trọng nhất khi tổng kết tháng?"],
  },
  {
    slug: "settings",
    status: "partial",
    title: "Cài đặt",
    icon: "settings",
    label: "Không gian của bạn",
    description:
      "Chọn Tiếng Việt/English, năm chủ đề và chế độ sáng/tối/theo hệ thống; sao lưu dữ liệu, khôi phục vào tài khoản trống và cài lên màn hình chính.",
    scope: [
      "Đăng nhập bằng mã 8 chữ số qua email; dữ liệu riêng tư, mặc định tiền VND",
      "Tiếng Việt/English với định dạng vi-VN/en-GB; cùng tiền VND và giờ Việt Nam",
      "Năm chủ đề với minh họa riêng; tùy chọn giao diện lưu trên trình duyệt",
      "Sao lưu toàn bộ dữ liệu và khôi phục vào tài khoản chưa có dữ liệu; hồ sơ tùy chọn",
      "Thêm vào màn hình chính trên thiết bị có hỗ trợ",
    ],
    questions: [],
  },
] as const;

export type Module = (typeof modules)[number];
export type ModuleIcon = Module["icon"];

const navigationOrder = [
  "overview",
  "budgets",
  "income",
  "savings",
  "investments",
  "funds",
  "goals",
  "settings",
  "transactions",
  "accounts",
  "reports",
];
export const navigationModules = [...modules].sort(
  (a, b) =>
    Number(a.status === "planned") - Number(b.status === "planned") ||
    navigationOrder.indexOf(a.slug) - navigationOrder.indexOf(b.slug),
);

// Shared product capability; does not change the implementation status of any module.
export const pageHelpSummary =
  "Nút Hướng dẫn cạnh tiêu đề giúp bạn hiểu các khái niệm và thao tác, ngay cả khi đang nhập liệu.";

// Public home presentation is independent of module implementation status.
export const publicProductSummary =
  "Quản lý tài chính cá nhân với Financial Manager: theo dõi thu nhập, hũ chi tiêu, tiết kiệm, đầu tư và quỹ an toàn. Xem thử giao diện không cần tài khoản.";

export const publicHomeSummary =
  "Sau khi đăng nhập, bạn có một không gian riêng với chủ đề yêu thích.";

export const languageSummary =
  "Chọn Tiếng Việt hoặc English trên thanh đầu trang hoặc trong Cài đặt; lựa chọn dùng chung cho trang chủ, đăng nhập và ứng dụng, được ghi nhớ trên trình duyệt. Tiền tệ vẫn là VND.";

export const navigationSummary =
  "Trên máy tính, nút thu gọn menu nằm cạnh logo. Trên điện thoại, chạm bên ngoài menu để đóng.";
