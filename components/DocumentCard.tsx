// components/DocumentCard.tsx
import React, { useState } from 'react';
import { Document } from '../types/document.types';
import { formatDate, formatFileSize, getFileIcon } from '../utils/formatters';
import StatusBadge from './StatusBadge';

interface DocumentCardProps {
  document: Document;
  onDelete: (documentId: string) => void;
  onRetry?: (documentId: string) => void;
}

const DocumentCard: React.FC<DocumentCardProps> = ({ document, onDelete, onRetry }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete "${document.originalFilename}"?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await onDelete(document._id);
    } catch (error) {
      console.error('Delete failed:', error);
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl hover:shadow-lg transition-all duration-200 overflow-hidden">
      {/* Progress bar for uploading/processing */}
      {(document.uploadStatus === 'uploading' || document.uploadStatus === 'processing') && (
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
            style={{ width: `${document.progress}%` }}
          />
        </div>
      )}

      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* File Icon */}
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center text-2xl">
              {getFileIcon(document.mimeType)}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* File name & status */}
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-gray-900 truncate" title={document.originalFilename}>
                  {document.originalFilename}
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {document.storeDisplayName || document.storeName}
                </p>
              </div>
              <StatusBadge status={document.uploadStatus} progress={document.progress} size="sm" />
            </div>

            {/* File info */}
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                {formatFileSize(document.fileSize)}
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {formatDate(document.queuedAt || document.createdAt)}
              </span>
            </div>

            {/* Error message */}
            {document.uploadStatus === 'failed' && document.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800">Upload Failed</p>
                    <p className="text-sm text-red-700 mt-1">{document.error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                {showDetails ? 'Hide' : 'Show'} Details
                <svg
                  className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <div className="flex-1" />

              {document.uploadStatus === 'failed' && onRetry && (
                <button
                  onClick={() => onRetry(document._id)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium px-3 py-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  Retry
                </button>
              )}

              <button
                onClick={handleDelete}
                disabled={isDeleting || document.uploadStatus === 'uploading'}
                className="text-sm text-red-600 hover:text-red-700 font-medium px-3 py-1.5 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                {isDeleting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Deleting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Details Panel */}
        {showDetails && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="font-medium text-gray-500">Document ID</dt>
                <dd className="text-gray-900 font-mono text-xs mt-1">{document._id}</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-500">MIME Type</dt>
                <dd className="text-gray-900 mt-1">{document.mimeType}</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-500">Status</dt>
                <dd className="text-gray-900 mt-1 capitalize">{document.uploadStatus}</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-500">Progress</dt>
                <dd className="text-gray-900 mt-1">{document.progress}%</dd>
              </div>
              {document.processedAt && (
                <div>
                  <dt className="font-medium text-gray-500">Processed At</dt>
                  <dd className="text-gray-900 mt-1">{new Date(document.processedAt).toLocaleString()}</dd>
                </div>
              )}
              {document.documentName && (
                <div className="col-span-2">
                  <dt className="font-medium text-gray-500">Gemini Path</dt>
                  <dd className="text-gray-900 font-mono text-xs mt-1 break-all">{document.documentName}</dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </div>
    </div>
  );
};


export default DocumentCard;