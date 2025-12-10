export interface ReceiptItem {
  id: string; // Unique ID (often just index stringified)
  name: string;
  price: number;
}

export interface ReceiptData {
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
}

// Map of Item ID -> { Person Name -> Share Fraction (0-1) }
export interface Assignments {
  [itemId: string]: {
    [person: string]: number;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isThinking?: boolean;
}

export interface PersonSummary {
  name: string;
  itemsTotal: number;
  taxShare: number;
  tipShare: number;
  total: number;
}
