/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import ChatbotView from './components/ChatbotView';
import ManagementView from './components/ManagementView';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardView from './components/dashboard/DashboardView';
import * as geminiService from './services/geminiService';

export type View = 'chat' | 'management' | 'dashboard' | 'placeholder';

export interface AppError {
    message: string;
    isApiKeyError?: boolean;
}

// Add aistudio to the window type for the API key selector
declare global {
    // FIX: Define an AIStudio interface to resolve the type conflict error.
    interface AIStudio {
        openSelectKey: () => Promise<void>;
        hasSelectedApiKey: () => Promise<boolean>;
    }
    interface Window {
        aistudio?: AIStudio;
    }
}


const App: React.FC = () => {
    const [view, setView] = useState<View>('dashboard');
    const [error, setError] = useState<AppError | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [reloadCounter, setReloadCounter] = useState(0);

    const handleSetView = (newView: View) => {
        setView(newView);
        setIsSidebarOpen(false); // Close sidebar on navigation on mobile
    };

    const handleTryAgain = () => {
        setError(null);
        setView('dashboard');
    };

    const handleError = (message: string, err: any) => {
        console.error(message, err);
        const apiErrorDetails = geminiService.getApiErrorDetails(err);
        if (apiErrorDetails) {
            setError(apiErrorDetails);
        } else {
            const fullMessage = `${message}${err ? `: ${err instanceof Error ? err.message : String(err)}` : ''}`;
            setError({ message: fullMessage });
        }
    };

    const handleChangeApiKey = async () => {
        if (window.aistudio?.openSelectKey) {
            await window.aistudio.openSelectKey();
            // After selecting a new key, clear the error and force a reload of the current view.
            // This ensures components that load data on mount (like ManagementView) will retry with the new key.
            setError(null);
            setReloadCounter(c => c + 1);
        } else {
            alert("API Key selection utility is not available.");
        }
    };

    const renderContent = () => {
        if (error) {
            return (
                <div className="flex flex-col items-center justify-center h-full bg-red-50 text-red-800 p-4 text-center">
                    <h1 className="text-3xl font-bold mb-4">Application Error</h1>
                    <p className="max-w-lg mb-6">{error.message}</p>
                    
                    {error.isApiKeyError ? (
                        <div className="flex flex-col items-center space-y-3">
                            <button onClick={handleChangeApiKey} className="px-5 py-2 rounded-md bg-yellow-400 text-yellow-900 font-semibold hover:bg-yellow-500 transition-colors" title="Select a different API key">
                                Change API Key
                            </button>
                             <p className="text-xs text-slate-500 max-w-sm">If the problem persists after changing the key, please ensure your Google Cloud project has the 'Vertex AI API' enabled and billing is active.</p>
                        </div>
                    ) : (
                        <button onClick={handleTryAgain} className="px-4 py-2 rounded-md bg-cratic-purple text-white hover:bg-cratic-purple-hover transition-colors" title="Return to the welcome screen">
                            Try Again
                        </button>
                    )}
                </div>
            );
        }
        
        switch(view) {
            case 'chat':
                return <ChatbotView handleError={handleError} />;
            case 'management':
                return <ManagementView key={reloadCounter} handleError={handleError} />;
            case 'dashboard':
                 return <DashboardView />;
            default:
                 return <DashboardView />;
        }
    };

    return (
         <div className="h-screen bg-cratic-background text-cratic-text-primary flex relative overflow-hidden md:overflow-auto">
            <Sidebar currentView={view} setView={handleSetView} isOpen={isSidebarOpen} closeSidebar={() => setIsSidebarOpen(false)} />
            <div className="flex-1 flex flex-col overflow-hidden">
                {!error && <Header toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />}
                <main className="flex-grow overflow-y-auto">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};

export default App;