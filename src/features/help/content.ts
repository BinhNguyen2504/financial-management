import { fundNames, guides } from "@/features/funds/content";
import type { HelpArticle, HelpArticles, HelpItem } from "./types";

const term = (
  id: string,
  title: string,
  ...paragraphs: string[]
): HelpItem => ({ id, title, paragraphs });
const task = (
  id: string,
  title: string,
  when: string,
  steps: string[],
  result: string,
): HelpItem => ({ id, title, paragraphs: [when], steps, result });
function article(
  intro: string[],
  mindset: string[],
  terms: HelpItem[],
  tasks: HelpItem[],
  examples: string[],
  pitfalls: string[],
): HelpArticle {
  return {
    sections: [
      {
        id: "purpose",
        title: "Trang này giúp gì và dành cho ai",
        paragraphs: intro,
      },
      { id: "mindset", title: "Tư duy sử dụng", paragraphs: mindset },
      { id: "terms", title: "Thuật ngữ cần biết", items: terms },
      { id: "tasks", title: "Hướng dẫn theo tác vụ", items: tasks },
      {
        id: "examples",
        title: "Ví dụ minh họa",
        paragraphs: [
          "Minh họa · Số liệu cố định để giải thích cách dùng, không phải dữ liệu tài khoản của bạn.",
          ...examples,
        ],
      },
      { id: "pitfalls", title: "Điểm dễ hiểu nhầm", paragraphs: pitfalls },
    ],
  };
}

export const articles: HelpArticles = {
  overview: article(
    [
      "Dành cho lúc bạn muốn nhìn nhanh tháng hiện tại trước khi quyết định cần kiểm tra khoản nào. **Tổng quan hiện tập trung vào các hũ Chi tiêu**: kế hoạch, thực chi và tiền còn trong hũ.",
    ],
    [
      "==Bắt đầu từ bức tranh tháng==, sau đó đi vào hũ cần chú ý. Một con số tổng chỉ hữu ích khi bạn biết nó thuộc kỳ nào và đã đủ thông tin chưa.",
    ],
    [
      term(
        "monthly-plan",
        "Mức tháng",
        "Mức dự kiến dành cho các hũ trong tháng, không đồng nghĩa với số tiền đang nằm ở ngân hàng.",
      ),
      term(
        "actual",
        "Thực chi và tạm tính",
        "Chi tháng được suy ra từ tiền có và số dư cuối tháng; hũ tích lũy dùng các lần sử dụng đã ghi. Số của tháng hiện tại có thể là tạm tính.",
      ),
      term(
        "remaining",
        "Còn trong hũ",
        "Phần tiền còn lại theo dữ liệu và quy tắc của các hũ; **không phải tổng tài sản ròng toàn ứng dụng**.",
      ),
    ],
    [
      task(
        "read-overview",
        "Đọc bức tranh tháng",
        "Khi muốn kiểm tra nhanh tình hình Chi tiêu.",
        [
          "Đọc tháng đang hiển thị cùng ba chỉ số Mức tháng, Thực chi, Còn trong hũ.",
          "Xem phần Tiền đã đi đâu? và danh sách hũ để xác định khoản cần kiểm tra.",
          "Mở Chi tiêu để xem chi tiết và điều chỉnh số thực tế nếu cần.",
        ],
        "Kết quả: biết nên kiểm tra hũ nào trước; số tổng không thay thế việc đối chiếu.",
      ),
      task(
        "start-overview",
        "Bắt đầu khi chưa có dữ liệu",
        "Khi Tổng quan chưa có sổ Chi tiêu.",
        [
          "Mở Chi tiêu từ nút bắt đầu hoặc menu.",
          "Chọn tháng bắt đầu, thêm hũ và số dư đầu kỳ thực tế.",
          "Quay lại Tổng quan để đọc phần tổng hợp.",
        ],
        "Kết quả: Tổng quan sử dụng dữ liệu bạn đã ghi; không tự tạo tiền mẫu.",
      ),
      task(
        "privacy",
        "Đọc khi đang ẩn tiền",
        "Khi cần xem app ở nơi có người khác.",
        [
          "Dùng nút ẩn/hiện tiền ở thanh đầu trang.",
          "Tiếp tục đọc cấu trúc và tỷ lệ; bật hiện tiền khi cần đối chiếu số cụ thể.",
        ],
        "Kết quả: số tiền được che trên giao diện; thao tác này không sửa dữ liệu.",
      ),
    ],
    [
      "Một hũ có mức tháng ==2.000.000 ₫== nhưng thực chi tạm tính cao hơn mức này là điểm cần kiểm tra. Mở Chi tiêu để đối chiếu tiền bổ sung và số dư đã nhập.",
    ],
    [
      "Tổng quan chưa cộng Thu nhập, Tiết kiệm, Đầu tư và Quỹ an toàn thành tài sản ròng.",
      "Các mục **đang phát triển** là giới thiệu định hướng, không phải báo cáo đã sẵn sàng.",
    ],
  ),
  budgets: article(
    [
      "Dành cho người muốn chủ động chia tiền theo mục đích và biết tháng này cần cấp thêm bao nhiêu, đã chi bao nhiêu, còn thừa hay thiếu. App tổng hợp theo hũ và theo tháng; bạn có thể tra giao dịch thanh toán chi tiết tại ngân hàng hoặc ví đang dùng.",
    ],
    [
      "==Chia trước, chi sau==: giao nhiệm vụ cho từng phần tiền trước khi sử dụng. Mỗi hũ là một mục đích; chọn nơi giữ/chi phù hợp và duy trì quy ước đó để dễ lần lại giao dịch.",
      "Ví dụ bạn quy ước **ngân hàng A dùng cho sinh hoạt** thì hãy chi sinh hoạt từ đúng nơi đó. Nếu một nơi phục vụ nhiều hũ, cần tự phân biệt và đối chiếu các khoản; app không tự nhận diện giao dịch ngân hàng.",
      "Nhìn lại tổng thể mỗi tháng để điều chỉnh kế hoạch. Phần tích lũy được giữ lại cho lần dùng sau, thay vì coi tiền bỏ hũ là đã tiêu.",
    ],
    [
      term(
        "jars",
        "Hũ chi tiêu",
        "Một phần tiền dành cho một mục đích cụ thể, như sinh hoạt hoặc bảo dưỡng. Hũ là cách tổ chức kế hoạch; không phải tài khoản ngân hàng do app tạo.",
      ),
      term(
        "jar-types",
        "Chi trong tháng và Tích lũy",
        "Hũ Chi trong tháng tự tính tiền cần thêm bằng phần còn thiếu so với mức tháng, tối thiểu 0. Hũ Tích lũy góp mặc định theo mức tháng và ghi từng lần sử dụng. **Loại hũ cố định sau khi tạo**.",
      ),
      term(
        "classification",
        "Phương thức và Nhóm mục đích",
        "Phương thức chỉ nơi/kênh giữ và chi tiền, như ngân hàng A, ví điện tử hay tiền mặt. Nhóm mục đích gom các hũ theo nhu cầu, chẳng hạn thiết yếu hoặc chăm sóc bản thân. Phân loại này không tạo sổ ngân hàng hay lệnh chuyển tiền.",
      ),
      term(
        "funding",
        "Mức tháng, tiền thêm và bổ sung",
        "Mức tháng là kế hoạch. Tiền thêm theo tháng là phần cấp vào hũ, được suy ra theo loại hũ và có thể điều chỉnh theo thực tế. Tiền bổ sung là phần thêm ngoài mức đó. ==Tiền cần thêm của hũ chi tháng = max(mức tháng − dư chuyển sang, 0)==.",
      ),
      term(
        "balance",
        "Dư chuyển tiếp, thực chi và tạm tính",
        "==Tiền có = dư chuyển sang + tiền thêm theo tháng + bổ sung==. Với hũ chi tháng: **thực chi = tiền có − dư cuối tháng**; dư cuối tháng mặc định là 0 nếu chưa có ngoại lệ. Tháng hiện tại có nhãn tạm tính. Với hũ tích lũy: **thực chi là tổng các lần sử dụng**, dư còn lại được tính tự động.",
      ),
      term(
        "effective-month",
        "Tháng hiệu lực",
        "Mốc bắt đầu áp dụng một cấu hình hũ. Điều chỉnh riêng một tháng khác với thay mức mặc định từ tháng đó trở đi; luôn đọc phần xem trước trước khi xác nhận.",
      ),
      term(
        "closed-year",
        "Chốt năm",
        "Lưu bản tổng kết của năm đã kết thúc thành trạng thái chỉ xem. Cần chốt lần lượt từ năm cũ đến mới; hiện không có mở khóa năm đã chốt.",
      ),
    ],
    [
      task(
        "initialize",
        "Khởi tạo và thêm hũ",
        "Khi bắt đầu theo dõi hoặc cần một mục đích chi mới.",
        [
          "Chọn tháng bắt đầu của sổ; những tháng trước đó không được tự tạo thực chi.",
          "Chọn Thêm hũ, nhập tên, loại hũ, phương thức, nhóm mục đích nếu cần, mức mặc định và số dư đầu kỳ.",
          "Chọn **Xem trước** thay đổi, đọc các tháng chịu ảnh hưởng rồi Xác nhận lưu.",
        ],
        "Kết quả: hũ xuất hiện từ tháng bắt đầu. Loại hũ không đổi được sau khi tạo; không nhập số dư đầu kỳ như tiền bổ sung lần nữa.",
      ),
      task(
        "labels",
        "Quản lý phương thức và nhóm",
        "Khi cần phân loại nơi giữ tiền hoặc mục đích.",
        [
          "Mở phần Phương thức và nhóm, chọn tab tương ứng để thêm hoặc sửa phân loại.",
          "Khi nhập hũ, chọn phân loại từ danh sách; có thể thêm ngay qua dialog con rồi quay lại bản nháp hũ.",
          "Chọn logo/biểu tượng nếu cần và xác nhận phần xem trước.",
          "Danh sách thương hiệu chia thành ngân hàng và ví điện tử. Biểu tượng hũ có thể chọn từ gợi ý hoặc nhập một emoji từ bàn phím.",
        ],
        "Kết quả: có gợi ý phân loại để dùng cho hũ. Đổi tên trong danh sách gợi ý không tự đổi các tháng lịch sử đã lưu.",
      ),
      task(
        "adjust-month",
        "Đối chiếu và điều chỉnh riêng tháng",
        "Khi số cấp tiền hoặc số còn lại thực tế khác mặc định.",
        [
          "Chọn năm và tháng, mở Điều chỉnh của hũ.",
          "Nhập mức riêng, tiền thêm, bổ sung hoặc dư cuối tháng phù hợp; để trống trường tùy chọn nếu muốn dùng mặc định.",
          "**Xem trước** và xác nhận. Kiểm tra thực chi và dư chuyển sang tháng sau.",
        ],
        "Kết quả: các tháng sau được tính lại khi cần. Dư cuối tháng không được lớn hơn tiền có; tháng tương lai chỉ là kế hoạch.",
      ),
      task(
        "spend",
        "Ghi lần sử dụng hũ tích lũy",
        "Khi thật sự dùng tiền đã tích lũy.",
        [
          "Mở chi tiết hũ tích lũy, vào Các lần sử dụng và thêm lần sử dụng.",
          "Nhập ngày, số tiền và ghi chú; ngày không ở tương lai và hũ phải đủ tiền tại ngày đó.",
          "**Xem trước** rồi lưu; mở lại lần sử dụng để sửa hoặc xóa khi nhập sai.",
        ],
        "Kết quả: thực chi và dư hũ cập nhật, lịch sử được giữ. Tiền góp hàng tháng tự nó chưa phải thực chi.",
      ),
      task(
        "configure-jar",
        "Đổi cấu hình, ngừng cấp tiền và xem lịch sử",
        "Khi muốn thay cách chia tiền từ một tháng cụ thể.",
        [
          "Mở chi tiết hũ để đổi tên, mức mặc định, phương thức, nhóm hoặc biểu tượng; chọn tháng hiệu lực.",
          "Dùng thao tác ngừng cấp tiền nếu không muốn cấp mặc định từ tháng đó.",
          "Đọc xem trước, xác nhận và kiểm tra các tab Theo tháng, Các lần sử dụng, Lịch sử thay đổi.",
        ],
        "Kết quả: tháng trước giữ cấu hình lịch sử. Ngừng cấp tiền vẫn giữ dư; cấu hình đã hẹn ở tháng sau tiếp tục có hiệu lực khi tới tháng đó.",
      ),
      task(
        "reports",
        "Lọc và đọc báo cáo",
        "Khi muốn tìm cơ cấu chi hoặc tháng vượt mức.",
        [
          "Chọn khu vực Báo cáo và khoảng tháng/quý trong năm hiện tại.",
          "Lọc theo loại hũ, hũ, phương thức hoặc nhóm; chuyển giữa Biểu đồ và Bảng.",
          "Đọc nhãn tạm tính; so sánh kế hoạch, tiền bỏ hũ và thực chi theo cùng bộ lọc.",
        ],
        "Kết quả: nhìn thấy nguyên nhân thừa thiếu. Không cộng các số dư tháng thành tổng tiền; chi từ hũ tích lũy không bị coi là vượt mức góp tháng.",
      ),
      task(
        "close-year",
        "Hoàn tất và chốt năm",
        "Khi đã đối chiếu xong năm kết thúc.",
        [
          "Chọn năm cần hoàn tất, kiểm tra tháng 12 và dư chuyển sang tháng 1.",
          "Sao lưu toàn tài khoản tại Cài đặt trước khi chốt.",
          "Dùng **Chốt năm**, đọc xem trước và xác nhận khi chắc chắn; chốt theo thứ tự từ cũ đến mới.",
        ],
        "Kết quả: năm chốt chỉ xem và **không có thao tác mở khóa**. Báo cáo tương tác hiện tập trung năm hiện tại.",
      ),
    ],
    [
      "Quy ước: **hũ Sinh hoạt chi từ ngân hàng A**; **hũ Đi lại chi từ ví B**; khoản chi tiền mặt cần được đối chiếu đúng hũ trước khi cập nhật cuối tháng.",
      "Hũ chi tháng có dư chuyển sang ==300.000 ₫==, mức tháng ==2.000.000 ₫== → cần thêm ==1.700.000 ₫==. Bổ sung ==400.000 ₫==, dư cuối ==100.000 ₫== → thực chi ==2.300.000 ₫==, vượt mức ==300.000 ₫==.",
      "Hũ tích lũy góp ==500.000 ₫== và chưa sử dụng thì thực chi vẫn ==0 ₫==; phần tiền ấy tiếp tục ở trong hũ.",
    ],
    [
      "App ghi nhận và tính toán; **không chuyển tiền thật** hoặc kiểm tra bạn có chi đúng ngân hàng đã quy ước không.",
      "Ghi Thu nhập **không tự cấp tiền vào hũ**. Phương thức có tên ngân hàng không phải kết nối ngân hàng.",
      "Mức mặc định có thể được suy ra thành tiền thêm; hãy điều chỉnh khi thực tế khác. Thực chi tháng hiện tại có thể thay đổi khi cập nhật dư.",
      "Sao lưu/khôi phục toàn tài khoản ở Cài đặt; bản xuất theo năm không dùng cho khôi phục toàn tài khoản.",
    ],
  ),
  income: article(
    [
      "Dành cho người muốn biết thực tế đã nhận bao nhiêu theo tháng và nguồn thu, đồng thời nhận ra những khoản chưa nhập. Theo dõi riêng nguồn lặp lại và khoản thu một lần.",
    ],
    [
      "Ghi ==tiền đã thực nhận==, không coi khoản dự kiến là tiền đã có. Trước khi đánh giá thu nhập tăng hay giảm, kiểm tra kỳ đó đã nhập đủ chưa.",
    ],
    [
      term(
        "fixed",
        "Danh mục cố định",
        "Nguồn thu dùng lại qua các tháng từ tháng bắt đầu đến khi ngừng, ví dụ Lương. **Cố định là nguồn lặp lại, không phải số tiền bất biến**; app không tự ghi tiền cho bạn.",
      ),
      term(
        "oneoff",
        "Thu phát sinh",
        "Khoản thu riêng lẻ có tên, tháng và số tiền dương, ví dụ thưởng dự án. Mỗi khoản độc lập và không tạo danh mục lặp lại.",
      ),
      term(
        "missing",
        "Chưa nhập và đã nhập 0",
        "**Dấu — nghĩa là chưa ghi số thu**. ==0 ₫== nghĩa là **đã xác nhận thực nhận bằng 0**; hai trạng thái khác nhau. Tổng đã ghi nhận không bao gồm tiền chưa nhập.",
      ),
      term(
        "income-effective",
        "Tháng hiệu lực và ngừng danh mục",
        "Đổi tên/mô tả từ tháng chọn vẫn giữ thông tin trước đó. Ngừng bỏ các dòng trống từ tháng hiệu lực nhưng giữ số thu đã ghi và lịch sử.",
      ),
      term(
        "monthly-amount",
        "Một số thực nhận mỗi danh mục–tháng",
        "Lưu lại số thu của cùng danh mục và tháng sẽ **thay thế giá trị trước, không cộng thêm**. Nếu nhận nhiều lần, ==nhập tổng thực nhận của tháng==.",
      ),
    ],
    [
      task(
        "create-fixed",
        "Tạo nguồn thu lặp lại",
        "Khi bắt đầu theo dõi một nguồn thu đều đặn.",
        [
          "Vào phần Danh mục cố định, chọn Thêm danh mục.",
          "Nhập tên, mô tả nếu cần và tháng bắt đầu.",
          "Chọn Lưu; quay lại tháng cần nhập tiền.",
        ],
        "Kết quả: danh mục xuất hiện trong các tháng hiệu lực, số tiền vẫn chưa nhập.",
      ),
      task(
        "enter-month",
        "Nhập, sửa hoặc xóa số thu tháng",
        "Khi đã biết tổng thực nhận của một nguồn trong tháng.",
        [
          "Chọn tháng, dùng Nhập ở danh mục tương ứng.",
          "Nhập số tiền thực nhận và ghi chú; có thể nhập 0. Chọn Lưu.",
          "Mở lại để sửa tổng; dùng **Xóa số thu** để trả ô về chưa nhập khi cần.",
        ],
        "Kết quả: một số tiền cho danh mục–tháng. Không ghi thực nhận vào tháng tương lai; xóa số thu giữ lịch sử.",
      ),
      task(
        "enter-oneoff",
        "Ghi và quản lý thu phát sinh",
        "Khi có tiền nhận một lần ngoài các nguồn lặp lại.",
        [
          "Chọn thêm khoản thu phát sinh, nhập tên, tháng, số tiền dương và mô tả nếu cần.",
          "Chọn Lưu; mở chi tiết Thu phát sinh để xem các khoản.",
          "Tìm kiếm, chuyển trang và sửa/xóa đúng khoản; kiểm tra số tiền và tháng trước khi xác nhận xóa.",
        ],
        "Kết quả: mỗi khoản được cộng độc lập; không tự lặp sang tháng sau.",
      ),
      task(
        "missing-income",
        "Bổ sung khoản chưa nhập từ báo cáo",
        "Khi tổng kỳ có cảnh báo thiếu thông tin.",
        [
          "Mở Báo cáo, chọn năm và khoảng tháng/quý cần kiểm tra.",
          "Mở ô hoặc khoản được đánh dấu còn thiếu để nhập ngay.",
          "Lưu rồi tiếp tục kiểm tra những khoản còn lại trong cùng bộ lọc.",
        ],
        "Kết quả: báo cáo cập nhật và giữ vị trí. Tháng tương lai hoặc ngoài thời gian hoạt động không cho nhập.",
      ),
      task(
        "manage-income",
        "Sửa, ngừng hoặc xóa danh mục",
        "Khi nguồn thu đổi tên hoặc không còn sử dụng.",
        [
          "Mở quản lý danh mục và chọn sửa hoặc ngừng từ tháng phù hợp.",
          "Đọc xem trước ảnh hưởng từ tháng hiệu lực, kể cả các năm sau, rồi xác nhận.",
          "**Chỉ dùng Xóa danh mục với nguồn chưa từng ghi số thu**; nguồn từng ghi tiền được ngừng để giữ lịch sử.",
        ],
        "Kết quả: tiền đã ghi không bị xóa dây chuyền. Nhập 0 cũng được coi là đã có số thu.",
      ),
      task(
        "reports",
        "Đọc báo cáo và xuất bảng dữ liệu",
        "Khi cần tổng hợp theo nguồn hoặc thời gian.",
        [
          "Chọn năm, cả năm/quý/khoảng tháng, loại cố định/phát sinh và danh mục.",
          "So sánh Bảng và Biểu đồ, kiểm tra Tổng đã ghi nhận cùng cảnh báo chưa nhập.",
          "Xuất bảng dữ liệu theo bộ lọc đang chọn khi cần đối chiếu bên ngoài.",
        ],
        "Kết quả: bảng, biểu đồ và file cùng phạm vi lọc. File xuất có số tiền đầy đủ, kể cả khi giao diện đang ẩn tiền.",
      ),
    ],
    [
      "Nguồn Lương nhận ==20.000.000 ₫== tháng này và ==22.000.000 ₫== tháng sau vẫn là một danh mục cố định. Thưởng dự án ==3.000.000 ₫== chỉ một lần có thể ghi vào Thu phát sinh.",
      "Đã nhập Lương ==10.000.000 ₫==, sau đó nhận thêm ==5.000.000 ₫==: sửa số thực nhận tháng thành ==15.000.000 ₫==, không nhập ==5.000.000 ₫== để mong app cộng dồn.",
    ],
    [
      "Tổng đã ghi nhận chưa chắc là toàn bộ thu nhập nếu còn ô chưa nhập.",
      "Thu nhập không ghi sổ ngân hàng, không chuyển tiền và **không tự phân bổ** vào Chi tiêu, Tiết kiệm hay Quỹ an toàn.",
    ],
  ),
  savings: article(
    [
      "Dành cho người muốn theo dõi phần tiền đã dành dụm, sổ tiền gửi và vàng cùng lịch sử liên tục qua nhiều năm.",
    ],
    [
      "Hiểu tài sản đến từ ==tiền góp hay kết quả tích lũy==. Ghi rõ ngày, nguồn/đích và các lần thay đổi để có thể đối chiếu lại.",
      "Chuyển tiền giữa các khoản tiết kiệm **không tự làm bạn giàu thêm**. Giá trị vàng cần **ngày định giá và đơn vị** rõ ràng.",
    ],
    [
      term(
        "assets",
        "Tiền/ví, sổ tiền gửi và đợt vàng",
        "Tiền/ví theo dõi số dư. Tiền gửi giữ từng sổ với gốc và kỳ hạn. Vàng giữ từng đợt mua cùng khối lượng và giá vốn; đơn vị chỉ, lượng/cây hoặc gram phải chọn rõ, chưa chuyển đổi giữa đơn vị.",
      ),
      term(
        "opening",
        "Giao dịch mở đầu",
        "Tài sản đã có tại ngày bắt đầu theo dõi. Mở đầu **không phải tiền góp mới trong kỳ**; các khoản mở đầu cùng danh mục cần cùng ngày và đứng trước các phát sinh khác.",
      ),
      term(
        "transfers",
        "Vốn nạp ròng và chuyển nội bộ",
        "Vốn nạp ròng là tiền từ bên ngoài vào trừ tiền ra ngoài. Chuyển giữa các danh mục trong Tiết kiệm chỉ đổi nơi giữ, **không tạo thu nhập hay lợi nhuận**.",
      ),
      term(
        "valuation",
        "Định giá, giá vốn và lãi/lỗ",
        "Giá vốn là chi phí hình thành tài sản, gồm phí/thuế mua. Vàng dùng giá bán lại dự kiến tại ngày định giá. Lãi đã chốt đến từ phần đã bán; lãi chưa chốt thuộc phần còn giữ.",
      ),
      term(
        "close-month",
        "Chốt tháng và mở lại",
        "Chốt lưu kết quả tháng đã kết thúc sau khi đủ thông tin. Mở lại cần lý do và làm mất hiệu lực các lần chốt sau đó; bản chốt cũ vẫn được giữ.",
      ),
    ],
    [
      task(
        "setup",
        "Thêm danh mục và tài sản mở đầu",
        "Khi bắt đầu quản lý một khoản tiết kiệm.",
        [
          "Vào Quản lý, thêm danh mục với loại tài sản, tên, biểu tượng và tháng bắt đầu; vàng cần đơn vị.",
          "Nếu đã có tài sản, ghi mở đầu đúng loại: tiền, từng sổ gửi hoặc từng đợt vàng với giá vốn và giá định giá.",
          "Xem trước thay đổi rồi xác nhận; kiểm tra chi tiết danh mục.",
        ],
        "Kết quả: số đầu kỳ được ghi riêng; không nhập lại thành một khoản nạp mới.",
      ),
      task(
        "cash",
        "Nạp, rút và chuyển tiền",
        "Khi tiền tiết kiệm thật sự thay đổi nơi giữ hoặc ra/vào.",
        [
          "Mở giao dịch hoặc chi tiết danh mục tiền, chọn nạp/rút/chuyển phù hợp.",
          "Chọn ngày, số tiền, nguồn/đích trong Tiết kiệm hoặc bên ngoài và ghi chú.",
          "Xem trước và xác nhận; kiểm tra lịch sử và số dư sau giao dịch.",
        ],
        "Kết quả: các phía liên quan cập nhật trong một lần lưu; không cho số dư âm tại bất kỳ thời điểm bị ảnh hưởng.",
      ),
      task(
        "deposits",
        "Mở sổ, nhận lãi, rút gốc và tái tục",
        "Khi quản lý tiền gửi theo từng sổ.",
        [
          "Chọn mở sổ, nhập gốc, ngày, kỳ hạn và nguồn tiền.",
          "Khi nhận lãi, chọn nhập gốc sổ hiện tại hoặc nhận tiền về ví/bên ngoài.",
          "Khi rút trước hạn, nhập gốc, lãi và phí thực tế. Khi tái tục, chọn phần lãi nhập sổ tiếp theo và phần nhận bằng tiền.",
          "**Xem trước** rồi xác nhận; xem tab Sổ tiền gửi và Giao dịch để đối chiếu.",
        ],
        "Kết quả: từng sổ giữ lịch sử riêng. App không tự tính số lãi ngân hàng sẽ trả.",
      ),
      task(
        "gold",
        "Mua, bán và định giá vàng",
        "Khi khối lượng vàng hoặc giá trị theo dõi thay đổi.",
        [
          "Ghi mua vàng với ngày, lượng, giá, phí/thuế và nguồn tiền.",
          "Khi bán, chọn một hoặc nhiều đợt và lượng bán mỗi đợt; nhập giá bán, phí/thuế và nơi nhận tiền.",
          "Cập nhật giá bán lại dự kiến theo ngày trong phần định giá; dùng đúng đơn vị của danh mục.",
          "Xem trước, lưu và kiểm tra vốn, lượng còn lại cùng lãi/lỗ.",
        ],
        "Kết quả: không bán vượt lượng đang giữ. Giá giao dịch không tự thay cho lịch sử định giá, trừ mốc mở đầu được nhập rõ.",
      ),
      task(
        "history",
        "Tìm giao dịch, sửa/hủy và quản lý danh mục",
        "Khi cần đối chiếu hoặc sửa thông tin đã ghi.",
        [
          "Mở chi tiết danh mục, lọc và chuyển trang ở Sổ tiền gửi/Đợt vàng/Giao dịch; hoặc lọc giao dịch theo tháng, danh mục và loại.",
          "Mở giao dịch để xem và sửa/hủy với lý do; đọc ảnh hưởng trước khi lưu.",
          "Đổi thông tin danh mục theo tháng hiệu lực. Lưu trữ khi không còn tài sản, chọn tháng sau giao dịch cuối; có thể khôi phục.",
        ],
        "Kết quả: giữ bản cũ và lý do thay đổi. Sửa quá khứ phải bảo toàn số dư và không được xuyên qua tháng đang chốt.",
      ),
      task(
        "closing",
        "Chốt hoặc mở lại tháng",
        "Khi hoàn tất đối chiếu cuối tháng hoặc cần sửa tháng đã chốt.",
        [
          "Kiểm tra đủ giao dịch và giá; nếu dùng giá mang từ tháng cũ, đọc và xác nhận cảnh báo.",
          "Chốt tháng đã kết thúc theo thứ tự từ tháng bắt đầu sớm nhất.",
          "Khi cần sửa, mở lại tháng với lý do, điều chỉnh rồi chốt lại các tháng liên quan.",
        ],
        "Kết quả: có bản tổng kết theo tháng, giữ dấu vết các lần chốt/mở lại.",
      ),
      task(
        "reports",
        "Đọc báo cáo, xuất và sao lưu",
        "Khi muốn phân biệt tăng tài sản do góp tiền với do lãi.",
        [
          "Chọn kỳ và bộ lọc danh mục, loại tài sản hoặc giao dịch trong Báo cáo.",
          "Đọc tài sản, vốn nạp ròng, kết quả kỳ và lãi/lỗ; dùng Bảng hoặc chú thích biểu đồ để kiểm tra số.",
          "Xuất bảng dữ liệu theo phạm vi báo cáo; dùng Cài đặt cho sao lưu/khôi phục toàn tài khoản.",
        ],
        "Kết quả: báo cáo có thể đi qua nhiều năm. Thiếu giá không được coi là giá trị bằng 0; file xuất có dữ liệu đầy đủ.",
      ),
    ],
    [
      "Chuyển ==5.000.000 ₫== từ ví Tiết kiệm sang mở sổ chỉ đổi hình thức giữ tiền. Tổng tài sản không tăng thêm ==5.000.000 ₫== vì thao tác chuyển.",
      "Một đợt vàng có vốn ==10.000.000 ₫== và định giá còn giữ ==11.000.000 ₫== thì lãi chưa chốt là ==1.000.000 ₫==; chưa phải tiền lãi đã thu về.",
    ],
    [
      "Tài sản trong Tiết kiệm chưa phải tài sản ròng toàn ứng dụng. Không ghi lại cùng lượng vàng ở Đầu tư chỉ để tổng hợp.",
      "Không ghi chuyển nội bộ thêm lần nữa thành thu nhập hoặc chi tiêu. Chọn Bên ngoài không tự tạo bản ghi ở mục khác.",
    ],
  ),
  investments: article(
    [
      "Dành cho người muốn theo dõi vốn và giá trị đầu tư theo tổng danh mục, cùng nhiều ví tiền chờ bằng VND. Hiện không quản lý từng mã, khối lượng hoặc lô chứng khoán.",
    ],
    [
      "Tách tiền góp khỏi kết quả đầu tư; tách tài sản đang đầu tư khỏi tiền đang chờ. Giá trị phải đi kèm ngày cập nhật để tránh hiểu một số cũ là số hiện tại.",
    ],
    [
      term(
        "portfolio",
        "Danh mục đầu tư và ví tiền chờ",
        "Danh mục theo tổng vốn và tổng giá trị tài sản còn giữ. Ví tiền chờ theo số tiền chưa đầu tư. Tổng tài sản trong Đầu tư bao gồm cả hai; ví không có ROI.",
      ),
      term(
        "opening",
        "Mở đầu",
        "Vốn, giá trị hoặc số dư đã có tại ngày bắt đầu theo dõi. Đây **không phải vốn nạp mới hay lợi nhuận trong kỳ**; mở đầu phải đứng trước các phát sinh liên quan.",
      ),
      term(
        "sale-cost",
        "Giá vốn phần bán và giá trị còn giữ",
        "Khi bán, bạn nhập **giá vốn của phần tài sản bán ra**. Khi mua/bán, nhập cả giá trị thị trường của phần tài sản còn giữ sau giao dịch, **không gồm tiền chờ**.",
      ),
      term(
        "valuation",
        "Định giá có ngày",
        "Tổng giá trị thị trường tại ngày chọn. Định giá **không đổi tiền hoặc vốn**. Báo cáo dùng mốc gần nhất không muộn hơn ngày báo cáo và hiển thị ngày cập nhật; **thiếu giá không bằng 0**.",
      ),
      term(
        "profit",
        "Lãi đã chốt, chưa chốt và kết quả kỳ",
        "Lãi đã chốt = tiền bán − phí − thuế − giá vốn phần bán. Lãi chưa chốt = giá trị còn giữ − vốn còn lại. Kết quả kỳ còn loại trừ dòng vốn bên ngoài, chuyển nội bộ của phần được lọc và tài sản mở đầu; khác tổng lãi/lỗ đang theo dõi.",
      ),
      term(
        "roi",
        "ROI chưa chốt",
        "Lãi chưa chốt chia giá vốn còn lại. Khi vốn bằng 0 hoặc đang xem ví tiền chờ, ROI không có giá trị và hiển thị —.",
      ),
    ],
    [
      task(
        "setup",
        "Tạo danh mục, ví và mở đầu",
        "Khi bắt đầu theo dõi đầu tư.",
        [
          "Vào Quản lý, thêm danh mục đầu tư hoặc ví tiền chờ với tên và ngày bắt đầu.",
          "Nếu đã có tài sản, ghi mở đầu: vốn và giá trị thị trường riêng cho danh mục, số dư tiền cho ví.",
          "Xem trước rồi xác nhận; kiểm tra phần Danh mục và Ví tiền chờ.",
        ],
        "Kết quả: có mốc bắt đầu rõ ràng; không ghi tài sản mở đầu như khoản nạp mới.",
      ),
      task(
        "cash",
        "Nạp, rút và chuyển giữa ví",
        "Khi tiền chờ thay đổi.",
        [
          "Mở ví, chọn nạp/rút hoặc chuyển ví.",
          "Nhập ngày, số tiền, ví nguồn/đích khác nhau và ghi chú nguồn bên ngoài nếu cần.",
          "Xem trước rồi xác nhận, kiểm tra số dư từng phía.",
        ],
        "Kết quả: chuyển giữa ví giữ tổng tiền, không tạo lợi nhuận và không cho âm ví.",
      ),
      task(
        "trade",
        "Ghi mua hoặc bán",
        "Khi thực sự mua thêm hoặc bán bớt tài sản.",
        [
          "Mở danh mục và chọn mua hoặc bán; chọn ví thanh toán/nhận tiền hoặc Bên ngoài.",
          "Nhập ngày, tiền mua/bán, phí, thuế; khi bán nhập thêm giá vốn phần bán.",
          "Nhập giá trị phần tài sản còn giữ sau giao dịch. Với Bán hết, kiểm tra vốn được điền và giá trị còn lại bằng 0; tiền bán vẫn do bạn nhập.",
          "Xem trước thay đổi cả tài sản và ví rồi xác nhận.",
        ],
        "Kết quả: mua làm tăng vốn bằng tiền mua + phí + thuế; bán nhận tiền ròng và ghi lãi đã chốt. **Không trừ phí lần thứ hai**.",
      ),
      task(
        "price",
        "Cập nhật định giá",
        "Khi muốn cập nhật giá trị danh mục ở một ngày thực tế.",
        [
          "Mở danh mục, chọn định giá và ngày không vượt hôm nay.",
          "Nhập tổng giá trị tài sản còn giữ, không cộng tiền chờ.",
          "**Xem trước** và lưu; đối chiếu ngày định giá hiển thị trên danh mục.",
        ],
        "Kết quả: giá trị và lãi chưa chốt thay đổi, số dư ví và vốn không thay đổi.",
      ),
      task(
        "history",
        "Xem, sửa/hủy và lưu trữ",
        "Khi cần đối chiếu hoặc sửa một bản ghi.",
        [
          "Vào Giao dịch, lọc và mở chi tiết để xem hai phía trước/sau cùng các phiên bản; bật xem cả giao dịch đã hủy khi cần.",
          "Sửa hoặc hủy với lý do, xem trước toàn bộ ảnh hưởng rồi lưu.",
          "Trong Quản lý, sửa thông tin theo ngày hiệu lực; lưu trữ khi danh mục có cả vốn và giá trị bằng 0, hoặc ví có số dư 0. Có thể khôi phục.",
        ],
        "Kết quả: lịch sử được giữ, sửa quá khứ không tự thay các định giá đã nhập ở mốc sau; bản sửa phải bảo toàn số dư.",
      ),
      task(
        "reports",
        "Đọc báo cáo và xuất bảng dữ liệu",
        "Khi tổng kết đầu tư trong một khoảng thời gian.",
        [
          "Chọn tháng/quý/năm hoặc khoảng ngày xuyên năm trong Báo cáo.",
          "Lọc danh mục/ví và loại giao dịch, đọc dòng tiền, kết quả kỳ, cơ cấu và bảng thay thế.",
          "Kiểm tra ngày định giá, cảnh báo giá cũ/thiếu; xuất bảng dữ liệu nếu cần, sao lưu toàn tài khoản tại Cài đặt.",
        ],
        "Kết quả: lọc loại giao dịch chỉ lọc hoạt động, không loại lịch sử cần để tính số dư. Không cộng tài sản cuối các tháng với nhau.",
      ),
    ],
    [
      "Bán ==30.000.000 ₫==, giá vốn phần bán ==25.000.000 ₫==, phí/thuế ==200.000 ₫== → nhận ==29.800.000 ₫==, lãi đã chốt ==4.800.000 ₫==.",
      "Nạp thêm ==10.000.000 ₫== vào ví khiến tổng tài sản tăng ==10.000.000 ₫==, nhưng không phải lợi nhuận đầu tư.",
    ],
    [
      "App không kết nối sàn hoặc lấy giá trực tuyến; bạn nhập số tổng và định giá theo ngày.",
      "Chưa có giao dịch cổ tức, lãi hoặc phí riêng; phí/thuế hiện đi cùng mua/bán.",
      "Đầu tư độc lập với Thu nhập, Chi tiêu, Tiết kiệm và Quỹ an toàn. Báo cáo không phải tài sản ròng toàn ứng dụng.",
    ],
  ),
  funds: article(
    [
      "Dành cho người muốn theo dõi phần dự phòng theo mục đích, biết mức còn thiếu và tiền đang giữ ở đâu. Ba quỹ là cách tổ chức của sản phẩm; hệ số và ưu tiên do bạn chọn.",
    ],
    [
      "Chuẩn bị từng phần cho những nhu cầu khác nhau, theo khả năng của mình. Dùng quỹ đúng mục đích rồi bổ sung lại; một lần rút cần thiết không có nghĩa là thất bại.",
      "Phân biệt ==mục tiêu dự phòng với tiền thực có==. **Thay mục tiêu không tự nạp tiền vào quỹ**.",
    ],
    [
      ...Object.entries(guides).map(([id, guide]) =>
        term(
          id,
          fundNames[id as keyof typeof fundNames],
          guide.concept,
          guide.principle,
        ),
      ),
      term(
        "living",
        "Mức sinh hoạt và hệ số mục tiêu",
        "Mức sinh hoạt cộng mức cấu hình có hiệu lực của các hũ chi tháng đang hoạt động được bạn chọn. Không lấy thực chi, tiền thêm, ngoại lệ mức riêng từng tháng hoặc hũ tích lũy. Mục tiêu mỗi quỹ = ==mức sinh hoạt × hệ số bạn nhập==, làm tròn lên VND.",
      ),
      term(
        "source",
        "Nguồn đã xác nhận",
        "Bản chụp các hũ sinh hoạt dùng để tính mục tiêu. Khi nguồn Chi tiêu thay đổi, app đề xuất cập nhật; **mục tiêu chỉ đổi sau khi bạn xem trước và xác nhận**.",
      ),
      term(
        "locations",
        "Nơi giữ tiền và số dư độc lập",
        "Nơi giữ có thể là ngân hàng hoặc tiền mặt, dùng chung giữa các quỹ nhưng **số dư riêng từng quỹ**. Số dư ban đầu khác phần thêm tiền mới. Đây là sổ riêng, **không tự đồng bộ** với Tiết kiệm/Đầu tư/Chi tiêu.",
      ),
      term(
        "progress",
        "Tiến độ và còn thiếu",
        "Tiến độ so tiền đang có với mục tiêu. Tổng còn thiếu cộng phần thiếu của từng quỹ; **quỹ dư không tự bù cho quỹ khác**. Tỷ lệ có thể vượt 100%, hình minh họa giới hạn độ hoàn thiện.",
      ),
    ],
    [
      task(
        "setup",
        "Thiết lập nền tảng sinh hoạt và mục tiêu",
        "Khi lần đầu tạo Quỹ an toàn.",
        [
          "Mở thiết lập, chọn các hũ chi tháng phục vụ nhu cầu sinh hoạt.",
          "Nhập hệ số cho Emergency, Rainy Day và Sinking; dùng nút lên/xuống để xếp ưu tiên.",
          "Xem trước nguồn, mức sinh hoạt và mục tiêu rồi xác nhận.",
        ],
        "Kết quả: mục tiêu được thiết lập, không tự tạo số dư. Mức sinh hoạt bằng 0 hoặc nguồn không phù hợp cần được sửa trước.",
      ),
      task(
        "update-source",
        "Cập nhật mục tiêu khi Chi tiêu thay đổi",
        "Khi xuất hiện đề xuất nguồn mới hoặc bạn muốn đổi quy mô quỹ.",
        [
          "Mở phần Nền tảng sinh hoạt hoặc thiết lập mục tiêu.",
          "Đối chiếu nguồn cũ/mới; khi đổi hệ số, chọn giữ nguồn đã xác nhận hoặc áp dụng nguồn mới.",
          "**Xem trước** rồi xác nhận. Nếu nguồn vừa đổi ở phiên khác, tải lại và kiểm tra lại.",
        ],
        "Kết quả: mục tiêu đổi sau xác nhận; số tiền thực có trong quỹ giữ nguyên.",
      ),
      task(
        "locations-task",
        "Thêm và quản lý nơi giữ tiền",
        "Khi cần theo dõi tiền dự phòng tại một nơi cụ thể.",
        [
          "Mở Nơi giữ tiền và chọn Thêm nơi giữ tiền.",
          "Nhập tên, xem trước rồi lưu; ghi số dư ban đầu cho từng cặp quỹ/nơi giữ trước các giao dịch khác của cặp đó.",
          "Chỉ ngừng nơi giữ khi số dư mọi quỹ tại đó bằng 0; có thể khôi phục.",
        ],
        "Kết quả: cùng một nơi có thể giữ tiền của nhiều quỹ mà vẫn biết phần của từng quỹ.",
      ),
      task(
        "transactions",
        "Thêm, rút hoặc chuyển tiền",
        "Khi tiền dự phòng thật sự thay đổi.",
        [
          "Mở quỹ và chọn Thêm tiền, Rút tiền hoặc Chuyển tiền.",
          "Nhập thời điểm, số tiền, quỹ/nơi giữ; rút và chuyển cần lý do.",
          "**Xem trước** hai phía và xác nhận. Có thể chuyển cùng quỹ hoặc giữa các quỹ.",
        ],
        "Kết quả: chuyển giữ nguyên tổng tiền, không được tính thành góp mới; không cho số dư âm hoặc giao dịch tương lai.",
      ),
      task(
        "history",
        "Đối chiếu và sửa/hủy giao dịch",
        "Khi cần tìm hoặc điều chỉnh một lần ghi.",
        [
          "Mở Giao dịch, tìm kiếm/lọc quỹ, loại, nơi giữ hoặc ngày; chuyển trang nếu cần.",
          "Mở chi tiết và chọn sửa/hủy với lý do.",
          "Xem trước, xác nhận rồi kiểm tra Lịch sử và số dư tại nơi giữ.",
        ],
        "Kết quả: giữ các phiên bản cũ; sửa quá khứ phải bảo toàn số dư toàn bộ lịch sử.",
      ),
      ...Object.entries(guides).map(([id, guide]) =>
        task(
          `use-${id}`,
          `Sử dụng ${fundNames[id as keyof typeof fundNames]}`,
          guide.use,
          [
            guide.build,
            "Khi ghi rút, nêu lý do và nơi giữ; xem trước rồi xác nhận.",
            guide.replenish,
          ],
          "Kết quả: theo dõi được mục đích sử dụng và phần cần bổ sung theo mục tiêu đã chọn.",
        ),
      ),
    ],
    [
      "Mức sinh hoạt minh họa ==6.000.000 ₫==, hệ số tự chọn 3 → mục tiêu ==18.000.000 ₫==. Đang có ==9.000.000 ₫== → tiến độ 50%. Đây chỉ là ví dụ phép tính, không phải mức dự phòng bắt buộc.",
      "Chuyển ==1.000.000 ₫== từ Rainy Day sang Emergency làm thay số dư từng quỹ, tổng dự phòng không đổi.",
    ],
    [
      "Đổi hũ Chi tiêu chưa tự đổi mục tiêu Quỹ an toàn; cần xác nhận nguồn mới.",
      "Nạp/rút ở Quỹ an toàn không tự ghi ở Tiết kiệm, Đầu tư hoặc Chi tiêu. App không chuyển tiền ngân hàng.",
      "Mục tiêu mua sắm/cuộc sống thuộc định hướng trang Mục tiêu riêng, hiện **đang phát triển**. Sao lưu toàn tài khoản ở Cài đặt bao gồm Quỹ an toàn.",
    ],
  ),
  settings: article(
    [
      "Dành cho việc chọn giao diện, chủ động giữ bản sao dữ liệu, khôi phục và tìm cách mở app thuận tiện trên thiết bị.",
    ],
    [
      "==Giữ quyền chủ động với dữ liệu của mình==: biết file chứa gì, thời điểm sao lưu và nơi lưu file. Kiểm tra bản xem trước trước khi khôi phục.",
    ],
    [
      term(
        "backup",
        "Sao lưu dữ liệu",
        "Bản sao toàn tài khoản gồm dữ liệu nghiệp vụ và lịch sử, có các trường hồ sơ được hỗ trợ. File không mã hóa và **luôn chứa đầy đủ số tiền dù đang bật ẩn tiền**.",
      ),
      term(
        "restore",
        "Khôi phục vào tài khoản trống",
        "Nhập bản sao hợp lệ vào **tài khoản chưa có dữ liệu tài chính**. Hiện **không gộp, ghi đè hoặc nhập từng phần** vào tài khoản đã sử dụng.",
      ),
      term(
        "profile-restore",
        "Khôi phục hồ sơ tùy chọn",
        "Có thể nhập lại họ tên, ngày sinh và giới tính nếu chọn. Mặc định tắt; không thay email, token hoặc tài khoản đăng nhập.",
      ),
      term(
        "appearance",
        "Giao diện và tùy chọn trên trình duyệt",
        "**Sáng, Tối hoặc Theo hệ thống**. Tùy chọn giao diện, thanh điều hướng và cột bảng trên trình duyệt không nằm trong bản sao lưu dữ liệu tài chính.",
      ),
      term(
        "install",
        "Cài lên màn hình chính",
        "Mở ứng dụng bằng biểu tượng trên thiết bị nếu trình duyệt hỗ trợ. Bạn vẫn cần kết nối mạng để nhập dữ liệu.",
      ),
    ],
    [
      task(
        "export",
        "Tạo và lưu bản sao",
        "Khi muốn giữ một bản dữ liệu để phục hồi sau này.",
        [
          "Trong Sao lưu dữ liệu, tạo bản sao lưu và chờ phản hồi thành công.",
          "Nếu trình duyệt chưa tải, dùng liên kết Tải bản sao lưu.",
          "Kiểm tra file trong nơi tải xuống và cất bản sao ở nơi bạn kiểm soát.",
        ],
        "Kết quả: có file sao lưu do bạn chủ động tạo; app không tự sao lưu file nền và không xác nhận thay trình duyệt rằng file đã lưu vào máy.",
      ),
      task(
        "import",
        "Xem trước và khôi phục",
        "Khi có bản sao toàn tài khoản và tài khoản đích còn trống.",
        [
          "Trong Khôi phục dữ liệu, chọn bản sao lưu toàn bộ dữ liệu.",
          "Đọc kết quả kiểm tra, phạm vi và các bước xem trước; chọn khôi phục hồ sơ nếu muốn.",
          "Xác nhận khôi phục và chờ kết quả; kiểm tra các trang nghiệp vụ sau khi hoàn tất.",
          "Nếu riêng cập nhật hồ sơ lỗi sau khi dữ liệu tài chính đã được khôi phục, dùng thao tác thử lại hồ sơ được cung cấp.",
        ],
        "Kết quả: khôi phục dữ liệu vào tài khoản hiện tại. File riêng từng mục/năm không dùng cho luồng này; tài khoản đã có dữ liệu không được ghi đè.",
      ),
      task(
        "theme",
        "Chọn giao diện",
        "Khi muốn app phù hợp ánh sáng hoặc sở thích.",
        [
          "Trong Giao diện, chọn chủ đề Khu vườn (xanh lục), Dòng nước (xanh lam), Kim ngân (vàng), Lửa ấm (đỏ) hoặc Đất lành (nâu).",
          "Chọn Sáng, Tối hoặc Theo hệ thống; mỗi chủ đề có bảng màu sáng/tối riêng và dùng chung chế độ bạn chọn.",
          "Với Theo hệ thống, app dùng lựa chọn sáng/tối của thiết bị.",
        ],
        "Kết quả: màu sắc, minh họa và lời dẫn đổi ngay, được nhớ trên trình duyệt và cập nhật giữa các tab; dữ liệu và bản nháp đang nhập được giữ. Tùy chọn này không đồng bộ theo tài khoản và không nằm trong bản sao lưu dữ liệu tài chính.",
      ),
      task(
        "install-app",
        "Cài lên điện thoại hoặc máy tính",
        "Khi muốn mở app từ biểu tượng riêng.",
        [
          "Mở hướng dẫn cài lên màn hình chính trong Cài đặt.",
          "Chọn hướng dẫn tương ứng trình duyệt/thiết bị và làm theo thao tác được hiển thị.",
          "Mở lại từ biểu tượng vừa thêm; vẫn cần đăng nhập và kết nối để thao tác dữ liệu.",
        ],
        "Kết quả: có lối mở thuận tiện nếu trình duyệt hỗ trợ; **không phải một app native riêng**.",
      ),
    ],
    [
      "Bạn chuyển sang tài khoản mới chưa nhập dữ liệu: chọn file sao lưu toàn tài khoản, xem trước, để tắt khôi phục hồ sơ nếu chỉ muốn dữ liệu tài chính, rồi xác nhận.",
    ],
    [
      "Ẩn tiền chỉ che giao diện, không làm file bảng dữ liệu và bản sao lưu ẩn số hoặc có mật khẩu.",
      "Không cần và không nên xóa dữ liệu tài khoản đang dùng chỉ để thử khôi phục bản sao lưu. Luồng hiện tại không gộp hai tài khoản.",
      "Cài biểu tượng không bật nhập ngoại tuyến hoặc kết nối ngân hàng.",
    ],
  ),
  profile: article(
    [
      "Dành cho việc quản lý thông tin nhận diện của bạn trong ứng dụng: họ tên, ngày sinh và giới tính.",
    ],
    [
      "Chỉ cung cấp thông tin bạn muốn lưu. ==Thông tin hồ sơ giúp nhận diện tài khoản==; không thay đổi dữ liệu tài chính.",
    ],
    [
      term(
        "editable",
        "Thông tin có thể chỉnh",
        "Họ tên tối đa 100 ký tự. Ngày sinh và giới tính tùy chọn; ngày sinh phải hợp lệ từ năm 1900 đến hôm nay theo giờ Việt Nam.",
      ),
      term(
        "email",
        "Email đăng nhập và avatar",
        "**Email trên trang chỉ để xem**, chưa hỗ trợ đổi email. Ảnh đại diện dùng chữ cái đầu từ tên; hiện **chưa hỗ trợ tải ảnh lên**.",
      ),
      term(
        "save",
        "Nội dung đã thay đổi",
        "Nút Lưu chỉ hoạt động khi thông tin sau chuẩn hóa khác bản đã lưu. Lỗi lưu giữ nội dung để bạn sửa hoặc thử lại.",
      ),
    ],
    [
      task(
        "edit",
        "Chỉnh và lưu hồ sơ",
        "Khi muốn cập nhật cách app nhận diện bạn.",
        [
          "Mở menu avatar → Thông tin cá nhân.",
          "Sửa họ tên, ngày sinh hoặc giới tính; kiểm tra thông báo ngay tại trường nếu có.",
          "Chọn Lưu khi có thay đổi và chờ kết quả trước khi rời trang.",
        ],
        "Kết quả: thông tin được lưu vào hồ sơ tài khoản, email và dữ liệu tài chính giữ nguyên.",
      ),
      task(
        "return",
        "Quay lại hoặc đăng xuất",
        "Khi đã hoàn tất chỉnh hồ sơ.",
        [
          "Dùng Quay lại để về trang đã mở hồ sơ; nếu không có đường quay lại hợp lệ, về Tổng quan.",
          "Khi muốn kết thúc phiên, mở menu avatar và chọn Đăng xuất.",
        ],
        "Kết quả: quay lại đúng không gian làm việc hoặc rời phiên tài chính; đăng xuất không xóa dữ liệu tài khoản.",
      ),
    ],
    [
      "Đổi họ tên thành Minh An sẽ làm avatar dùng chữ cái đầu tương ứng. Bạn có thể để trống ngày sinh nếu không muốn cung cấp.",
    ],
    [
      "Nút Lưu đang tắt có thể vì chưa có thay đổi, không phải hồ sơ bị khóa.",
      "Khôi phục hồ sơ từ bản sao lưu là lựa chọn riêng trong Cài đặt và **không đổi email** đăng nhập.",
    ],
  ),
  transactions: article(
    [
      "Trang Thu & chi **đang phát triển**. Định hướng là một nơi ghi thu, chi và chuyển tiền; hiện trang chỉ giới thiệu phạm vi dự kiến.",
    ],
    [
      "Mỗi lần ghi cần hiểu đó là tiền nhận, tiền tiêu hay chuyển giữa nơi giữ để tránh tính trùng.",
    ],
    [
      term(
        "transfer",
        "Chuyển tiền",
        "Di chuyển tiền giữa hai nơi giữ; về ý nghĩa không tự tạo thu nhập hoặc chi phí. Sổ giao dịch chung cho toàn ứng dụng **chưa được triển khai**.",
      ),
    ],
    [
      task(
        "available",
        "Dùng các chức năng đã có",
        "Khi bạn muốn ghi dữ liệu ngay hôm nay.",
        [
          "Mở Thu nhập để ghi thực nhận cố định hoặc phát sinh.",
          "Mở Chi tiêu để quản lý hũ và thực chi theo tháng.",
          "Giao dịch của Tiết kiệm, Đầu tư và Quỹ an toàn được ghi trong từng trang tương ứng.",
        ],
        "Kết quả: sử dụng được sổ hiện có; dữ liệu giữa các mục không tự liên kết thành ledger chung.",
      ),
    ],
    [
      "Muốn ghi lương đã nhận: dùng Thu nhập. Muốn đối chiếu còn bao nhiêu tiền trong hũ Sinh hoạt: dùng Chi tiêu.",
    ],
    [
      "Các mục mô tả trên trang là dự kiến; chưa có nhập giao dịch chung, mẫu định kỳ hoặc nhập bảng dữ liệu chung để thao tác.",
    ],
  ),
  accounts: article(
    [
      "Trang Tài khoản **đang phát triển**, hướng đến việc biết tiền nằm ở đâu. Hiện chưa có sổ tài khoản chung để đối soát toàn ứng dụng.",
    ],
    [
      "Phân biệt ==mục đích sử dụng với nơi giữ tiền==. Tên ngân hàng không tự cho biết tiền được dành cho việc gì.",
    ],
    [
      term(
        "account",
        "Tài khoản và nơi giữ",
        "Tiền mặt, ví điện tử hoặc ngân hàng là các nơi giữ tiền. Phương thức trong Chi tiêu hiện chỉ là phân loại; ví trong từng mục là sổ độc lập.",
      ),
    ],
    [
      task(
        "available",
        "Theo dõi nơi giữ bằng chức năng hiện có",
        "Khi muốn tổ chức dữ liệu theo nơi tiền đang nằm.",
        [
          "Trong Chi tiêu, dùng Phương thức để phân loại hũ theo nơi chi.",
          "Trong Tiết kiệm/Đầu tư, dùng ví của mục đó; trong Quỹ an toàn, dùng Nơi giữ tiền.",
          "Đối chiếu với app ngân hàng và ghi điều chỉnh phù hợp trong từng sổ.",
        ],
        "Kết quả: nhìn rõ nơi giữ trong phạm vi từng mục, chưa có số dư tài khoản chung tự đồng bộ.",
      ),
    ],
    [
      "Tên Ngân hàng A trong Phương thức của hũ giúp biết nơi dùng để chi. Nó chưa phải tài khoản ngân hàng được kết nối hay số dư tự cập nhật.",
    ],
    [
      "Không cộng máy móc các sổ nếu bạn đã ghi cùng một khoản tiền ở nhiều nơi. Chưa có kết nối ngân hàng hoặc đối soát tự động toàn ứng dụng.",
    ],
  ),
  goals: article(
    [
      "Trang Mục tiêu **đang phát triển**, hướng đến theo dõi khoản tiền cần chuẩn bị và thời hạn cho mục tiêu mua sắm hoặc cuộc sống.",
    ],
    [
      "Bắt đầu từ điều muốn đạt và phần còn thiếu để chuẩn bị từng bước. Phân biệt mong muốn này với dự phòng cho chi phí thiết yếu.",
    ],
    [
      term(
        "goal",
        "Mục tiêu và quỹ an toàn",
        "Mục tiêu là đích tích lũy cho một nhu cầu cụ thể. Quỹ an toàn hiện tập trung biến cố lớn, phát sinh nhỏ và chi thiết yếu biết trước; không thay thế toàn bộ mục tiêu cuộc sống.",
      ),
    ],
    [
      task(
        "available",
        "Chuẩn bị bằng tính năng hiện có",
        "Khi trang Mục tiêu chưa có thao tác tạo mục tiêu.",
        [
          "Dùng Tiết kiệm để ghi nhận tài sản đã dành dụm.",
          "Với khoản chi cần tích lũy theo tháng, có thể dùng hũ Tích lũy trong Chi tiêu.",
          "Dùng Quỹ an toàn khi cần quản lý dự phòng đúng phạm vi ba quỹ.",
        ],
        "Kết quả: theo dõi được khoản dành dụm; chưa có tự liên kết tài sản và tính kế hoạch góp theo hạn ở trang Mục tiêu.",
      ),
    ],
    [
      "Bạn muốn dành tiền cho một chuyến đi: có thể theo dõi khoản tích lũy trong sổ hiện có, còn việc tạo mục tiêu và hạn hoàn thành tại trang này chưa khả dụng.",
    ],
    [
      "Mô tả về tiến độ liên kết và ước tính mức góp trên trang là định hướng, không phải tính năng đã chạy.",
    ],
  ),
  reports: article(
    [
      "Trang Báo cáo chung **đang phát triển**. Hiện báo cáo được cung cấp riêng trong các mục đã triển khai.",
    ],
    [
      "Đọc con số cùng kỳ, phạm vi và nguồn dữ liệu. ==Tổng số dư khác tổng dòng tiền, tiền góp khác lợi nhuận==; chỉ so sánh khi hiểu đang đo gì.",
    ],
    [
      term(
        "scope",
        "Báo cáo theo từng mục",
        "Tổng hợp từ sổ của từng trang theo bộ lọc riêng. Không phải báo cáo tài sản ròng hợp nhất của toàn ứng dụng.",
      ),
      term(
        "balance-flow",
        "Số dư và dòng tiền",
        "Số dư là giá trị tại một thời điểm; dòng tiền là phần vào/ra trong một kỳ. Không cộng số dư cuối từng tháng thành tổng tài sản.",
      ),
    ],
    [
      task(
        "available",
        "Mở báo cáo hiện có",
        "Khi cần thống kê hoặc xuất số liệu.",
        [
          "Vào Thu nhập, Chi tiêu, Tiết kiệm hoặc Đầu tư rồi mở phần Báo cáo.",
          "Chọn kỳ và bộ lọc phù hợp; đọc bảng, biểu đồ và nhãn thiếu dữ liệu/tạm tính.",
          "Xuất bảng dữ liệu ở các mục có nút xuất; dùng Cài đặt cho bản sao lưu toàn bộ dữ liệu.",
        ],
        "Kết quả: có báo cáo trong phạm vi sổ đang xem. Chi tiêu hiện báo cáo tương tác trong năm hiện tại; không suy thành báo cáo chung.",
      ),
    ],
    [
      "Tài sản cuối tháng 1 là ==10.000.000 ₫== và cuối tháng 2 là ==12.000.000 ₫==: tài sản ở cuối tháng 2 là ==12.000.000 ₫==, không phải ==22.000.000 ₫==.",
    ],
    [
      "Chưa có tài sản ròng hoặc báo cáo thu–chi hợp nhất toàn ứng dụng. Một số tiền xuất hiện ở hai sổ không được tự loại trùng.",
    ],
  ),
};

// Browser preferences are separate from financial data and share stable help anchors.
articles.settings.sections
  .find((section) => section.id === "terms")!
  .items!.push(
    term(
      "language",
      "Ngôn ngữ và định dạng",
      "Tiếng Việt là mặc định; English dùng dấu phẩy phân nhóm và dấu chấm thập phân. VND và giờ Việt Nam giữ nguyên. Tên, ghi chú của bạn không bị dịch.",
    ),
  );
articles.settings.sections
  .find((section) => section.id === "tasks")!
  .items!.push(
    task(
      "change-language",
      "Đổi ngôn ngữ",
      "Khi muốn dùng không gian tài chính bằng Tiếng Việt hoặc English.",
      [
        "Chọn Tiếng Việt hoặc English trên thanh đầu trang, hoặc trong Cài đặt → Ngôn ngữ / Language.",
        "Kiểm tra định dạng gợi ý dưới ô tiền: 1.000.000 ₫ trong tiếng Việt hoặc 1,000,000 ₫ trong English.",
        "Nếu bản nháp đang có số chưa hợp lệ khi tab khác đổi ngôn ngữ, sửa theo định dạng được ghi tại ô; nội dung cũ không tự bị diễn giải lại.",
      ],
      "Kết quả: trang chủ, phần minh họa, đăng nhập, giao diện ứng dụng và Trợ giúp theo ngôn ngữ đã chọn, giữ bản nháp và bộ lọc. Lựa chọn lưu trên trình duyệt, không nằm trong bản sao lưu hoặc đồng bộ tài khoản.",
    ),
  );
