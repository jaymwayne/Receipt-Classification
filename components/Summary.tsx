import React, { useMemo } from 'react';
import { ReceiptData, Assignments, PersonSummary } from '../types';

interface SummaryProps {
  receiptData: ReceiptData | null;
  assignments: Assignments;
}

export const Summary: React.FC<SummaryProps> = ({ receiptData, assignments }) => {
  const summaryData = useMemo(() => {
    if (!receiptData) return [];

    const peopleMap: { [name: string]: PersonSummary } = {};
    
    // Calculate raw item totals per person
    receiptData.items.forEach(item => {
      const itemAssigns = assignments[item.id] || {};
      const people = Object.keys(itemAssigns);
      
      people.forEach(person => {
        const share = itemAssigns[person]; // e.g. 0.5
        const cost = item.price * share;
        
        if (!peopleMap[person]) {
          peopleMap[person] = {
            name: person,
            itemsTotal: 0,
            taxShare: 0,
            tipShare: 0,
            total: 0
          };
        }
        peopleMap[person].itemsTotal += cost;
      });
    });

    // Calculate proportional tax and tip
    // We base tax/tip on the ratio of (person's items total) / (subtotal of assigned items)
    // NOTE: If not all items are assigned, the tax/tip for unassigned items is "left over".
    // For simplicity, we'll distribute tax/tip based on the ratio of the person's assigned share vs Total Assigned Share.
    // Or strictly proportional to their item cost vs Receipt Subtotal (assuming receipt subtotal covers all items).
    
    const peopleList = Object.values(peopleMap);
    
    // Prevent divide by zero if subtotal is missing or 0
    const safeSubtotal = receiptData.subtotal || 1; 

    peopleList.forEach(person => {
        // Calculate tax/tip proportional to their share of the subtotal
        const ratio = person.itemsTotal / safeSubtotal;
        person.taxShare = receiptData.tax * ratio;
        person.tipShare = receiptData.tip * ratio;
        person.total = person.itemsTotal + person.taxShare + person.tipShare;
    });

    return peopleList.sort((a, b) => b.total - a.total);
  }, [receiptData, assignments]);

  if (!receiptData || summaryData.length === 0) return null;

  return (
    <div className="bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] p-4">
      <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Live Split Summary</h3>
      <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-hide">
        {summaryData.map((person) => (
          <div key={person.name} className="flex-shrink-0 bg-gray-50 rounded-xl p-3 border border-gray-200 min-w-[140px]">
            <div className="font-semibold text-gray-900 truncate mb-1">{person.name}</div>
            <div className="text-xs text-gray-500 flex justify-between">
              <span>Items:</span>
              <span>${person.itemsTotal.toFixed(2)}</span>
            </div>
            <div className="text-xs text-gray-500 flex justify-between">
              <span>Tax/Tip:</span>
              <span>${(person.taxShare + person.tipShare).toFixed(2)}</span>
            </div>
            <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between items-center">
              <span className="text-xs font-bold text-gray-700">Total</span>
              <span className="text-sm font-bold text-indigo-600">${person.total.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
