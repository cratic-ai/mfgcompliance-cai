/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { RagStore, Document, CustomMetadata } from '../types';
import * as geminiService from '../services/geminiService';
import Spinner from './Spinner';
import UploadIcon from './icons/UploadIcon';
import TrashIcon from './icons/TrashIcon';
import PlusIcon from './icons/PlusIcon';
import SortIcon from './icons/SortIcon';

interface VersionControlViewProps {
    handleError: (message: string, err: any) => void;
}

interface VersionedDocument extends Document {
    version: string;
    notes: string;
}

const STORE_DISPLAY_NAME = "SOP Master Database";

const VersionControlView: React.FC<VersionControlViewProps> = ({ handleError }) => {
    const [store, setStore] = useState<RagStore | null>(null);
    const [versions, setVersions] = useState<VersionedDocument[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [processingFile, setProcessingFile] = useState<string | null>(null);
    const [apiKeyReady, setApiKeyReady] = useState<boolean | null>(null);
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [versionNumber, setVersionNumber] = useState('');
    const [changeNotes, setChangeNotes] = useState('');

    const [sortConfig, setSortConfig] = useState<{ key: keyof VersionedDocument; direction: 'asc' | 'desc' }>({ key: 'version', direction: 'desc' });

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            let allStores = await geminiService.listRagStores();
            let targetStore = allStores.find(s => s.displayName === STORE_DISPLAY_NAME);

            if (!targetStore) {
                const newStoreName = await geminiService.createRagStore(STORE_DISPLAY_NAME);
                targetStore = { name: newStoreName, displayName: STORE_DISPLAY_NAME };
            }
            setStore(targetStore);

            const docsInStore = await geminiService.listDocumentsInStore(targetStore.name);
            const versionedDocs: VersionedDocument[] = docsInStore.map(doc => {
                const versionMeta = doc.customMetadata?.find(m => m.key === 'version');
                const notesMeta = doc.customMetadata?.find(m => m.key === 'notes');
                return {
                    ...doc,
                    version: versionMeta?.stringValue || 'N/A',
                    notes: notesMeta?.stringValue || '—',
                };
            });
            setVersions(versionedDocs);

        } catch (err) {
            handleError("Failed to initialize Version Control", err);
        } finally {
            setIsLoading(false);
        }
    }, [handleError]);

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

    const handleOpenModal = () => setIsModalOpen(true);
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedFile(null);
        setVersionNumber('');
        setChangeNotes('');
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) setSelectedFile(file);
    };

    const handleUpload = async () => {
        if (!selectedFile || !store || !versionNumber.trim()) return;

        setProcessingFile(selectedFile.name);
        handleCloseModal();

        try {
            const metadata: CustomMetadata[] = [
                { key: 'version', stringValue: versionNumber.trim() },
                { key: 'notes', stringValue: changeNotes.trim() }
            ];
            await geminiService.uploadDocument(store.name, selectedFile, metadata);
            await loadData(); // Refresh data after upload
        } catch (err) {
            handleError(`Failed to upload ${selectedFile.name}`, err);
        } finally {
            setProcessingFile(null);
        }
    };
    
    const handleDelete = async (doc: VersionedDocument) => {
        if (window.confirm(`Are you sure you want to delete "${doc.displayName}" (Version: ${doc.version})?`)) {
            try {
                await geminiService.deleteDocument(doc.name);
                setVersions(prev => prev.filter(v => v.name !== doc.name));
            } catch (err) {
                handleError(`Failed to delete document ${doc.displayName}`, err);
            }
        }
    };

    const sortedVersions = useMemo(() => {
        return [...versions].sort((a, b) => {
            const valA = a[sortConfig.key] ?? '';
            const valB = b[sortConfig.key] ?? '';
            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [versions, sortConfig]);

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
                <p className="max-w-md mb-6 text-cratic-text-secondary">Please select an API key to access version control features.</p>
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
            return Array.from({ length: 5 }).map((_, index) => (
                <tr key={index} className="animate-pulse"><td className="p-4" colSpan={4}><div className="h-4 bg-cratic-subtle rounded"></div></td></tr>
            ));
        }
        if (sortedVersions.length === 0) {
            return <tr><td colSpan={4} className="text-center p-8 text-cratic-text-secondary">No versions found. Upload one to get started.</td></tr>;
        }
        return sortedVersions.map((doc) => (
            <tr key={doc.name} className="group hover:bg-cratic-subtle/50">
                <td className="p-3 font-medium text-cratic-text-primary truncate" title={doc.displayName}>{doc.displayName}</td>
                <td className="p-3 text-sm font-semibold text-cratic-purple-text truncate" title={doc.version}>{doc.version}</td>
                <td className="p-3 text-sm text-cratic-text-secondary truncate" title={doc.notes}>{doc.notes}</td>
                <td className="p-3 text-right">
                    <button onClick={() => handleDelete(doc)} className="p-1 text-red-400 hover:text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" aria-label={`Delete ${doc.displayName}`} title={`Delete ${doc.displayName}`}>
                        <TrashIcon />
                    </button>
                </td>
            </tr>
        ));
    };

    return (
        <div className="p-4 sm:p-6 h-full flex flex-col">
            <header className="mb-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-cratic-text-primary">SOP Database Version Control</h1>
                <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 mt-4">
                    <p className="flex-grow text-sm text-cratic-text-secondary">Managing versions in store: <span className="font-semibold text-cratic-text-primary">{STORE_DISPLAY_NAME}</span></p>
                    <button onClick={handleOpenModal} className="flex-shrink-0 flex items-center px-4 py-1.5 bg-cratic-purple hover:bg-cratic-purple-hover rounded-md text-white transition-colors disabled:bg-slate-300" disabled={!store || !!processingFile} title="Upload a new database version">
                        <UploadIcon /> <span className="ml-2">Upload New Version</span>
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
                                <th className="p-3 w-2/5 whitespace-nowrap"><button onClick={() => handleSort('displayName')} className="flex items-center hover:text-cratic-text-primary">File Name <SortIcon className={sortConfig.key === 'displayName' ? 'text-cratic-text-primary' : ''}/></button></th>
                                <th className="p-3 w-1/5 whitespace-nowrap"><button onClick={() => handleSort('version')} className="flex items-center hover:text-cratic-text-primary">Version <SortIcon className={sortConfig.key === 'version' ? 'text-cratic-text-primary' : ''}/></button></th>
                                <th className="p-3 w-2/5 whitespace-nowrap">Change Notes</th>
                                <th className="p-3 w-1/5 text-right whitespace-nowrap">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-cratic-border">{renderTableContent()}</tbody>
                    </table>
                </div>
            </div>

             {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="upload-version-title">
                    <div className="bg-cratic-panel p-6 rounded-lg shadow-xl w-full max-w-lg">
                        <h3 id="upload-version-title" className="text-xl font-bold mb-4">Upload New Version</h3>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="file-upload-version" className="block text-sm font-medium text-cratic-text-primary mb-1">Database File</label>
                                <input id="file-upload-version" type="file" onChange={handleFileChange} className="w-full text-sm text-cratic-text-primary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cratic-purple file:text-white hover:file:bg-cratic-purple-hover" />
                                {selectedFile && <p className="text-sm mt-2 text-cratic-text-secondary">Selected: {selectedFile.name}</p>}
                            </div>
                            <div>
                                <label htmlFor="version-number" className="block text-sm font-medium text-cratic-text-primary mb-1">Version Number <span className="text-red-500">*</span></label>
                                <input id="version-number" type="text" value={versionNumber} onChange={(e) => setVersionNumber(e.target.value)} placeholder="e.g., 2.1.0" className="w-full bg-cratic-subtle border border-cratic-border rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-cratic-purple" />
                            </div>
                             <div>
                                <label htmlFor="change-notes" className="block text-sm font-medium text-cratic-text-primary mb-1">Change Notes</label>
                                <textarea id="change-notes" value={changeNotes} onChange={(e) => setChangeNotes(e.target.value)} placeholder="e.g., Updated safety protocols for Section 5." rows={3} className="w-full bg-cratic-subtle border border-cratic-border rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-cratic-purple" />
                            </div>
                        </div>
                        <div className="flex justify-end space-x-2 mt-6">
                            <button type="button" onClick={handleCloseModal} className="px-4 py-2 rounded-md bg-cratic-subtle hover:bg-cratic-border">Cancel</button>
                            <button type="button" onClick={handleUpload} disabled={!selectedFile || !versionNumber.trim()} className="px-4 py-2 rounded-md bg-cratic-purple hover:bg-cratic-purple-hover text-white disabled:bg-slate-300">Upload</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VersionControlView;