export const paymentBrands = [
  { key: "hsbc", name: "HSBC", file: "hsbc.svg", aliases: ["hsbc"] },
  { key: "momo", name: "MoMo", file: "momo.png", aliases: ["momo", "ví momo"] },
  { key: "timo", name: "Timo", file: "timo.svg", aliases: ["timo"] },
  {
    key: "shopeepay",
    name: "ShopeePay",
    file: "shopeepay.svg",
    aliases: ["shopeepay", "airpay"],
  },
  {
    key: "techcombank",
    name: "Techcombank",
    file: "techcombank.svg",
    aliases: ["techcombank", "tcb"],
  },
  { key: "vib", name: "VIB", file: "vib.png", aliases: ["vib"] },
  {
    key: "vietcombank",
    name: "Vietcombank",
    file: "vietcombank.png",
    aliases: ["vietcombank", "vcb"],
  },
  { key: "bidv", name: "BIDV", file: "bidv.png", aliases: ["bidv"] },
  {
    key: "vietinbank",
    name: "VietinBank",
    file: "vietinbank.png",
    aliases: ["vietinbank", "ctg"],
  },
  {
    key: "mb",
    name: "MB",
    file: "mb.svg",
    aliases: ["mb", "mbbank", "mb bank"],
  },
  { key: "acb", name: "ACB", file: "acb.svg", aliases: ["acb"] },
  {
    key: "vpbank",
    name: "VPBank",
    file: "vpbank.ico",
    aliases: ["vpbank", "vp bank"],
  },
  {
    key: "zalopay",
    name: "ZaloPay",
    file: "zalopay.svg",
    aliases: ["zalopay", "zalo pay"],
  },
] as const;
export const brandKeys = paymentBrands.map((brand) => brand.key) as [
  string,
  ...string[],
];
export const labelIconKeys = [
  "wallet",
  "bank",
  "cash",
  "card",
  "family",
  "personal",
  "home",
  "work",
  "health",
  "education",
  "travel",
  "gift",
  "shopping",
  "food",
  "savings",
  "other",
] as const;
export type LabelIconKey = (typeof labelIconKeys)[number];
export function suggestedBrand(name: string) {
  const value = name.trim().toLocaleLowerCase("vi");
  return paymentBrands.find((brand) =>
    brand.aliases.some((alias) => alias === value),
  );
}
