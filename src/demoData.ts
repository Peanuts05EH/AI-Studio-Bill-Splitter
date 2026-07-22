import { ReceiptData, Guest } from "./types";

export const DEMO_GUESTS: Guest[] = [
  { id: "guest_1", name: "Marco" },
  { id: "guest_2", name: "Chloe" },
  { id: "guest_3", name: "Jia Rui" },
  { id: "guest_4", name: "Alessia" },
  { id: "guest_5", name: "Shawn" },
];

export const DEMO_RECEIPT: ReceiptData = {
  items: [
    { id: "item_1", name: "Burrata Pugliese", quantity: 1, totalPrice: 28.00 },
    { id: "item_2", name: "Calamari Fritti", quantity: 1, totalPrice: 24.00 },
    { id: "item_3", name: "Pizza Margherita", quantity: 1, totalPrice: 26.00 },
    { id: "item_4", name: "Tagliatelle Al Tartufo", quantity: 1, totalPrice: 36.00 },
    { id: "item_5", name: "Risotto Ai Funghi", quantity: 1, totalPrice: 32.00 },
    { id: "item_6", name: "Tiramisu Classico", quantity: 1, totalPrice: 16.00 },
    { id: "item_7", name: "Acqua Panna (750ml)", quantity: 2, totalPrice: 18.00 },
    { id: "item_8", name: "Glass Chianti Classico", quantity: 2, totalPrice: 38.00 },
    { id: "item_9", name: "Aperol Spritz", quantity: 1, totalPrice: 16.00 },
  ],
  subtotal: 234.00,
  serviceChargePercent: 10,
  taxPercent: 9,
  total: 280.57,
};

// Item ID to guest IDs assignment mapping
export const DEMO_ASSIGNMENTS: Record<string, string[]> = {
  item_1: ["guest_2", "guest_4"],                  // Burrata Pugliese: Shared between Chloe and Alessia
  item_2: ["guest_1", "guest_3", "guest_5"],         // Calamari Fritti: Shared between Marco, Jia Rui, and Shawn
  item_3: ["guest_1", "guest_2"],                  // Pizza Margherita: Shared between Marco and Chloe
  item_4: ["guest_4"],                           // Tagliatelle Al Tartufo: Ordered individually by Alessia
  item_5: ["guest_3"],                           // Risotto Ai Funghi: Ordered individually by Jia Rui
  item_6: ["guest_1", "guest_2", "guest_3", "guest_4", "guest_5"], // Tiramisu Classico: Shared by all 5 guests
  item_7: ["guest_1", "guest_2", "guest_3", "guest_4", "guest_5"], // Acqua Panna (750ml): Shared among the whole table
  item_8: ["guest_1", "guest_4"],                  // Glass Chianti Classico: One for Marco, one for Alessia
  item_9: ["guest_2"],                           // Aperol Spritz: Ordered by Chloe
};
