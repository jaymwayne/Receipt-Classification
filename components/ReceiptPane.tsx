import React, { useRef, useState } from 'react';
import { ReceiptData, Assignments } from '../types';
import { Upload, FileText, CheckCircle2, DollarSign } from 'lucide-react';
import { parseReceiptImage } from '../services/geminiService';

interface ReceiptPaneProps {
  receiptData: ReceiptData | null;
  setReceiptData: (data: ReceiptData) => void;
  assignments: Assignments;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const ReceiptPane: React.FC<ReceiptPaneProps> = ({
  receiptData,
  setReceiptData,
  assignments,
  isLoading,
  setIsLoading,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target?.result as string;
        // Strip the data:image/xyz;base64, prefix
        const base64Content = base64Data.split(',')[1];
        const mimeType = file.type;

        try {
          const data = await parseReceiptImage(base64Content, mimeType);
          setReceiptData(data);
        } catch (err) {
          setError("Failed to parse receipt. Please try a clearer image.");
        } finally {
          setIsLoading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (e) {
      setError("Error reading file.");
      setIsLoading(false);
    }
  };

  const triggerUpload = () => fileInputRef.current?.click();

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gray-50 p-6 border-r border-gray-200">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-gray-600 font-medium">Analyzing receipt with Gemini...</p>
      </div>
    );
  }

  if (!receiptData) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gray-50 p-8 border-r border-gray-200 text-center">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
          <FileText className="w-16 h-16 text-indigo-500 mx-auto mb-2" />
          <h2 className="text-xl font-semibold text-gray-800">Upload Receipt</h2>
        </div>
        <p className="text-gray-500 mb-8 max-w-sm">
          Take a photo or upload a receipt image. We'll extract the items so you can split the bill.
        </p>
        <button
          onClick={triggerUpload}
          className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-full font-semibold transition-all shadow-md hover:shadow-lg"
        >
          <Upload className="w-5 h-5" />
          <span>Upload Image</span>
        </button>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleFileUpload}
        />
        {error && <p className="mt-4 text-red-500 text-sm">{error}</p>}
      </div>
    );
  }

  // Helper to get initials for avatars
  const getInitials = (name: string) => name.substring(0, 2).toUpperCase();

  // Helper to generate a consistent color for a name
  const stringToColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00ffffff).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
  };

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
        <div>
           <h2 className="font-bold text-lg text-gray-800">Receipt Details</h2>
           <p className="text-xs text-gray-500">
             Subtotal: ${receiptData.subtotal.toFixed(2)} • Tax: ${receiptData.tax.toFixed(2)} • Total: ${receiptData.total.toFixed(2)}
           </p>
        </div>
        <button onClick={triggerUpload} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
          New Receipt
        </button>
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {receiptData.items.map((item) => {
          const itemAssignments = assignments[item.id] || {};
          const people = Object.keys(itemAssignments);
          const isAssigned = people.length > 0;

          return (
            <div
              key={item.id}
              className={`p-3 rounded-xl border transition-all ${
                isAssigned ? 'border-indigo-100 bg-indigo-50/30' : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="font-medium text-gray-800 text-sm">{item.name}</span>
                <span className="font-bold text-gray-900 text-sm">${item.price.toFixed(2)}</span>
              </div>
              
              <div className="flex items-center justify-between min-h-[24px]">
                {isAssigned ? (
                  <div className="flex -space-x-2 overflow-hidden">
                    {people.map((person) => (
                      <div
                        key={person}
                        className="inline-flex items-center justify-center w-6 h-6 rounded-full ring-2 ring-white text-[10px] font-bold text-white shadow-sm"
                        style={{ backgroundColor: stringToColor(person) }}
                        title={`${person} (${Math.round(itemAssignments[person] * 100)}%)`}
                      >
                        {getInitials(person)}
                      </div>
                    ))}
                    <span className="ml-3 text-xs text-indigo-600 font-medium self-center">
                      {people.join(', ')}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400 italic flex items-center">
                    <span className="w-2 h-2 rounded-full bg-gray-300 mr-2"></span>
                    Unassigned
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-4 bg-gray-50 border-t border-gray-200">
         <div className="flex justify-between items-center text-sm font-medium text-gray-600">
            <span>Subtotal</span>
            <span>${receiptData.subtotal.toFixed(2)}</span>
         </div>
         <div className="flex justify-between items-center text-sm font-medium text-gray-600 mt-1">
            <span>Tax</span>
            <span>${receiptData.tax.toFixed(2)}</span>
         </div>
         <div className="flex justify-between items-center text-sm font-medium text-gray-600 mt-1">
            <span>Tip</span>
            <span>${receiptData.tip.toFixed(2)}</span>
         </div>
         <div className="flex justify-between items-center text-lg font-bold text-gray-900 mt-3 pt-3 border-t border-gray-200">
            <span>Total</span>
            <span>${receiptData.total.toFixed(2)}</span>
         </div>
      </div>
    </div>
  );
};
