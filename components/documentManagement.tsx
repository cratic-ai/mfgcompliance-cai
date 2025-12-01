

import React, { useState, useEffect, useMemo } from 'react';
import {
  getAllManagedDocuments,
  getDocumentStats,
  filterDocuments,
  getFilterOptions,
  bulkDeleteDocuments,
  exportDocumentsAsCSV,
  downloadCSV,
  getDocumentVersions,
  hasNewerVersion,
  formatFileSize,
  formatDate,
  ManagedDocument,
  DocumentFilter,
  DocumentStats,
} from './services/documentManagementService';

// Icons (you can replace these with your preferred icon library)
const SearchIcon = () => <span>🔍</span>;
const FilterIcon = () => <span>🔽</span>;
const DownloadIcon = () => <span>⬇️</span>;
const TrashIcon = () => <span>🗑️</span>;
const RefreshIcon = () => <span>🔄</span>;
const CheckIcon = () => <span>✓</span>;
const AlertIcon = () => <span>⚠️</span>;
const FileIcon = () => <span>📄</span>;
const FolderIcon = () => <span>📁</span>;
const ChartIcon = () => <span>📊</span>;

const DocumentManagement: React.FC = () => {
  // State Management
  const [documents, setDocuments] = useState<ManagedDocument[]>([]);
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [showStats, setShowStats] = useState(false);

  // Filter State
  const [filter, setFilter] = useState<DocumentFilter>({
    searchTerm: '',
    storeNames: [],
    versions: [],
    tags: [],
    sortBy: 'date',
    sortOrder: 'desc',
  });

  // Load Documents
  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const [docs, docStats] = await Promise.all([
        getAllManagedDocuments(),
        getDocumentStats(),
      ]);
      setDocuments(docs);
      setStats(docStats);
    } catch (err) {
      setError('Failed to load documents. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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
      setSelectedDocs(new Set(filteredDocuments.map(doc => doc.name)));
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

  // Bulk Operations
  const handleBulkDelete = async () => {
    if (selectedDocs.size === 0) return;

    if (!window.confirm(`Are you sure you want to delete ${selectedDocs.size} document(s)?`)) {
      return;
    }

    try {
      setLoading(true);
      const result = await bulkDeleteDocuments(Array.from(selectedDocs));

      if (result.failed.length > 0) {
        alert(`Deleted ${result.success.length} documents. Failed to delete ${result.failed.length} documents.`);
      } else {
        alert(`Successfully deleted ${result.success.length} documents.`);
      }

      setSelectedDocs(new Set());
      await loadDocuments();
    } catch (err) {
      setError('Failed to delete documents.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    const csv = exportDocumentsAsCSV(filteredDocuments);
    downloadCSV(csv, `documents-${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Filter Handlers
  const updateFilter = (updates: Partial<DocumentFilter>) => {
    setFilter(prev => ({ ...prev, ...updates }));
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

  const toggleStoreFilter = (storeName: string) => {
    const stores = filter.storeNames || [];
    updateFilter({
      storeNames: stores.includes(storeName)
        ? stores.filter(s => s !== storeName)
        : [...stores, storeName],
    });
  };

  const toggleVersionFilter = (version: string) => {
    const versions = filter.versions || [];
    updateFilter({
      versions: versions.includes(version)
        ? versions.filter(v => v !== version)
        : [...versions, version],
    });
  };

  const toggleTagFilter = (tag: string) => {
    const tags = filter.tags || [];
    updateFilter({
      tags: tags.includes(tag)
        ? tags.filter(t => t !== tag)
        : [...tags, tag],
    });
  };

  // Render Loading State
  if (loading && documents.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <RefreshIcon />
          <p className="mt-2 text-gray-600">Loading documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Document Management
          </h1>
          <p className="text-gray-600">
            Manage and organize your documents across all stores
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <AlertIcon />
            <span className="ml-2 text-red-800">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              ✕
            </button>
          </div>
        )}

        {/* Stats Banner */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Documents</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.totalDocuments || 0}
                </p>
              </div>
              <FileIcon />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Stores</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Object.keys(stats?.documentsByStore || {}).length}
                </p>
              </div>
              <FolderIcon />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Storage Used</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatFileSize(stats?.storageUsed)}
                </p>
              </div>
              <ChartIcon />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Selected</p>
                <p className="text-2xl font-bold text-gray-900">
                  {selectedDocs.size}
                </p>
              </div>
              <CheckIcon />
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            {/* Search */}
            <div className="flex-1 min-w-[200px] max-w-md">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={filter.searchTerm}
                  onChange={(e) => updateFilter({ searchTerm: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="absolute left-3 top-2.5">
                  <SearchIcon />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={loadDocuments}
                disabled={loading}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshIcon />
                <span>Refresh</span>
              </button>

              <button
                onClick={() => setShowStats(!showStats)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2"
              >
                <ChartIcon />
                <span>Stats</span>
              </button>

              <button
                onClick={handleExportCSV}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
              >
                <DownloadIcon />
                <span>Export CSV</span>
              </button>

              {selectedDocs.size > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2"
                >
                  <TrashIcon />
                  <span>Delete ({selectedDocs.size})</span>
                </button>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="mt-4 flex flex-wrap gap-4">
            {/* Store Filter */}
            {filterOptions.stores.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm font-medium text-gray-700">Stores:</span>
                {filterOptions.stores.slice(0, 5).map(store => (
                  <button
                    key={store.name}
                    onClick={() => toggleStoreFilter(store.name)}
                    className={`px-3 py-1 rounded-full text-sm ${
                      filter.storeNames?.includes(store.name)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {store.displayName} ({store.count})
                  </button>
                ))}
              </div>
            )}

            {/* Version Filter */}
            {filterOptions.versions.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm font-medium text-gray-700">Versions:</span>
                {filterOptions.versions.slice(0, 5).map(v => (
                  <button
                    key={v.version}
                    onClick={() => toggleVersionFilter(v.version)}
                    className={`px-3 py-1 rounded-full text-sm ${
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
            {(filter.searchTerm ||
              filter.storeNames?.length ||
              filter.versions?.length ||
              filter.tags?.length) && (
              <button
                onClick={clearFilters}
                className="px-3 py-1 text-sm text-red-600 hover:text-red-800 underline"
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
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
            >
              <option value="date">Date</option>
              <option value="name">Name</option>
              <option value="version">Version</option>
              <option value="store">Store</option>
            </select>

            <button
              onClick={() => updateFilter({
                sortOrder: filter.sortOrder === 'asc' ? 'desc' : 'asc'
              })}
              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
            >
              {filter.sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
            </button>
          </div>
        </div>

        {/* Statistics Panel */}
        {showStats && stats && (
          <div className="mb-6 bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Statistics</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Documents by Store */}
              <div>
                <h3 className="font-semibold mb-2">Documents by Store</h3>
                <div className="space-y-2">
                  {Object.entries(stats.documentsByStore).map(([store, count]) => (
                    <div key={store} className="flex justify-between items-center">
                      <span className="text-gray-700">{store}</span>
                      <span className="font-semibold">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Documents by Version */}
              <div>
                <h3 className="font-semibold mb-2">Documents by Version</h3>
                <div className="space-y-2">
                  {Object.entries(stats.documentsByVersion)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 10)
                    .map(([version, count]) => (
                      <div key={version} className="flex justify-between items-center">
                        <span className="text-gray-700">v{version}</span>
                        <span className="font-semibold">{count}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Recent Uploads */}
            {stats.recentUploads.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold mb-2">Recent Uploads</h3>
                <div className="space-y-2">
                  {stats.recentUploads.slice(0, 5).map(doc => (
                    <div key={doc.name} className="flex justify-between items-center text-sm">
                      <span className="text-gray-700">{doc.displayName}</span>
                      <span className="text-gray-500">{formatDate(doc.lastModified)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Documents Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedDocs.size === filteredDocuments.length && filteredDocuments.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Document
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Store
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
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDocuments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      No documents found. Try adjusting your filters.
                    </td>
                  </tr>
                ) : (
                  filteredDocuments.map(doc => {
                    const isSelected = selectedDocs.has(doc.name);
                    const hasNewVersion = hasNewerVersion(documents, doc);

                    return (
                      <tr
                        key={doc.name}
                        className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectDoc(doc.name)}
                            className="rounded"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center">
                            <FileIcon />
                            <div className="ml-2">
                              <div className="font-medium text-gray-900">
                                {doc.displayName}
                              </div>
                              {doc.tags && doc.tags.length > 0 && (
                                <div className="flex gap-1 mt-1">
                                  {doc.tags.map(tag => (
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
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {doc.storeDisplayName}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            <span className={hasNewVersion ? 'text-orange-600' : 'text-gray-900'}>
                              v{doc.version}
                            </span>
                            {hasNewVersion && (
                              <span className="text-xs text-orange-600" title="Newer version available">
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
    </div>
  );
};

export default DocumentManagement;