export interface ReceiptItem {
  id: string;
  name: string;
  quantity: number;
  totalPrice: number; // total cost for this quantity of the item
}

export interface Guest {
  id: string;
  name: string;
}

export interface ReceiptData {
  items: ReceiptItem[];
  subtotal: number;
  serviceChargePercent: number; // e.g. 10 for 10%
  taxPercent: number; // e.g. 9 for 9% GST
  total: number;
}
