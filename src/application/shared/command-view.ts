/** HTTP presentation options never participate in command fingerprints/receipts. */
export interface CommandViewOptions {
  view?: boolean;
  year?: number;
  asOf?: string;
}
