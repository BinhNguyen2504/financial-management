let tabId: string | undefined;
function currentTab() {
  return (tabId ??= crypto.randomUUID());
}

export function publishFinancialReset(ownerId: string) {
  if (typeof BroadcastChannel === "undefined") return;
  const channel = new BroadcastChannel("fm-financial-reset");
  channel.postMessage({ ownerId, sourceTabId: currentTab() });
  channel.close();
}

export function subscribeFinancialReset(
  ownerId: string | undefined,
  notify: () => void,
) {
  if (!ownerId || typeof BroadcastChannel === "undefined") return;
  const ownTab = currentTab();
  const channel = new BroadcastChannel("fm-financial-reset");
  channel.onmessage = (event) => {
    if (event.data?.ownerId === ownerId && event.data.sourceTabId !== ownTab)
      notify();
  };
  return () => channel.close();
}
