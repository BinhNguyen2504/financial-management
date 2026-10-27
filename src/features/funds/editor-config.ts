import { type FundId, type FundTransaction } from "@/domain/funds/schema";
import type { FundView } from "@/domain/funds/types";

export type EditorMode =
  | { type: "configure" }
  | { type: "location"; id?: string }
  | { type: "transaction"; fundId?: FundId; kind?: FundTransaction["kind"] }
  | { type: "revise" | "cancel"; transaction: FundTransaction };
export type Props = {
  mode: EditorMode;
  view: FundView;
  refresh: () => Promise<FundView>;
  onSaved: () => void;
  onClose: () => void;
  onAuthLost: () => void;
};
