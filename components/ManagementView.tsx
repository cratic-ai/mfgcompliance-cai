/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { RagStore, DocumentWithStore, CustomMetadata } from '../types';
import * as geminiService from '../services/geminiService';
import Spinner from './Spinner';
import UploadIcon from './icons/UploadIcon';
import TrashIcon from './icons/TrashIcon';
import PlusIcon from './icons/PlusIcon';
import SortIcon from './icons/SortIcon';
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import ChevronRightIcon from './icons/ChevronRightIcon';

interface ManagementViewProps {
    handleError: (message: string, err: any) => void;
}

interface VersionedDocument extends DocumentWithStore {
    version: string;
    notes: string;
}

const ITEMS_PER_PAGE = 15;

const ManagementView: React.FC<ManagementViewProps> = ({ handleError }) => {
    // Data state
    const [stores, setStores] = useState<RagStore[]>([]);
    const [documents, setDocuments] = useState<DocumentWithStore[]>([]);

    // UI state
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: keyof VersionedDocument; direction: 'asc' | 'desc' }>({ key: 'version', direction: 'desc' });
    const [currentPage, setCurrentPage] = useState(1);
    const [processingFile, setProcessingFile] = useState<string | null>(null);
    const [apiKeyReady, setApiKeyReady] = useState<boolean | null>(null);

    // Upload Modal state
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedStoreForUpload, setSelectedStoreForUpload] = useState<string>('');
    const [versionNumber, setVersionNumber] = useState('');
    const [changeNotes, setChangeNotes] = useState('');
    const [customMetadata, setCustomMetadata] = useState<{ key: string, value: string }[]>([{ key: '', value: '' }]);


    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [fetchedStores, fetchedDocs] = await Promise.all([
                geminiService.listRagStores(),
                geminiService.listAllDocuments(),
            ]);
            
            setStores(fetchedStores);
            setDocuments(fetchedDocs);

            if (fetchedStores.length > 0 && !selectedStoreForUpload) {
                setSelectedStoreForUpload(fetchedStores[0].name);
            }
        } catch (err) {
            handleError("Failed to load document control data", err);
        } finally {
            setIsLoading(false);
        }
    }, [handleError, selectedStoreForUpload]);

    useEffect(() => {
        const checkAndLoad = async () => {
            if (window.aistudio) {
                const hasKey = await window.aistudio.hasSelectedApiKey();
                if (hasKey) {
                    setApiKeyReady(true);
                    loadData();
                } else {
                    setApiKeyReady(false);
                }
            } else {
                console.warn('aistudio not found, proceeding without key check.');
                setApiKeyReady(true);
                loadData();
            }
        };
        checkAndLoad();
    }, [loadData]);

    const handleSelectKey = async () => {
        if (window.aistudio) {
            await window.aistudio.openSelectKey();
            setApiKeyReady(true);
            loadData();
        }
    };

    const handleDeleteDocument = async (doc: DocumentWithStore) => {
        if (window.confirm(`Are you sure you want to delete "${doc.displayName}"?`)) {
            try {
                await geminiService.deleteDocument(doc.name);
                setDocuments(docs => docs.filter(d => d.name !== doc.name));
            } catch (err) {
                handleError("Failed to delete document", err);
            }
        }
    };
    
    // Upload Modal Logic
    const handleOpenUploadModal = () => setIsUploadModalOpen(true);
    const handleCloseUploadModal = () => {
        setIsUploadModalOpen(false);
        setSelectedFile(null);
        setVersionNumber('');
        setChangeNotes('');
        setCustomMetadata([{ key: '', value: '' }]);
    };
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) setSelectedFile(file);
    };
    const handleCustomMetadataChange = (index: number, field: 'key' | 'value', text: string) => {
        const newMetadata = [...customMetadata];
        newMetadata[index][field] = text;
        setCustomMetadata(newMetadata);
    };
    const addMetadataRow = () => setCustomMetadata([...customMetadata, { key: '', value: '' }]);
    const removeMetadataRow = (index: number) => setCustomMetadata(customMetadata.filter((_, i) => i !== index));
    const handleConfirmUpload = async () => {
        if (!selectedFile || !selectedStoreForUpload || !versionNumber.trim()) return;
        
        setProcessingFile(selectedFile.name);
        handleCloseUploadModal();
        
        try {
            const formattedMetadata: CustomMetadata[] = [];
            if(versionNumber.trim()) formattedMetadata.push({ key: 'version', stringValue: versionNumber.trim() });
            if(changeNotes.trim()) formattedMetadata.push({ key: 'notes', stringValue: changeNotes.trim() });

            customMetadata
                .filter(m => m.key.trim() !== '')
                .forEach(m => formattedMetadata.push({ key: m.key.trim(), stringValue: m.value.trim() }));
            
            await geminiService.uploadDocument(selectedStoreForUpload, selectedFile, formattedMetadata);
            await loadData();
        } catch (err)
 {
            handleError(`Failed to upload ${selectedFile.name}`, err);
        } finally {
            setProcessingFile(null);
        }
    };

    // Table Filtering, Sorting, and Pagination Logic
    const processedDocuments = useMemo(() => {
        if (!documents) return [];

        const versionedDocs: VersionedDocument[] = documents.map(doc => {
            const versionMeta = doc.customMetadata?.find(m => m.key === 'version');
            const notesMeta = doc.customMetadata?.find(m => m.key === 'notes');
            return {
                ...doc,
                version: versionMeta?.stringValue || 'N/A',
                notes: notesMeta?.stringValue || '—',
            };
        });

        let filtered = versionedDocs.filter(doc => 
            doc.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.storeDisplayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.version.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.notes.toLowerCase().includes(searchTerm.toLowerCase())
        );

        filtered.sort((a, b) => {
            const valA = a[sortConfig.key] ?? '';
            const valB = b[sortConfig.key] ?? '';
            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        
        return filtered;
    }, [documents, searchTerm, sortConfig]);

    const totalPages = Math.ceil(processedDocuments.length / ITEMS_PER_PAGE);
    const paginatedDocuments = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return processedDocuments.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [processedDocuments, currentPage]);
    
    const handleSort = (key: keyof VersionedDocument) => {
        const direction = (sortConfig.key === key && sortConfig.direction === 'asc') ? 'desc' : 'asc';
        setSortConfig({ key, direction });
    };

    if (apiKeyReady === null) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <Spinner />
                <p className="mt-4 text-cratic-text-secondary">Verifying API Key...</p>
            </div>
        );
    }

    if (apiKeyReady === false) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                <h1 className="text-2xl font-bold mb-4">API Key Required</h1>
                <p className="max-w-md mb-6 text-cratic-text-secondary">Please select an API key to access document control features.</p>
                <button onClick={handleSelectKey} className="px-5 py-2 rounded-md bg-cratic-purple text-white font-semibold hover:bg-cratic-purple-hover transition-colors">
                    Select API Key
                </button>
                <p className="mt-4 text-xs text-slate-500 max-w-sm">
                    For information on billing, see the <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-cratic-purple">documentation</a>.
                </p>
            </div>
        );
    }

    const renderTableContent = () => {
        if (isLoading) {
            return Array.from({ length: 8 }).map((_, index) => (
                <tr key={index} className="animate-pulse"><td className="p-4" colSpan={5}><div className="h-4 bg-cratic-subtle rounded"></div></td></tr>
            ));
        }
        if (paginatedDocuments.length === 0) {
            return <tr><td colSpan={5} className="text-center p-8 text-cratic-text-secondary">{searchTerm ? "No documents match search." : "No documents found."}</td></tr>;
        }
        return paginatedDocuments.map((doc) => {
            return (
                <tr key={doc.name} className="group hover:bg-cratic-subtle/50">
                    <td className="p-3 font-medium text-cratic-text-primary truncate" title={doc.displayName}>{doc.displayName}</td>
                    <td className="p-3 text-sm text-cratic-text-secondary truncate" title={doc.storeDisplayName}>{doc.storeDisplayName}</td>
                    <td className="p-3 text-sm font-semibold text-cratic-purple-text truncate" title={doc.version}>{doc.version}</td>
                    <td className="p-3 text-sm text-cratic-text-secondary truncate" title={doc.notes}>{doc.notes}</td>
                    <td className="p-3 text-right">
                        <button onClick={() => handleDeleteDocument(doc)} className="p-1 text-red-400 hover:text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" aria-label={`Delete ${doc.displayName}`} title={`Delete ${doc.displayName}`}>
                            <TrashIcon />
                        </button>
                    </td>
                </tr>
            );
        });
    };

    return (
        <div className="p-4 sm:p-6 h-full flex flex-col">
            <header className="mb-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-cratic-text-primary">Documents Control</h1>
                <div className="flex items-center space-x-2 mt-4">
                    <input type="search" placeholder="Search all documents..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="flex-grow bg-cratic-panel border border-cratic-border rounded-md py-1.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-cratic-purple" />
                    <button onClick={handleOpenUploadModal} className="flex items-center px-4 py-1.5 bg-cratic-purple hover:bg-cratic-purple-hover rounded-md text-white transition-colors disabled:bg-slate-300" disabled={!!processingFile || stores.length === 0} title={stores.length === 0 ? "Create a document store first" : "Upload a new document"}>
                        <UploadIcon /> <span className="ml-2 hidden sm:inline">Upload</span>
                    </button>
                </div>
            </header>

            {processingFile && (
                <div className="my-2 p-3 bg-cratic-subtle rounded-md flex items-center animate-pulse">
                    <Spinner />
                    <span className="ml-3 text-cratic-text-secondary">Processing: {processingFile}...</span>
                </div>
            )}
            
            <div className="flex-grow overflow-y-auto border border-cratic-border rounded-lg bg-cratic-panel">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-cratic-subtle/50 text-xs text-cratic-text-secondary uppercase sticky top-0">
                            <tr>
                                <th className="p-3 w-[30%] whitespace-nowrap"><button onClick={() => handleSort('displayName')} className="flex items-center hover:text-cratic-text-primary">Name <SortIcon className={sortConfig.key === 'displayName' ? 'text-cratic-text-primary' : ''}/></button></th>
                                <th className="p-3 w-[15%] whitespace-nowrap"><button onClick={() => handleSort('storeDisplayName')} className="flex items-center hover:text-cratic-text-primary">Store <SortIcon className={sortConfig.key === 'storeDisplayName' ? 'text-cratic-text-primary' : ''}/></button></th>
                                <th className="p-3 w-[10%] whitespace-nowrap"><button onClick={() => handleSort('version')} className="flex items-center hover:text-cratic-text-primary">Version <SortIcon className={sortConfig.key === 'version' ? 'text-cratic-text-primary' : ''}/></button></th>
                                <th className="p-3 w-[35%] whitespace-nowrap">Change Notes</th>
                                <th className="p-3 w-[10%] text-right whitespace-nowrap">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-cratic-border">{renderTableContent()}</tbody>
                    </table>
                </div>
            </div>

            {totalPages > 1 && (
                <div className="flex justify-between items-center pt-3 text-sm flex-shrink-0">
                    <span className="text-cratic-text-secondary hidden sm:inline">Page {currentPage} of {totalPages} ({processedDocuments.length} total)</span>
                    <span className="text-cratic-text-secondary sm:hidden">Page {currentPage}/{totalPages}</span>
                    <div className="flex items-center space-x-1">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-md hover:bg-cratic-subtle disabled:opacity-50" aria-label="Previous page"><ChevronLeftIcon /></button>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 rounded-md hover:bg-cratic-subtle disabled:opacity-50" aria-label="Next page"><ChevronRightIcon /></button>
                    </div>
                </div>
            )}

            {isUploadModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="upload-doc-title">
                    <div className="bg-cratic-panel p-6 rounded-lg shadow-xl w-full max-w-lg">
                        <h3 id="upload-doc-title" className="text-xl font-bold mb-4">Upload Document</h3>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="store-select" className="block text-sm font-medium text-cratic-text-primary mb-1">Document Store</label>
                                <select id="store-select" value={selectedStoreForUpload} onChange={(e) => setSelectedStoreForUpload(e.target.value)} className="w-full bg-cratic-subtle border border-cratic-border rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-cratic-purple">
                                    {stores.map(store => <option key={store.name} value={store.name}>{store.displayName}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="file-upload" className="block text-sm font-medium text-cratic-text-primary mb-1">File</label>
                                <input id="file-upload" type="file" onChange={handleFileChange} className="w-full text-sm text-cratic-text-primary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cratic-purple file:text-white hover:file:bg-cratic-purple-hover" />
                                {selectedFile && <p className="text-sm mt-2 text-cratic-text-secondary">Selected: {selectedFile.name}</p>}
                            </div>
                             <div>
                                <label htmlFor="version-number" className="block text-sm font-medium text-cratic-text-primary mb-1">Version Number <span className="text-red-500">*</span></label>
                                <input id="version-number" type="text" value={versionNumber} onChange={(e) => setVersionNumber(e.target.value)} placeholder="e.g., 2.1.0" className="w-full bg-cratic-subtle border border-cratic-border rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-cratic-purple" />
                            </div>
                             <div>
                                <label htmlFor="change-notes" className="block text-sm font-medium text-cratic-text-primary mb-1">Change Notes</label>
                                <textarea id="change-notes" value={changeNotes} onChange={(e) => setChangeNotes(e.target.value)} placeholder="e.g., Updated safety protocols for Section 5." rows={2} className="w-full bg-cratic-subtle border border-cratic-border rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-cratic-purple" />
                            </div>
                            <div>
                                <h4 className="text-sm font-medium text-cratic-text-primary mb-2">Additional Metadata (optional)</h4>
                                <div className="space-y-2 max-h-24 overflow-y-auto pr-2">
                                    {customMetadata.map((item, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <input type="text" placeholder="Key" value={item.key} onChange={(e) => handleCustomMetadataChange(index, 'key', e.target.value)} className="w-1/2 bg-cratic-subtle border border-cratic-border rounded-md py-1 px-3 text-sm" />
                                            <input type="text" placeholder="Value" value={item.value} onChange={(e) => handleCustomMetadataChange(index, 'value', e.target.value)} className="w-1/2 bg-cratic-subtle border border-cratic-border rounded-md py-1 px-3 text-sm" />
                                            <button onClick={() => removeMetadataRow(index)} className="p-1 text-red-400 hover:text-red-500" aria-label="Remove metadata row"><TrashIcon /></button>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={addMetadataRow} className="mt-2 flex items-center text-sm text-cratic-purple hover:text-cratic-purple-hover font-semibold"><PlusIcon /> <span className="ml-1">Add Metadata</span></button>
                            </div>
                        </div>
                        <div className="flex justify-end space-x-2 mt-6">
                            <button type="button" onClick={handleCloseUploadModal} className="px-4 py-2 rounded-md bg-cratic-subtle hover:bg-cratic-border">Cancel</button>
                            <button type="button" onClick={handleConfirmUpload} disabled={!selectedFile || !selectedStoreForUpload || !versionNumber.trim()} className="px-4 py-2 rounded-md bg-cratic-purple hover:bg-cratic-purple-hover text-white disabled:bg-slate-300">Upload</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManagementView;