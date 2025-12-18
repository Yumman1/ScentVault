import React, { useRef } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { Button } from '../ui/Button';
import { Database, Download, Upload, Trash2, AlertTriangle, FileJson, CheckCircle } from 'lucide-react';

export const DatabaseSettings = () => {
  const { exportDatabase, importDatabase, resetDatabase, perfumes, gateInLogs, gateOutLogs, transferLogs } = useInventory();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalRecords = perfumes.length + gateInLogs.length + gateOutLogs.length + transferLogs.length;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (window.confirm("Importing a database will overwrite current local data. Continue?")) {
        importDatabase(content);
      }
    };
    reader.readAsText(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleReset = () => {
    if (window.confirm("DANGER: This will permanently delete all data in your local system. Please make sure you have a backup. Continue?")) {
        const confirmCode = window.prompt("Type 'DELETE' to confirm full system wipe:");
        if (confirmCode === 'DELETE') {
            resetDatabase();
            alert("System Reset Complete.");
        } else {
            alert("Reset cancelled. Confirmation code was incorrect.");
        }
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-full">
                <Database size={24} />
            </div>
            <div>
                <h3 className="text-xl font-bold text-gray-800">Local Database Management</h3>
                <p className="text-sm text-gray-500">Backup, Restore, and Manage your system data.</p>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
            {/* Backup Section */}
            <div className="p-5 border border-gray-100 rounded-xl bg-gray-50 flex flex-col justify-between">
                <div>
                    <h4 className="font-bold text-gray-800 flex items-center gap-2 mb-2">
                        <Download size={18} className="text-blue-500" />
                        Export Backup
                    </h4>
                    <p className="text-xs text-gray-500 leading-relaxed mb-4">
                        Download your entire system state into a portable JSON file. This includes all perfumes, transactions, master data, and users.
                    </p>
                    <div className="flex items-center gap-4 py-3 px-4 bg-white rounded border border-gray-200 mb-6">
                        <FileJson size={32} className="text-gray-400" />
                        <div>
                            <p className="text-xs font-bold text-gray-700">Backup File</p>
                            <p className="text-[10px] text-gray-400 uppercase tracking-tighter">JSON Structure • {totalRecords} Total Records</p>
                        </div>
                    </div>
                </div>
                <Button onClick={exportDatabase} className="w-full flex items-center justify-center gap-2">
                    <Download size={16} /> Download Database File
                </Button>
            </div>

            {/* Restore Section */}
            <div className="p-5 border border-gray-100 rounded-xl bg-gray-50 flex flex-col justify-between">
                <div>
                    <h4 className="font-bold text-gray-800 flex items-center gap-2 mb-2">
                        <Upload size={18} className="text-green-500" />
                        Import / Restore
                    </h4>
                    <p className="text-xs text-gray-500 leading-relaxed mb-4">
                        Upload a previously exported ScentVault backup file to restore your data. Note: This will replace all your current data.
                    </p>
                    <div className="mb-6">
                        <input 
                            type="file" 
                            accept=".json" 
                            className="hidden" 
                            ref={fileInputRef} 
                            onChange={handleFileUpload} 
                        />
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="cursor-pointer border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-indigo-400 hover:bg-white transition-all text-center"
                        >
                            <Upload size={24} className="mx-auto text-gray-300 mb-2" />
                            <p className="text-xs font-medium text-gray-500">Click to upload .json file</p>
                        </div>
                    </div>
                </div>
                <p className="text-[10px] text-center text-gray-400 italic">Only upload files generated by ScentVault.</p>
            </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 p-6 rounded-lg shadow-sm border border-red-100">
        <h3 className="text-lg font-bold text-red-800 flex items-center gap-2 mb-4">
            <AlertTriangle size={20} />
            Danger Zone
        </h3>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <p className="text-sm font-bold text-red-900">Wipe System Database</p>
                <p className="text-xs text-red-700">Permanently delete all data from this browser's storage. This cannot be undone.</p>
            </div>
            <Button variant="outline" onClick={handleReset} className="border-red-300 text-red-600 hover:bg-red-100 flex items-center gap-2">
                <Trash2 size={16} /> Reset All Data
            </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-400 justify-center">
          <CheckCircle size={14} className="text-green-500" />
          <span>ScentVault Data Persistence is Active (Local Browser Storage)</span>
      </div>
    </div>
  );
};
