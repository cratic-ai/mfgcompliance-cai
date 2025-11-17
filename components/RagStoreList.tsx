/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { RagStore } from '../types';
import Spinner from './Spinner';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import RefreshIcon from './icons/RefreshIcon';
import SearchIcon from './icons/SearchIcon';

interface RagStoreListProps {
    stores: RagStore[];
    selectedStore: RagStore | null;
    isLoading: boolean;
    onCreate: (displayName: string) => void;
    onSelect: (store: RagStore) => void;
    onDelete: (storeName: string) => void;
    onRefresh: () => void;
}

const RagStoreList: React.FC<RagStoreListProps> = ({ stores, selectedStore, isLoading, onCreate, onSelect, onDelete, onRefresh }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newStoreName, setNewStoreName] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const handleCreateClick = () => {
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setNewStoreName('');
    };

    const handleConfirmCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (newStoreName.trim()) {
            onCreate(newStoreName.trim());
            handleModalClose();
        }
    };

    const filteredStores = stores.filter(store =>
        store.displayName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full">
            <div className="mb-4">
                <h2 className="text-xl font-bold mb-2">Document Stores</h2>
                <div className="flex items-center space-x-2">
                    <div className="relative flex-grow">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <SearchIcon />
                        </div>
                         <input
                            type="search"
                            placeholder="Search stores..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 bg-cratic-panel border border-cratic-border rounded-md py-1.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-cratic-purple"
                        />
                    </div>
                     <button
                        onClick={onRefresh}
                        className="p-2 bg-cratic-panel hover:bg-cratic-border border border-cratic-border rounded-md text-cratic-text-primary transition-colors disabled:opacity-50"
                        disabled={isLoading}
                        aria-label="Refresh Document stores"
                        title="Refresh the list of Document stores"
                    >
                        <RefreshIcon />
                    </button>
                    <button
                        onClick={handleCreateClick}
                        className="p-2 bg-cratic-purple hover:bg-cratic-purple-hover rounded-md text-white transition-colors disabled:opacity-50"
                        disabled={isLoading}
                        aria-label="Create new Document store"
                        title="Create a new Document store"
                    >
                        <PlusIcon />
                    </button>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="create-store-title">
                    <div className="bg-cratic-panel p-6 rounded-lg shadow-xl w-full max-w-md">
                        <h3 id="create-store-title" className="text-xl font-bold mb-4">Create New Document Store</h3>
                        <form onSubmit={handleConfirmCreate}>
                            <label htmlFor="store-name" className="sr-only">Store Name</label>
                            <input
                                id="store-name"
                                type="text"
                                value={newStoreName}
                                onChange={(e) => setNewStoreName(e.target.value)}
                                placeholder="Enter store name"
                                className="w-full bg-cratic-subtle border border-cratic-border rounded-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-cratic-purple mb-4"
                                autoFocus
                            />
                            <div className="flex justify-end space-x-2">
                                <button
                                    type="button"
                                    onClick={handleModalClose}
                                    className="px-4 py-2 rounded-md bg-cratic-subtle hover:bg-cratic-border transition-colors"
                                    title="Cancel store creation"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!newStoreName.trim()}
                                    className="px-4 py-2 rounded-md bg-cratic-purple hover:bg-cratic-purple-hover text-white transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
                                    title="Create new Document store"
                                >
                                    Create
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isLoading && !stores.length ? (
                <div className="flex-grow flex items-center justify-center">
                    <Spinner />
                </div>
            ) : filteredStores.length === 0 ? (
                <div className="flex-grow flex items-center justify-center text-center text-cratic-text-secondary">
                    <p>{searchTerm ? "No stores match your search." : "No stores found. Click '+' to create one."}</p>
                </div>
            ) : (
                <ul className="space-y-2 overflow-y-auto">
                    {filteredStores.map((store) => (
                        <li key={store.name} className="flex items-center justify-between group">
                            <button
                                onClick={() => onSelect(store)}
                                className={`w-full text-left p-3 rounded-md transition-colors ${
                                    selectedStore?.name === store.name
                                        ? 'bg-cratic-purple text-white'
                                        : 'bg-cratic-panel hover:bg-cratic-border border border-cratic-border'
                                }`}
                                title={`Select ${store.displayName} to view its documents`}
                            >
                                {store.displayName}
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onDelete(store.name); }}
                                className="ml-2 p-2 text-red-400 hover:text-red-300 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                aria-label={`Delete ${store.displayName}`}
                                title={`Delete ${store.displayName}`}
                            >
                               <TrashIcon />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default RagStoreList;
