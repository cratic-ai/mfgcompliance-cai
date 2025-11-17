/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useRef, useMemo } from 'react';
import { RagStore, Document, CustomMetadata } from '../types';
import Spinner from './Spinner';
import UploadIcon from './icons/UploadIcon';
import TrashIcon from './icons/TrashIcon';
import PlusIcon from './icons/PlusIcon';
import SortIcon from './icons/SortIcon';
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import ChevronRightIcon from './icons/ChevronRightIcon';

interface DocumentListProps {
    selectedStore: RagStore | null;
    documents: Document[];
    isLoading: boolean;
    processingFile: string | null;
    onUpload: (file: File, metadata: CustomMetadata[]) => void;
    onDelete: (docName: string) => void;
}

const ITEMS_PER_PAGE = 10;

const DocumentList: React.FC<DocumentListProps> = ({ selectedStore, documents, isLoading, processingFile, onUpload, onDelete }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [metadata, setMetadata] = useState<{ key: string, value: string }[]>([{ key: '', value: '' }]);

    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: keyof Document; direction: 'asc' | 'desc' }>({ key: 'displayName', direction: 'asc' });
    const [currentPage, setCurrentPage] = useState(1);

    const handleUploadClick = () => {
        setIsUploadModalOpen(true);
    };

    const handleModalClose = () => {
        setIsUploadModalOpen(false);
        setSelectedFile(null);
        setMetadata([{ key: '', value: '' }]);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);
        }
    };

    const handleMetadataChange = (index: number, field: 'key' | 'value', text: string) => {
        const newMetadata = [...metadata];
        newMetadata[index][field] = text;
        setMetadata(newMetadata);
    };

    const addMetadataRow = () => {
        setMetadata([...metadata, { key: '', value: '' }]);
    };

    const removeMetadataRow = (index: number) => {
        const newMetadata = metadata.filter((_, i) => i !== index);
        setMetadata(newMetadata);
    };

    const handleConfirmUpload = () => {
        if (!selectedFile) return;
        const formattedMetadata: CustomMetadata[] = metadata
            .filter(m => m.key.trim() !== '')
            .map(m => ({ key: m.key.trim(), stringValue: m.value.trim() }));
        onUpload(selectedFile, formattedMetadata);
        handleModalClose();
    };
    
    const processedDocuments = useMemo(() => {
        if (!documents) return [];
        let filtered = documents.filter(doc => doc.displayName.toLowerCase().includes(searchTerm.toLowerCase()));

        filtered.sort((a, b) => {
            if (a[sortConfig.key]! < b[sortConfig.key]!) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (a[sortConfig.key]! > b[sortConfig.key]!) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
        
        return filtered;
    }, [documents, searchTerm, sortConfig]);

    const totalPages = Math.ceil(processedDocuments.length / ITEMS_PER_PAGE);

    const paginatedDocuments = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return processedDocuments.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [processedDocuments, currentPage]);
    
     const handleSort = (key: keyof Document) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    if (!selectedStore) {
        return (
            <div className="flex flex-col h-full items-center justify-center text-center text-cratic-text-secondary">
                <p className="text-lg">Select a Document Store</p>
                <p>to view and manage its SOPs.</p>
            </div>
        );
    }
    
    const renderTableContent = () => {
        if (isLoading) {
             return (
                Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index} className="animate-pulse">
                        <td className="p-3"><div className="h-4 bg-cratic-subtle rounded"></div></td>
                        <td className="p-3"><div className="h-4 bg-cratic-subtle rounded"></div></td>
                        <td className="p-3"><div className="h-4 bg-cratic-subtle rounded w-8"></div></td>
                    </tr>
                ))
            );
        }

        if (paginatedDocuments.length === 0) {
            return (
                 <tr>
                    <td colSpan={3} className="text-center p-8 text-cratic-text-secondary">
                        {searchTerm ? "No documents match your search." : "No documents found. Upload one to get started."}
                    </td>
                </tr>
            );
        }

        return paginatedDocuments.map((doc) => {
            const displayMetadata = doc.customMetadata?.map(m => `${m.key}: ${m.stringValue}`).join(', ') || '—';
            return (
                <tr key={doc.name} className="group hover:bg-cratic-subtle/50">
                    <td className="p-3 font-medium text-cratic-text-primary truncate" title={doc.displayName}>{doc.displayName}</td>
                    <td className="p-3 text-sm text-cratic-text-secondary truncate" title={displayMetadata}>{displayMetadata}</td>
                    <td className="p-3 text-right">
                        <button 
                            onClick={() => onDelete(doc.name)}
                            className="p-1 text-red-400 hover:text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label={`Delete ${doc.displayName}`}
                            title={`Delete ${doc.displayName}`}
                        >
                            <TrashIcon />
                        </button>
                    </td>
                </tr>
            );
        });
    }


    return (
        <div className="flex flex-col h-full">
            <div className="mb-4">
                <h2 className="text-xl font-bold truncate mb-2" title={selectedStore.displayName}>Documents in {selectedStore.displayName}</h2>
                 <div className="flex items-center space-x-2">
                    <input
                        type="search"
                        placeholder="Search documents..."
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        className="flex-grow bg-cratic-subtle border border-cratic-border rounded-md py-1.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-cratic-purple"
                    />
                    <button
                        onClick={handleUploadClick}
                        className="p-2 bg-cratic-purple hover:bg-cratic-purple-hover rounded-md text-white transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
                        disabled={!!processingFile}
                        aria-label="Upload document"
                        title="Upload a new document to this store"
                    >
                        <UploadIcon />
                    </button>
                </div>
            </div>
            
            {isUploadModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="upload-doc-title">
                    <div className="bg-cratic-panel p-6 rounded-lg shadow-xl w-full max-w-lg">
                        <h3 id="upload-doc-title" className="text-xl font-bold mb-4">Upload Document</h3>
                        
                        <div className="mb-4">
                            <label htmlFor="file-upload" className="block text-sm font-medium text-cratic-text-primary mb-2">File</label>
                            <input
                                id="file-upload"
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="w-full text-sm text-cratic-text-primary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cratic-purple file:text-white hover:file:bg-cratic-purple-hover"
                            />
                            {selectedFile && <p className="text-sm mt-2 text-cratic-text-secondary">Selected: {selectedFile.name}</p>}
                        </div>

                        <div className="mb-4">
                            <h4 className="text-sm font-medium text-cratic-text-primary mb-2">Custom Metadata (optional)</h4>
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                {metadata.map((item, index) => (
                                    <div key={index} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                        <input type="text" placeholder="Key (e.g., version)" value={item.key} onChange={(e) => handleMetadataChange(index, 'key', e.target.value)} className="w-full sm:w-1/2 bg-cratic-subtle border border-cratic-border rounded-md py-1 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-cratic-purple" />
                                        <input type="text" placeholder="Value (e.g., 2.1)" value={item.value} onChange={(e) => handleMetadataChange(index, 'value', e.target.value)} className="w-full sm:w-1/2 bg-cratic-subtle border border-cratic-border rounded-md py-1 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-cratic-purple" />
                                        <button onClick={() => removeMetadataRow(index)} className="p-1 text-red-400 hover:text-red-500 rounded-full self-end sm:self-center" aria-label="Remove metadata row" title="Remove metadata row">
                                            <TrashIcon />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <button onClick={addMetadataRow} className="mt-2 flex items-center text-sm text-cratic-purple hover:text-cratic-purple-hover font-semibold" title="Add another metadata field">
                                <PlusIcon /> <span className="ml-1">Add Metadata</span>
                            </button>
                        </div>
                        
                        <div className="flex justify-end space-x-2 mt-6">
                            <button type="button" onClick={handleModalClose} className="px-4 py-2 rounded-md bg-cratic-subtle hover:bg-cratic-border transition-colors" title="Cancel upload">
                                Cancel
                            </button>
                            <button type="button" onClick={handleConfirmUpload} disabled={!selectedFile} className="px-4 py-2 rounded-md bg-cratic-purple hover:bg-cratic-purple-hover text-white transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed" title="Upload selected file">
                                Upload
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {processingFile && (
                <div className="my-2 p-3 bg-cratic-subtle rounded-md flex items-center">
                    <Spinner />
                    <span className="ml-3 text-cratic-text-secondary">Processing: {processingFile}...</span>
                </div>
            )}
            
            <div className="flex-grow overflow-y-auto border border-cratic-border rounded-lg">
                <table className="w-full text-left">
                    <thead className="bg-cratic-subtle/50 text-xs text-cratic-text-secondary uppercase">
                        <tr>
                            <th className="p-3 w-2/5">
                                <button onClick={() => handleSort('displayName')} className="flex items-center hover:text-cratic-text-primary">
                                    Name <SortIcon className={sortConfig.key === 'displayName' ? 'text-cratic-text-primary' : ''}/>
                                </button>
                            </th>
                            <th className="p-3 w-2/5">Metadata</th>
                            <th className="p-3 w-1/5 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-cratic-border">
                       {renderTableContent()}
                    </tbody>
                </table>
            </div>

             {totalPages > 1 && (
                <div className="flex justify-between items-center pt-3 text-sm">
                    <span className="text-cratic-text-secondary">
                        Page {currentPage} of {totalPages}
                    </span>
                    <div className="flex items-center space-x-1">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-md hover:bg-cratic-subtle disabled:opacity-50"
                            aria-label="Previous page"
                        >
                            <ChevronLeftIcon />
                        </button>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-md hover:bg-cratic-subtle disabled:opacity-50"
                            aria-label="Next page"
                        >
                            <ChevronRightIcon />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DocumentList;
