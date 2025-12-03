// services/documentManagementService.ts
import axios, { AxiosError } from 'axios';
import { DocumentWithStore, RagStore, CustomMetadata } from '../types';
import { apiClient, getApiErrorDetails } from './api.services';

// ============================================
// Document Management Types
// ============================================

export interface DocumentVersion {
    version: string;
    notes: string;
    uploadedAt?: string;
    uploadedBy?: string;
}

export interface ManagedDocument extends DocumentWithStore {
    version: string;
    notes: string;
    category?: string;
    tags?: string[];
    lastModified?: string;
    fileSize?: number;
    mimeType?: string;
}

export interface DocumentFilter {
    searchTerm?: string;
    storeNames?: string[];
    versions?: string[];
    dateRange?: {
        start: Date;
        end: Date;
    };
    tags?: string[];
    sortBy?: 'name' | 'version' | 'date' | 'store';
    sortOrder?: 'asc' | 'desc';
}

export interface DocumentStats {
    totalDocuments: number;
    documentsByStore: { [storeName: string]: number };
    documentsByVersion: { [version: string]: number };
    recentUploads: ManagedDocument[];
    storageUsed?: number;
}

export interface BulkOperationResult {
    success: string[];
    failed: { name: string; error: string }[];
}

// ============================================
// Document Retrieval & Organization
// ============================================

/**
 * Get all managed documents with enhanced metadata
 */
export async function getAllManagedDocuments(): Promise<ManagedDocument[]> {
    try {
        const response = await apiClient.get('/gemini/documents');
        const documents: DocumentWithStore[] = response.data.documents || [];

        return documents.map(doc => enrichDocumentMetadata(doc));
    } catch (error) {
        console.error('Error fetching managed documents:', error);
        throw error;
    }
}

/**
 * Get documents from a specific store
 */
export async function getDocumentsByStore(storeName: string): Promise<ManagedDocument[]> {
    try {
        const response = await apiClient.get(`/gemini/stores/${storeName}/documents`);
        const documents: DocumentWithStore[] = response.data.documents || [];

        return documents.map(doc => enrichDocumentMetadata(doc));
    } catch (error) {
        console.error(`Error fetching documents for store ${storeName}:`, error);
        throw error;
    }
}

/**
 * Get a single document by name
 */
export async function getDocumentByName(documentName: string): Promise<ManagedDocument | null> {
    try {
        const allDocs = await getAllManagedDocuments();
        return allDocs.find(doc => doc.name === documentName) || null;
    } catch (error) {
        console.error(`Error fetching document ${documentName}:`, error);
        throw error;
    }
}

/**
 * Enrich document with parsed metadata
 */
function enrichDocumentMetadata(doc: DocumentWithStore): ManagedDocument {
    const versionMeta = doc.customMetadata?.find(m => m.key === 'version');
    const notesMeta = doc.customMetadata?.find(m => m.key === 'notes');
    const categoryMeta = doc.customMetadata?.find(m => m.key === 'category');
    const tagsMeta = doc.customMetadata?.find(m => m.key === 'tags');

    return {
        ...doc,
        version: versionMeta?.stringValue || 'N/A',
        notes: notesMeta?.stringValue || '—',
        category: categoryMeta?.stringValue,
        tags: tagsMeta?.stringValue ? tagsMeta.stringValue.split(',').map(t => t.trim()) : [],
        lastModified: doc.createTime || doc.updateTime,
        fileSize: doc.sizeBytes ? parseInt(doc.sizeBytes) : undefined,
        mimeType: doc.mimeType,
    };
}

// ============================================
// Document Filtering & Search
// ============================================

/**
 * Filter and search documents based on criteria
 */
export function filterDocuments(
    documents: ManagedDocument[],
    filter: DocumentFilter
): ManagedDocument[] {
    let filtered = [...documents];

    // Search term filter (searches in name, store, version, notes)
    if (filter.searchTerm) {
        const searchLower = filter.searchTerm.toLowerCase();
        filtered = filtered.filter(doc =>
            doc.displayName.toLowerCase().includes(searchLower) ||
            doc.storeDisplayName.toLowerCase().includes(searchLower) ||
            doc.version.toLowerCase().includes(searchLower) ||
            doc.notes.toLowerCase().includes(searchLower) ||
            doc.category?.toLowerCase().includes(searchLower) ||
            doc.tags?.some(tag => tag.toLowerCase().includes(searchLower))
        );
    }

    // Store filter
    if (filter.storeNames && filter.storeNames.length > 0) {
        filtered = filtered.filter(doc =>
            filter.storeNames!.includes(doc.storeName)
        );
    }

    // Version filter
    if (filter.versions && filter.versions.length > 0) {
        filtered = filtered.filter(doc =>
            filter.versions!.includes(doc.version)
        );
    }

    // Date range filter
    if (filter.dateRange) {
        filtered = filtered.filter(doc => {
            if (!doc.lastModified) return false;
            const docDate = new Date(doc.lastModified);
            return docDate >= filter.dateRange!.start && docDate <= filter.dateRange!.end;
        });
    }

    // Tags filter
    if (filter.tags && filter.tags.length > 0) {
        filtered = filtered.filter(doc =>
            doc.tags?.some(tag => filter.tags!.includes(tag))
        );
    }

    // Sorting
    if (filter.sortBy) {
        filtered.sort((a, b) => {
            let compareA: any;
            let compareB: any;

            switch (filter.sortBy) {
                case 'name':
                    compareA = a.displayName.toLowerCase();
                    compareB = b.displayName.toLowerCase();
                    break;
                case 'version':
                    compareA = a.version;
                    compareB = b.version;
                    break;
                case 'date':
                    compareA = a.lastModified || '';
                    compareB = b.lastModified || '';
                    break;
                case 'store':
                    compareA = a.storeDisplayName.toLowerCase();
                    compareB = b.storeDisplayName.toLowerCase();
                    break;
                default:
                    return 0;
            }

            if (compareA < compareB) return filter.sortOrder === 'asc' ? -1 : 1;
            if (compareA > compareB) return filter.sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }

    return filtered;
}

/**
 * Get unique values for filter dropdowns
 */
export function getFilterOptions(documents: ManagedDocument[]): {
    stores: { name: string; displayName: string; count: number }[];
    versions: { version: string; count: number }[];
    tags: { tag: string; count: number }[];
} {
    const storeMap = new Map<string, { name: string; displayName: string; count: number }>();
    const versionMap = new Map<string, number>();
    const tagMap = new Map<string, number>();

    documents.forEach(doc => {
        // Store counts
        if (!storeMap.has(doc.storeName)) {
            storeMap.set(doc.storeName, {
                name: doc.storeName,
                displayName: doc.storeDisplayName,
                count: 0
            });
        }
        storeMap.get(doc.storeName)!.count++;

        // Version counts
        versionMap.set(doc.version, (versionMap.get(doc.version) || 0) + 1);

        // Tag counts
        doc.tags?.forEach(tag => {
            tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
        });
    });

    return {
        stores: Array.from(storeMap.values()).sort((a, b) => b.count - a.count),
        versions: Array.from(versionMap.entries())
            .map(([version, count]) => ({ version, count }))
            .sort((a, b) => b.count - a.count),
        tags: Array.from(tagMap.entries())
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count),
    };
}

// ============================================
// Document Statistics & Analytics
// ============================================

/**
 * Get document statistics and analytics
 */
export async function getDocumentStats(): Promise<DocumentStats> {
    try {
        const documents = await getAllManagedDocuments();

        const documentsByStore: { [key: string]: number } = {};
        const documentsByVersion: { [key: string]: number } = {};
        let totalStorage = 0;

        documents.forEach(doc => {
            // Count by store
            documentsByStore[doc.storeDisplayName] =
                (documentsByStore[doc.storeDisplayName] || 0) + 1;

            // Count by version
            documentsByVersion[doc.version] =
                (documentsByVersion[doc.version] || 0) + 1;

            // Calculate storage
            if (doc.fileSize) {
                totalStorage += doc.fileSize;
            }
        });

        // Get recent uploads (last 10)
        const recentUploads = documents
            .filter(doc => doc.lastModified)
            .sort((a, b) => {
                const dateA = new Date(a.lastModified!).getTime();
                const dateB = new Date(b.lastModified!).getTime();
                return dateB - dateA;
            })
            .slice(0, 10);

        return {
            totalDocuments: documents.length,
            documentsByStore,
            documentsByVersion,
            recentUploads,
            storageUsed: totalStorage,
        };
    } catch (error) {
        console.error('Error calculating document stats:', error);
        throw error;
    }
}

// ============================================
// Bulk Operations
// ============================================

/**
 * Delete multiple documents
 */
export async function bulkDeleteDocuments(documentNames: string[]): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
        success: [],
        failed: [],
    };

    for (const docName of documentNames) {
        try {
            await apiClient.delete(`/gemini/documents/${docName}`);
            result.success.push(docName);
        } catch (error) {
            const errorDetails = getApiErrorDetails(error);
            result.failed.push({
                name: docName,
                error: errorDetails?.message || 'Unknown error',
            });
        }
    }

    return result;
}

/**
 * Move documents to different store
 */
export async function moveDocumentsToStore(
    documentNames: string[],
    targetStoreName: string
): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
        success: [],
        failed: [],
    };

    for (const docName of documentNames) {
        try {
            result.failed.push({
                name: docName,
                error: 'Move operation not supported by API',
            });
        } catch (error) {
            const errorDetails = getApiErrorDetails(error);
            result.failed.push({
                name: docName,
                error: errorDetails?.message || 'Unknown error',
            });
        }
    }

    return result;
}

// ============================================
// Document Versioning
// ============================================

/**
 * Get all versions of a document (by base name)
 */
export function getDocumentVersions(
    documents: ManagedDocument[],
    baseName: string
): ManagedDocument[] {
    // Remove version suffix from names to group documents
    const baseNameLower = baseName.toLowerCase().replace(/\s*v?\d+(\.\d+)*$/i, '');

    return documents
        .filter(doc => {
            const docBaseName = doc.displayName.toLowerCase().replace(/\s*v?\d+(\.\d+)*$/i, '');
            return docBaseName === baseNameLower;
        })
        .sort((a, b) => {
            // Sort by version descending
            return compareVersions(b.version, a.version);
        });
}

/**
 * Compare version strings (e.g., "2.1.0" vs "2.0.5")
 */
function compareVersions(v1: string, v2: string): number {
    if (v1 === 'N/A') return -1;
    if (v2 === 'N/A') return 1;

    const parts1 = v1.split('.').map(n => parseInt(n) || 0);
    const parts2 = v2.split('.').map(n => parseInt(n) || 0);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const part1 = parts1[i] || 0;
        const part2 = parts2[i] || 0;
        if (part1 !== part2) return part1 - part2;
    }

    return 0;
}

/**
 * Check if a newer version exists
 */
export function hasNewerVersion(
    documents: ManagedDocument[],
    currentDoc: ManagedDocument
): boolean {
    const versions = getDocumentVersions(documents, currentDoc.displayName);
    return versions.length > 0 && versions[0].name !== currentDoc.name;
}

// ============================================
// Export & Reporting
// ============================================

/**
 * Export documents metadata as CSV
 */
export function exportDocumentsAsCSV(documents: ManagedDocument[]): string {
    const headers = [
        'Name',
        'Store',
        'Version',
        'Notes',
        'Category',
        'Tags',
        'Last Modified',
        'File Size (KB)',
        'MIME Type',
    ];

    const rows = documents.map(doc => [
        doc.displayName,
        doc.storeDisplayName,
        doc.version,
        doc.notes,
        doc.category || '',
        doc.tags?.join('; ') || '',
        doc.lastModified || '',
        doc.fileSize ? (doc.fileSize / 1024).toFixed(2) : '',
        doc.mimeType || '',
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csvContent;
}

/**
 * Download CSV file
 */
export function downloadCSV(csvContent: string, filename: string = 'documents.csv') {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Generate document management report
 */
export async function generateManagementReport(): Promise<{
    summary: DocumentStats;
    documents: ManagedDocument[];
    filterOptions: ReturnType<typeof getFilterOptions>;
    timestamp: string;
}> {
    try {
        const documents = await getAllManagedDocuments();
        const summary = await getDocumentStats();
        const filterOptions = getFilterOptions(documents);

        return {
            summary,
            documents,
            filterOptions,
            timestamp: new Date().toISOString(),
        };
    } catch (error) {
        console.error('Error generating management report:', error);
        throw error;
    }
}

// ============================================
// Validation & Utilities
// ============================================

/**
 * Validate document metadata before upload
 */
export function validateDocumentMetadata(metadata: CustomMetadata[]): {
    valid: boolean;
    errors: string[];
} {
    const errors: string[] = [];

    // Check for required fields
    const hasVersion = metadata.some(m => m.key === 'version');
    if (!hasVersion) {
        errors.push('Version number is required');
    }

    // Validate version format
    const versionMeta = metadata.find(m => m.key === 'version');
    if (versionMeta && versionMeta.stringValue) {
        const versionPattern = /^\d+(\.\d+)*$/;
        if (!versionPattern.test(versionMeta.stringValue)) {
            errors.push('Version must be in format: X.Y.Z (e.g., 2.1.0)');
        }
    }

    // Check for duplicate keys
    const keys = metadata.map(m => m.key);
    const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index);
    if (duplicates.length > 0) {
        errors.push(`Duplicate metadata keys: ${duplicates.join(', ')}`);
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes?: number): string {
    if (!bytes) return 'Unknown';

    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Format date for display
 */
export function formatDate(dateString?: string): string {
    if (!dateString) return 'Unknown';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

    return date.toLocaleDateString();
}

// ============================================
// Export all functions
// ============================================

export default {
    // Document Retrieval
    getAllManagedDocuments,
    getDocumentsByStore,
    getDocumentByName,

    // Filtering & Search
    filterDocuments,
    getFilterOptions,

    // Statistics
    getDocumentStats,

    // Bulk Operations
    bulkDeleteDocuments,
    moveDocumentsToStore,

    // Versioning
    getDocumentVersions,
    hasNewerVersion,

    // Export & Reporting
    exportDocumentsAsCSV,
    downloadCSV,
    generateManagementReport,

    // Utilities
    validateDocumentMetadata,
    formatFileSize,
    formatDate,
};