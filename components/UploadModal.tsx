/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useCallback } from 'react';
import UploadCloudIcon from './icons/UploadCloudIcon';
import CarIcon from './icons/CarIcon';
import WashingMachineIcon from './icons/WashingMachineIcon';
import Spinner from './Spinner';
import TrashIcon from './icons/TrashIcon';


interface UploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpload: (files: File[]) => void;
}

const sampleDocuments = [
    {
        name: 'Hyundai i10 Manual',
        url: 'https://www.hyundai.com/content/dam/hyundai/in/en/data/connect-to-service/owners-manual/2025/i20&i20nlineFromOct2023-Present.pdf',
        icon: <CarIcon />,
        fileName: 'hyundai-i10-manual.pdf'
    },
    {
        name: 'LG Washer Manual',
        url: 'https://www.lg.com/us/support/products/documents/WM2077CW.pdf',
        icon: <WashingMachineIcon />,
        fileName: 'lg-washer-manual.pdf'
    }
];

const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onUpload }) => {
    const [files, setFiles] = useState<File[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [loadingSample, setLoadingSample] = useState<string | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setFiles(prev => [...prev, ...Array.from(event.target.files!)]);
        }
    };
    
    const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);
        if (event.dataTransfer.files) {
            setFiles(prev => [...prev, ...Array.from(event.dataTransfer.files)]);
        }
    }, []);

    const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(true);
    }, []);
    
    const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleSelectSample = async (name: string, url: string, fileName: string) => {
        if (loadingSample) return;
        setLoadingSample(name);
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch ${name}: ${response.statusText}`);
            }
            const blob = await response.blob();
            const file = new File([blob], fileName, { type: blob.type });
            setFiles(prev => [...prev, file]);
        } catch (error) {
            console.error("Error fetching sample file:", error);
            alert(`Could not fetch the sample document. This might be due to CORS policy. Please try uploading a local file.`);
        } finally {
            setLoadingSample(null);
        }
    };

    const handleConfirmUpload = () => {
        onUpload(files);
        handleClose();
    };
    
    const handleRemoveFile = (indexToRemove: number) => {
        setFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToRemove));
    };

    const handleClose = () => {
        setFiles([]);
        onClose();
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="upload-title" onClick={handleClose}>
            <div className="bg-cratic-panel rounded-lg shadow-xl w-full max-w-3xl p-6" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h2 id="upload-title" className="text-2xl font-bold">Upload Your SOPs</h2>
                        <p className="text-cratic-text-secondary">Get started by uploading your documents.</p>
                    </div>
                     <button onClick={handleClose} className="p-2 -mt-2 -mr-2 text-3xl leading-none text-cratic-text-secondary hover:text-cratic-text-primary" aria-label="Close modal">&times;</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <div 
                            className={`relative border-2 border-dashed rounded-lg p-6 sm:p-10 text-center transition-colors h-full flex flex-col justify-center ${isDragging ? 'border-cratic-purple bg-cratic-purple-light' : 'border-cratic-border'}`}
                            onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
                        >
                            <div className="flex flex-col items-center justify-center">
                                <UploadCloudIcon />
                                <p className="mt-4 text-cratic-text-secondary">Drag & drop files here</p>
                                <input id="modal-file-upload" type="file" multiple className="hidden" onChange={handleFileChange} />
                                <label 
                                    htmlFor="modal-file-upload" 
                                    className="mt-4 cursor-pointer text-cratic-purple font-semibold hover:underline"
                                >
                                    Or browse files
                                </label>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col">
                         <h3 className="font-semibold mb-2">Try with a sample document:</h3>
                         <div className="space-y-2 mb-4">
                            {sampleDocuments.map(doc => (
                                <button
                                    key={doc.name}
                                    onClick={() => handleSelectSample(doc.name, doc.url, doc.fileName)}
                                    disabled={!!loadingSample}
                                    className="w-full bg-cratic-subtle p-3 rounded-lg border border-transparent hover:border-cratic-purple transition-colors text-left flex items-center space-x-3 disabled:opacity-50"
                                >
                                    <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-white rounded-md shadow-sm">
                                        {loadingSample === doc.name ? <Spinner /> : doc.icon}
                                    </div>
                                    <p className="font-medium text-cratic-text-primary text-sm">{doc.name}</p>
                                </button>
                            ))}
                        </div>
                        {files.length > 0 && (
                            <div className="flex-grow flex flex-col min-h-0">
                                <h4 className="font-semibold mb-2 text-sm">Selected Files ({files.length}):</h4>
                                <ul className="flex-grow overflow-y-auto space-y-1 pr-2 border-t border-cratic-border pt-2 max-h-24 md:max-h-none">
                                    {files.map((file, index) => (
                                        <li key={`${file.name}-${index}`} className="text-xs bg-cratic-subtle/50 p-2 rounded-md flex justify-between items-center group">
                                            <span className="truncate" title={file.name}>{file.name}</span>
                                            <button onClick={() => handleRemoveFile(index)} className="ml-2 p-1 text-red-400 hover:text-red-300 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" aria-label={`Remove ${file.name}`}>
                                                <TrashIcon />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-cratic-border">
                    <button onClick={handleClose} className="px-4 py-2 rounded-md bg-cratic-subtle hover:bg-cratic-border font-semibold">Cancel</button>
                    <button onClick={handleConfirmUpload} disabled={files.length === 0} className="px-6 py-2 rounded-md bg-cratic-purple text-white hover:bg-cratic-purple-hover font-bold disabled:bg-slate-300 disabled:cursor-not-allowed">
                        Upload and Chat
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UploadModal;
