export type PurchaseAccessState = {
  paid: boolean;
  pending: boolean;
};

export type PurchaseRowLike = {
  status?: string | null;
};

export function getPurchaseAccessState(rows: PurchaseRowLike[] = []): PurchaseAccessState {
  return {
    paid: rows.some((row) => row.status === "paid"),
    pending: rows.some((row) => row.status === "pending"),
  };
}

export function buildWhatsAppPurchaseMessage({
  softwareName,
  version,
  price,
  currency,
  customerName,
}: {
  softwareName: string;
  version: string;
  price: number;
  currency: string;
  customerName: string;
}) {
  const formattedPrice = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(price);

  return `Hello CodeMarket, I would like to buy ${softwareName} (version ${version}) for ${formattedPrice} ${currency}. My name is ${customerName}.`;
}
