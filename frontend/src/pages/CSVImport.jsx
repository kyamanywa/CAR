import { useState } from 'react';
import { fetchWithAuth } from '../api';
import { Upload, Download, CheckCircle, XCircle, AlertCircle, FileText } from 'lucide-react';

export default function CSVImport() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setResult(null);
    } else {
      alert('Please select a valid CSV file');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert('Please select a file first');
      return;
    }

    setUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:3000/api/csv/import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: data.message,
          inserted: data.inserted,
          errors: data.errors,
          error_details: data.error_details
        });
      } else {
        setResult({
          success: false,
          message: data.error,
          errors: data.errors,
          error_details: data.error_details || []
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Upload failed: ' + error.message
      });
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/csv/template', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'vehicle_import_template.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      alert('Failed to download template');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">📊 CSV Bulk Import</h1>
        <p className="text-gray-500">Upload vehicles from CSV file</p>
      </div>

      <div className="card">
        <h2 className="text-lg font-bold mb-4">Import Instructions</h2>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-blue-900 mb-2">Required Fields:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>chassis_number</strong> - Unique vehicle identifier</li>
            <li>• <strong>make</strong> - Vehicle manufacturer (e.g., Toyota, Honda)</li>
            <li>• <strong>model</strong> - Vehicle model (e.g., Land Cruiser, Civic)</li>
            <li>• <strong>year</strong> - Manufacturing year (1900-2026)</li>
            <li>• <strong>purchase_price_usd</strong> - Purchase price in USD</li>
          </ul>
          
          <h3 className="font-medium text-blue-900 mt-4 mb-2">Optional Fields:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• color, engine_cc, mileage, fuel_type, transmission, body_type, quantity</li>
          </ul>
        </div>

        <button
          onClick={downloadTemplate}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 mb-6"
        >
          <Download className="w-5 h-5" />
          Download CSV Template
        </button>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
            id="csv-upload"
          />
          <label htmlFor="csv-upload" className="cursor-pointer">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-700 font-medium mb-2">
              {file ? file.name : 'Click to upload CSV file'}
            </p>
            <p className="text-sm text-gray-500">
              or drag and drop your CSV file here
            </p>
          </label>
        </div>

        {file && (
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full mt-6 bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {uploading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Processing...
              </span>
            ) : (
              `Upload and Import`
            )}
          </button>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className={`card ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-start gap-3">
            {result.success ? (
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
            ) : (
              <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
            )}
            <div className="flex-1">
              <h3 className={`font-bold text-lg mb-2 ${result.success ? 'text-green-900' : 'text-red-900'}`}>
                {result.success ? 'Import Successful!' : 'Import Failed'}
              </h3>
              <p className={result.success ? 'text-green-800' : 'text-red-800'}>
                {result.message}
              </p>
              
              {result.inserted > 0 && (
                <p className="text-green-800 mt-2">
                  ✅ {result.inserted} vehicles imported successfully
                </p>
              )}
              
              {result.errors > 0 && (
                <div className="mt-4">
                  <p className="text-red-800 font-medium mb-2">
                    ❌ {result.errors} error(s) found:
                  </p>
                  <div className="max-h-60 overflow-y-auto">
                    {result.error_details?.map((err, idx) => (
                      <div key={idx} className="bg-white border border-red-200 rounded p-3 mb-2 text-sm">
                        <p className="font-medium text-red-900">Line {err.line}: {err.error}</p>
                        <pre className="text-gray-700 text-xs mt-1 overflow-x-auto">
                          {JSON.stringify(err.data, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
