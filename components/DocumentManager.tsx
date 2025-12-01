

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useWebSocket } from '../hooks/websocket';
import {
  getAllManagedDocuments,
  getDocumentStats,
  filterDocuments,
  getFilterOptions,
  bulkDeleteDocuments,
  exportDocumentsAsCSV,
  downloadCSV,
  hasNewerVersion,
  formatFileSize,
  formatDate,
  validateDocumentMetadata,
  ManagedDocument,
  DocumentFilter,
  DocumentStats,
} from '../services/documentManagementService';
import {
  listRagStores,
  createRagStore,
  deleteDocument,
  uploadDocument,
  checkHealth,
  getApiErrorDetails,
} from '../services/api.services';
import { RagStore, CustomMetadata } from '../types';

// Icons (same as before)
const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const UploadIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

const RefreshIcon = ({ spinning = false }: { spinning?: boolean }) => (
  <svg className={`w-5 h-5 ${spinning ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const ChartIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

// Upload Modal Component with Store Confirmation
const UploadModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userStore: RagStore | null;
  onUpload: (file: File, metadata: CustomMetadata[]) => Promise<void>;
}> = ({ isOpen, onClose, userId, userStore, onUpload }) => {
  const [file, setFile] = useState<File | null>(null);
  const [version, setVersion] = useState('1.0.0');
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !userStore) return;

    setUploading(true);
    setError('');

    try {
      const metadata: CustomMetadata[] = [
        { key: 'version', stringValue: version },
        { key: 'notes', stringValue: notes || 'No notes provided' },
        { key: 'uploadedBy', stringValue: userId },
      ];

      if (category) {
        metadata.push({ key: 'category', stringValue: category });
      }

      if (tags) {
        metadata.push({ key: 'tags', stringValue: tags });
      }

      // Validate metadata
      const validation = validateDocumentMetadata(metadata);
      if (!validation.valid) {
        setError(validation.errors.join(', '));
        return;
      }

      await onUpload(file, metadata);

      // Reset form
      setFile(null);
      setVersion('1.0.0');
      setNotes('');
      setCategory('');
      setTags('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Upload Document</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={uploading}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Storage Location Info - User can see but not change */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-1">Upload Location</h3>
                <p className="text-sm text-blue-800 mb-2">
                  Your document will be uploaded to your personal storage:
                </p>
                <div className="bg-white rounded-lg px-3 py-2 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{userStore?.displayName || 'Loading...'}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{userStore?.name || ''}</p>
                    </div>
                    <CheckIcon />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* File Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              File <span className="text-red-500">*</span>
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
                id="file-upload"
                disabled={uploading}
                accept=".pdf,.txt,.doc,.docx,.csv,.json"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                {file ? (
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-gray-700 font-medium">{file.name}</span>
                    <span className="text-gray-500 text-sm">({formatFileSize(file.size)})</span>
                  </div>
                ) : (
                  <>
                    <UploadIcon />
                    <p className="mt-2 text-sm text-gray-600">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      PDF, TXT, DOC, DOCX, CSV, JSON (max 100MB)
                    </p>
                  </>
                )}
              </label>
            </div>
          </div>

          {/* Version */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Version <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="e.g., 1.0.0"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              required
              disabled={uploading}
              pattern="^\d+(\.\d+)*$"
              title="Version must be in format: X.Y.Z (e.g., 1.0.0)"
            />
            <p className="text-xs text-gray-500 mt-1">Format: X.Y.Z (e.g., 2.1.0)</p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this document..."
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={uploading}
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., Technical Documentation"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              disabled={uploading}
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., manual, guide, api (comma-separated)"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={uploading}
            />
            <p className="text-xs text-gray-500 mt-1">Separate multiple tags with commas</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-violet-700 text-white rounded-lg hover:from-violet-700 hover:to-violet-800 font-medium transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
              disabled={uploading || !file || !userStore}
            >
              {uploading ? (
                <>
                  <RefreshIcon spinning />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <UploadIcon />
                  <span>Upload Document</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface DocumentManagerProps {
  userId: string; // REQUIRED: Pass from auth context
  handleError?: (message: string, err: any) => void;
}

const DocumentManager: React.FC<DocumentManagerProps> = ({ userId, handleError }) => {
  // State Management
  const [documents, setDocuments] = useState<ManagedDocument[]>([]);
  const [stores, setStores] = useState<RagStore[]>([]);
  const [userStore, setUserStore] = useState<RagStore | null>(null);
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializingStore, setInitializingStore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [healthStatus, setHealthStatus] = useState<any>(null);

  // Filter State
  const [filter, setFilter] = useState<DocumentFilter>({
    searchTerm: '',
    storeNames: [],
    versions: [],
    tags: [],
    sortBy: 'date',
    sortOrder: 'desc',
  });

  // WebSocket integration
  const { connected, documentUpdates, userUpdates } = useWebSocket(userId);

  // Get user's store name (format: ragStores/{userId})
  const getUserStoreName = () => `ragStores/${userId}`;

  // Check if user store exists, create if not
  const ensureUserStore = async () => {
    try {
      setInitializingStore(true);
      const allStores = await listRagStores();
      const userStoreName = getUserStoreName();

      // Check if user's store exists
      let store = allStores.find(s => s.name === userStoreName);

      if (!store) {
        // Store doesn't exist - create it
        console.log(`Creating personal store for user: ${userId}`);

        // Create with user-friendly display name
        const newStoreName = await createRagStore(`${userId}'s Documents`);

        // Fetch updated store list to get the created store
        const updatedStores = await listRagStores();
        store = updatedStores.find(s => s.name === userStoreName);

        if (!store) {
          // Fallback: construct store object
          store = {
            name: userStoreName,
            displayName: `${userId}'s Documents`
          };
        }

        console.log(`✅ Store created successfully: ${store.displayName}`);
      } else {
        console.log(`✅ Store already exists: ${store.displayName}`);
      }

      setUserStore(store);
      return store;
    } catch (err) {
      console.error('Failed to ensure user store:', err);
      throw new Error('Failed to initialize your document storage. Please try again.');
    } finally {
      setInitializingStore(false);
    }
  };

  // Load initial data
  useEffect(() => {
    loadInitialData();
    checkSystemHealth();
  }, [userId]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Step 1: Ensure user has a store (check and create if needed)
      const store = await ensureUserStore();

      // Step 2: Load documents and stats
      const [docs, docStats, storesList] = await Promise.all([
        getAllManagedDocuments(),
        getDocumentStats(),
        listRagStores(),
      ]);

      // Filter to show only user's documents
      const userStoreName = getUserStoreName();
      const userDocs = docs.filter(doc => doc.storeName === userStoreName);

      setDocuments(userDocs);
      setStats(docStats);
      setStores(storesList);
    } catch (err) {
      const errorDetails = getApiErrorDetails(err);
      setError(errorDetails?.message || 'Failed to load documents. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const checkSystemHealth = async () => {
    try {
      const health = await checkHealth();
      setHealthStatus(health);
    } catch (err) {
      console.error('Health check failed:', err);
    }
  };

  // WebSocket update handlers
  useEffect(() => {
    if (documentUpdates) {
      loadInitialData();
    }
  }, [documentUpdates]);

  useEffect(() => {
    if (userUpdates) {
      if (userUpdates.type === 'document-ready' || userUpdates.type === 'document-deleted') {
        loadInitialData();
      }
    }
  }, [userUpdates]);

  // Filtered Documents
  const filteredDocuments = useMemo(() => {
    return filterDocuments(documents, filter);
  }, [documents, filter]);

  // Filter Options
  const filterOptions = useMemo(() => {
    return getFilterOptions(documents);
  }, [documents]);

  // Selection Handlers
  const toggleSelectAll = () => {
    if (selectedDocs.size === filteredDocuments.length) {
      setSelectedDocs(new Set());
    } else {
      setSelectedDocs(new Set(filteredDocuments.map((doc) => doc.name)));
    }
  };

  const toggleSelectDoc = (docName: string) => {
    const newSelected = new Set(selectedDocs);
    if (newSelected.has(docName)) {
      newSelected.delete(docName);
    } else {
      newSelected.add(docName);
    }
    setSelectedDocs(newSelected);
  };

  // Document Operations
  const handleUpload = async (file: File, metadata: CustomMetadata[]) => {
    try {
      if (!userStore) {
        throw new Error('User store not initialized');
      }

      // Upload to user's personal store
      await uploadDocument(userStore.name, file, metadata);
      await loadInitialData();
    } catch (err) {
      const errorDetails = getApiErrorDetails(err);
      throw new Error(errorDetails?.message || 'Upload failed');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedDocs.size === 0) return;

    if (!window.confirm(`Are you sure you want to delete ${selectedDocs.size} document(s)?`)) {
      return;
    }

    try {
      setLoading(true);
      const result = await bulkDeleteDocuments(Array.from(selectedDocs));

      if (result.failed.length > 0) {
        alert(
          `Deleted ${result.success.length} documents. Failed to delete ${result.failed.length} documents:\n${result.failed.map((f) => f.name).join('\n')}`
        );
      } else {
        alert(`Successfully deleted ${result.success.length} documents.`);
      }

      setSelectedDocs(new Set());
      await loadInitialData();
    } catch (err) {
      const errorDetails = getApiErrorDetails(err);
      setError(errorDetails?.message || 'Failed to delete documents.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSingle = async (documentName: string) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await deleteDocument(documentName);
      await loadInitialData();
    } catch (err) {
      const errorDetails = getApiErrorDetails(err);
      alert(errorDetails?.message || 'Failed to delete document');
    }
  };

  const handleExportCSV = () => {
    const csv = exportDocumentsAsCSV(filteredDocuments);
    downloadCSV(csv, `documents-${userId}-${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Filter Handlers
  const updateFilter = (updates: Partial<DocumentFilter>) => {
    setFilter((prev) => ({ ...prev, ...updates }));
  };

  const clearFilters = () => {
    setFilter({
      searchTerm: '',
      storeNames: [],
      versions: [],
      tags: [],
      sortBy: 'date',
      sortOrder: 'desc',
    });
  };

  const toggleVersionFilter = (version: string) => {
    const versions = filter.versions || [];
    updateFilter({
      versions: versions.includes(version)
        ? versions.filter((v) => v !== version)
        : [...versions, version],
    });
  };

  // Render Loading State
  if (loading && documents.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <div className="text-center">
          <RefreshIcon spinning />
          <p className="mt-4 text-gray-600">
            {initializingStore
              ? `Setting up your personal storage for ${userId}...`
              : 'Loading documents...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-violet-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-violet-800 bg-clip-text text-transparent">
                My Documents
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {userStore?.displayName || `Personal library for ${userId}`}
                <span className="ml-2 inline-flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      connected ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                  />
                  <span className="text-xs">
                    {connected ? 'Live updates active' : 'Connecting...'}
                  </span>
                </span>
              </p>
            </div>
            <button
              onClick={() => setUploadModalOpen(true)}
              disabled={!userStore}
              className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-violet-700 text-white rounded-lg hover:from-violet-700 hover:to-violet-800 font-medium transition-all shadow-md hover:shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title={!userStore ? 'Initializing storage...' : 'Upload document'}
            >
              <UploadIcon />
              <span>Upload Document</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Storage Info Banner */}
        {userStore && (
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 mb-6 text-white shadow-lg">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-1">Your Personal Storage</h3>
                <p className="text-blue-100 text-sm mb-3">
                  All your documents are stored securely in: <strong>{userStore.displayName}</strong>
                </p>
                <div className="flex items-center gap-2 text-xs text-blue-100">
                  <CheckIcon />
                  <span>Storage ID: {userStore.name}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="ml-2 text-red-800">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              ✕
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Documents</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{documents.length}</p>
              </div>
              <div className="w-12 h-12 bg-violet-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Categories</p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {new Set(documents.map(d => d.category).filter(Boolean)).size}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Storage Used</p>
                <p className="text-3xl font-bold text-yellow-600 mt-2">
                  {formatFileSize(documents.reduce((sum, doc) => sum + (doc.fileSize || 0), 0))}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <ChartIcon />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Selected</p>
                <p className="text-3xl font-bold text-purple-600 mt-2">{selectedDocs.size}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm mb-6">
          <div className="flex flex-wrap gap-4 items-center justify-between mb-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px] max-w-md">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={filter.searchTerm}
                  onChange={(e) => updateFilter({ searchTerm: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
                <div className="absolute left-3 top-3 text-gray-400">
                  <SearchIcon />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={loadInitialData}
                disabled={loading}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2 disabled:opacity-50 transition-colors"
              >
                <RefreshIcon spinning={loading} />
                <span>Refresh</span>
              </button>

              <button
                onClick={handleExportCSV}
                className="px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg flex items-center gap-2 transition-colors"
              >
                <DownloadIcon />
                <span>Export CSV</span>
              </button>

              {selectedDocs.size > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                >
                  <TrashIcon />
                  <span>Delete ({selectedDocs.size})</span>
                </button>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            {/* Version Filter */}
            {filterOptions.versions.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm font-medium text-gray-700">Versions:</span>
                {filterOptions.versions.slice(0, 5).map((v) => (
                  <button
                    key={v.version}
                    onClick={() => toggleVersionFilter(v.version)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      filter.versions?.includes(v.version)
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    v{v.version} ({v.count})
                  </button>
                ))}
              </div>
            )}

            {/* Clear Filters */}
            {(filter.searchTerm || filter.versions?.length || filter.tags?.length) && (
              <button
                onClick={clearFilters}
                className="px-3 py-1 text-sm text-red-600 hover:text-red-800 underline transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>

          {/* Sort */}
          <div className="mt-4 flex gap-4 items-center">
            <span className="text-sm font-medium text-gray-700">Sort by:</span>
            <select
              value={filter.sortBy}
              onChange={(e) => updateFilter({ sortBy: e.target.value as any })}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="date">Date</option>
              <option value="name">Name</option>
              <option value="version">Version</option>
            </select>

            <button
              onClick={() =>
                updateFilter({
                  sortOrder: filter.sortOrder === 'asc' ? 'desc' : 'asc',
                })
              }
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors"
            >
              {filter.sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
            </button>
          </div>
        </div>

        {/* Documents Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={
                        selectedDocs.size === filteredDocuments.length &&
                        filteredDocuments.length > 0
                      }
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-violet-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Document
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Version
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Modified
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDocuments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                          <svg
                            className="w-10 h-10 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          No documents found
                        </h3>
                        <p className="text-gray-600 mb-4">
                          {userStore
                            ? 'Start by uploading your first document'
                            : 'Setting up your storage...'}
                        </p>
                        {userStore && (
                          <button
                            onClick={() => setUploadModalOpen(true)}
                            className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-violet-700 text-white rounded-lg hover:from-violet-700 hover:to-violet-800 font-medium transition-all inline-flex items-center gap-2"
                          >
                            <UploadIcon />
                            <span>Upload Document</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredDocuments.map((doc) => {
                    const isSelected = selectedDocs.has(doc.name);
                    const hasNewVersion = hasNewerVersion(documents, doc);

                    return (
                      <tr
                        key={doc.name}
                        className={`hover:bg-gray-50 transition-colors ${
                          isSelected ? 'bg-blue-50' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectDoc(doc.name)}
                            className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center">
                            <svg
                              className="w-5 h-5 text-gray-400 mr-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                            <div>
                              <div className="font-medium text-gray-900">
                                {doc.displayName}
                              </div>
                              {doc.tags && doc.tags.length > 0 && (
                                <div className="flex gap-1 mt-1">
                                  {doc.tags.map((tag) => (
                                    <span
                                      key={tag}
                                      className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            <span
                              className={
                                hasNewVersion ? 'text-orange-600' : 'text-gray-900'
                              }
                            >
                              v{doc.version}
                            </span>
                            {hasNewVersion && (
                              <span
                                className="text-xs text-orange-600"
                                title="Newer version available"
                              >
                                ⚠️
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {formatFileSize(doc.fileSize)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {formatDate(doc.lastModified)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                          {doc.notes}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <button
                            onClick={() => handleDeleteSingle(doc.name)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="Delete document"
                          >
                            <TrashIcon />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Results Count */}
        <div className="mt-4 text-sm text-gray-600 text-center">
          Showing {filteredDocuments.length} of {documents.length} documents
        </div>
      </div>

      {/* Upload Modal with Store Confirmation */}
      <UploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        userId={userId}
        userStore={userStore}
        onUpload={handleUpload}
      />
    </div>
  );
};


export default DocumentManager;