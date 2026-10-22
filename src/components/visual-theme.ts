export const visualThemeKeys = [
  "forest",
  "water",
  "gold",
  "fire",
  "earth",
] as const;
export type VisualTheme = (typeof visualThemeKeys)[number];
export type DisplayMode = "light" | "dark" | "system";
export const VISUAL_THEME_KEY = "fm-visual-theme";

export function visualTheme(value: string | null): VisualTheme {
  return visualThemeKeys.find((key) => key === value) ?? "forest";
}
export function displayMode(value: string | null): DisplayMode {
  return value === "light" || value === "dark" ? value : "system";
}

const commonNotes = [
  "Mỗi khoản để dành là một chút bình yên cho ngày mai.",
  "Bạn có thể bắt đầu nhỏ, rồi lớn lên theo nhịp của mình.",
  "Một lần nhìn lại hôm nay, một bước chủ động hơn ngày mai.",
  "Chăm sóc tài chính cũng là một cách chăm sóc bản thân.",
  "Không cần vội. Những thói quen nhỏ cần thời gian để nảy mầm.",
  "Dành chỗ cho điều cần thiết và cả những niềm vui vừa đủ.",
  "Một tháng chưa như ý cũng là cơ hội để hiểu mình hơn.",
];

export const visualThemes = {
  forest: {
    name: "Khu vườn",
    colorName: "Xanh lục",
    description: "Tán lá, mầm xanh và những điều lớn lên từng ngày.",
    browserColors: { light: "#F7F3EB", dark: "#1F2520" },
    copy: {
      fundsEyebrow: "VƯỜN AN TOÀN",
      fundsLoading: "Đang mở Vườn an toàn…",
      emergency: "Gốc rễ vững vàng",
      rainy_day: "Một khoảng trời được che chở",
      sinking: "Bắc cầu cho những khoản đã biết",
      nextFund: "Tiếp tục chăm sóc",
      storyNote: "Từng bước vun đắp.",
      offline:
        "Bạn đang mất kết nối. Khi có mạng trở lại, các hũ của bạn sẽ sẵn sàng để tiếp tục chăm sóc.",
      configureFunds: "Thiết lập Vườn an toàn",
      previewFunds: "Từng bước vun đắp sự an tâm.",
      previewSavings: "Những điều đang lớn lên.",
      overviewLoading: "Đang chăm chút bức tranh tháng này…",
      overviewJars: "Những hũ đang chăm",
      accumulation: "Từng chút vun đắp",
      developing: "Đang vun đắp",
    },
    notes: commonNotes,
  },
  water: {
    name: "Dòng nước",
    colorName: "Xanh lam",
    description: "Dòng suối dịu, giọt nhỏ và khoảng nước bình yên.",
    browserColors: { light: "#F2F7FA", dark: "#101D27" },
    copy: {
      fundsEyebrow: "NGUỒN NƯỚC AN TÂM",
      fundsLoading: "Đang mở nguồn dự phòng…",
      emergency: "Nguồn dự trữ vững vàng",
      rainy_day: "Một mái che qua ngày mưa",
      sinking: "Từng bước đưa khoản dự phòng về bến",
      nextFund: "Tiếp tục tích lũy cho",
      storyNote: "Từng giọt tích thành dòng.",
      offline:
        "Bạn đang mất kết nối. Khi có mạng trở lại, bạn có thể tiếp tục dòng tích lũy của mình.",
      configureFunds: "Thiết lập nguồn dự phòng",
      previewFunds: "Từng giọt tích lũy sự an tâm.",
      previewSavings: "Từng dòng tích lũy đang đầy lên.",
      overviewLoading: "Đang nối lại dòng tiền tháng này…",
      overviewJars: "Những hũ đang theo dõi",
      accumulation: "Từng giọt tích lũy",
      developing: "Đang khơi dòng",
    },
    notes: commonNotes.map((note, index) =>
      index === 4
        ? "Không cần vội. Từng giọt nhỏ sẽ tích thành một dòng nước."
        : note,
    ),
  },
  gold: {
    name: "Kim ngân",
    colorName: "Vàng",
    description: "Đồng xu, ánh kim và những khoản tích lũy bền bỉ.",
    browserColors: { light: "#FAF6EA", dark: "#241E13" },
    copy: {
      fundsEyebrow: "KHO TÍCH LŨY AN TÂM",
      fundsLoading: "Đang mở kho dự phòng…",
      emergency: "Kho dự trữ vững vàng",
      rainy_day: "Một khoản dành sẵn cho ngày cần",
      sinking: "Từng đồng dành cho những khoản đã biết",
      nextFund: "Tiếp tục tích lũy cho",
      storyNote: "Từng đồng góp nên sự an tâm.",
      offline:
        "Bạn đang mất kết nối. Khi có mạng trở lại, bạn có thể tiếp tục vun đầy kho tích lũy của mình.",
      configureFunds: "Thiết lập kho dự phòng",
      previewFunds: "Từng đồng tích lũy sự an tâm.",
      previewSavings: "Những khoản để dành đang đầy lên.",
      overviewLoading: "Đang tổng hợp từng khoản tháng này…",
      overviewJars: "Những hũ đang tích lũy",
      accumulation: "Từng đồng tích lũy",
      developing: "Đang tích lũy",
    },
    notes: commonNotes.map((note, index) =>
      index === 4
        ? "Không cần vội. Từng đồng để dành góp nên một khoản vững vàng."
        : note,
    ),
  },
  fire: {
    name: "Lửa ấm",
    colorName: "Đỏ",
    description: "Đốm lửa, đèn lồng và hơi ấm từ từng khoản để dành.",
    browserColors: { light: "#FBF4F0", dark: "#291B1A" },
    copy: {
      fundsEyebrow: "GIỮ LỬA AN TÂM",
      fundsLoading: "Đang mở khoảng ấm dự phòng…",
      emergency: "Giữ một nguồn ấm vững vàng",
      rainy_day: "Một ngọn đèn qua ngày trở gió",
      sinking: "Thắp sáng những khoản đã biết",
      nextFund: "Tiếp tục tích lũy cho",
      storyNote: "Từng chút góp nên hơi ấm.",
      offline:
        "Bạn đang mất kết nối. Khi có mạng trở lại, bạn có thể tiếp tục giữ lửa cho những khoản tích lũy của mình.",
      configureFunds: "Thiết lập khoảng ấm dự phòng",
      previewFunds: "Từng chút giữ ấm sự an tâm.",
      previewSavings: "Những khoản để dành đang giữ lửa.",
      overviewLoading: "Đang gom lại bức tranh tháng này…",
      overviewJars: "Những hũ đang giữ lửa",
      accumulation: "Từng chút giữ lửa",
      developing: "Đang thắp sáng",
    },
    notes: commonNotes.map((note, index) =>
      index === 4
        ? "Không cần vội. Từng chút để dành giữ một ngọn lửa bền lâu."
        : note,
    ),
  },
  earth: {
    name: "Đất lành",
    colorName: "Nâu",
    description: "Tầng đất, đồi núi và những bước tích lũy vững vàng.",
    browserColors: { light: "#F8F4ED", dark: "#241F1A" },
    copy: {
      fundsEyebrow: "NỀN TẢNG AN TÂM",
      fundsLoading: "Đang mở nền tảng dự phòng…",
      emergency: "Nền móng vững vàng",
      rainy_day: "Một mái trú qua ngày trở gió",
      sinking: "Từng bậc đến những khoản đã biết",
      nextFund: "Tiếp tục tích lũy cho",
      storyNote: "Từng lớp bồi nên nền vững.",
      offline:
        "Bạn đang mất kết nối. Khi có mạng trở lại, bạn có thể tiếp tục bồi đắp nền tảng tích lũy của mình.",
      configureFunds: "Thiết lập nền tảng dự phòng",
      previewFunds: "Từng lớp bồi đắp sự an tâm.",
      previewSavings: "Những khoản để dành đang vững lên.",
      overviewLoading: "Đang ghép lại bức tranh tháng này…",
      overviewJars: "Những hũ đang bồi đắp",
      accumulation: "Từng lớp bồi đắp",
      developing: "Đang xây nền",
    },
    notes: commonNotes.map((note, index) =>
      index === 4
        ? "Không cần vội. Từng lớp nhỏ bồi nên một nền tảng vững vàng."
        : note,
    ),
  },
} as const;

export type ThemeCopyKey = keyof typeof visualThemes.forest.copy;
