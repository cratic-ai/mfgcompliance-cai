// import React, { useState, useEffect } from 'react';
// import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
// import ChatbotView from './components/ChatbotView';
// import Sidebar from './components/Sidebar';
// import Header from './components/Header';
// import DashboardView from './components/dashboard/DashboardView';
// import * as geminiService from './services/geminiService';
// import DocumentManager from './components/DocumentManager';
//
// export interface AppError {
//     message: string;
//     isApiKeyError?: boolean;
// }
//
// declare global {
//     interface AIStudio {
//         openSelectKey: () => Promise<void>;
//         hasSelectedApiKey: () => Promise<boolean>;
//     }
//     interface Window {
//         aistudio?: AIStudio;
//     }
// }
//
// // Token Handler Component
// const TokenHandler: React.FC = () => {
//     const location = useLocation();
//     const navigate = useNavigate();
//
//     useEffect(() => {
//         const searchParams = new URLSearchParams(location.search);
//         const token = searchParams.get('token');
//
//         if (token) {
//             // Store the token
//             localStorage.setItem('compliauthToken', token);
//             console.log('✅ Token received and stored successfully');
//
//             // Clean up URL - remove token from address bar
//             searchParams.delete('token');
//             const cleanSearch = searchParams.toString();
//             const cleanUrl = `${location.pathname}${cleanSearch ? `?${cleanSearch}` : ''}${location.hash}`;
//
//             // Replace the URL without reloading
//             navigate(cleanUrl, { replace: true });
//         }
//     }, [location, navigate]);
//
//     return null; // This component doesn't render anything
// };
//
// const App: React.FC = () => {
//     const [error, setError] = useState<AppError | null>(null);
//     const [isSidebarOpen, setIsSidebarOpen] = useState(false);
//     const [reloadCounter, setReloadCounter] = useState(0);
//
//     const handleTryAgain = () => {
//         setError(null);
//     };
//
//     const handleError = (message: string, err: any) => {
//         console.error(message, err);
//         const apiErrorDetails = geminiService.getApiErrorDetails(err);
//         if (apiErrorDetails) {
//             setError(apiErrorDetails);
//         } else {
//             const fullMessage = `${message}${err ? `: ${err instanceof Error ? err.message : String(err)}` : ''}`;
//             setError({ message: fullMessage });
//         }
//     };
//
//     const handleChangeApiKey = async () => {
//         if (window.aistudio?.openSelectKey) {
//             await window.aistudio.openSelectKey();
//             setError(null);
//             setReloadCounter(c => c + 1);
//         } else {
//             alert("API Key selection utility is not available.");
//         }
//     };
//
//     return (
//         <BrowserRouter>
//             <TokenHandler /> {/* Add this line to handle token from URL */}
//             <div className="h-screen bg-cratic-background text-cratic-text-primary flex relative overflow-hidden md:overflow-auto">
//                 <Sidebar
//                     isOpen={isSidebarOpen}
//                     closeSidebar={() => setIsSidebarOpen(false)}
//                 />
//                 <div className="flex-1 flex flex-col overflow-hidden">
//                     {!error && <Header toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />}
//                     <main className="flex-grow overflow-y-auto">
//                         {error ? (
//                             <div className="flex flex-col items-center justify-center h-full bg-red-50 text-red-800 p-4 text-center">
//                                 <h1 className="text-3xl font-bold mb-4">Application Error</h1>
//                                 <p className="max-w-lg mb-6">{error.message}</p>
//
//                                 {error.isApiKeyError ? (
//                                     <div className="flex flex-col items-center space-y-3">
//                                         <button onClick={handleChangeApiKey} className="px-5 py-2 rounded-md bg-yellow-400 text-yellow-900 font-semibold hover:bg-yellow-500 transition-colors">
//                                             Change API Key
//                                         </button>
//                                         <p className="text-xs text-slate-500 max-w-sm">If the problem persists after changing the key, please ensure your Google Cloud project has the 'Vertex AI API' enabled and billing is active.</p>
//                                     </div>
//                                 ) : (
//                                     <button onClick={handleTryAgain} className="px-4 py-2 rounded-md bg-cratic-purple text-white hover:bg-cratic-purple-hover transition-colors">
//                                         Try Again
//                                     </button>
//                                 )}
//                             </div>
//                         ) : (
//                             <Routes>
//                                 <Route path="/" element={<Navigate to="/dashboard" replace />} />
//                                 <Route path="/dashboard" element={<DashboardView />} />
//                                 <Route path="/chat" element={<ChatbotView handleError={handleError} />} />
//                                 <Route path="/files" element={<DocumentManager handleError={handleError} />} />
//                                 <Route path="*" element={<Navigate to="/dashboard" replace />} />
//                             </Routes>
//                         )}
//                     </main>
//                 </div>
//             </div>
//         </BrowserRouter>
//     );
// };
//
// export default App;


import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import ChatbotView from './components/ChatbotView';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardView from './components/dashboard/DashboardView';
import * as geminiService from './services/geminiService';
import DocumentManager from './components/DocumentManager';

export interface AppError {
    message: string;
    isApiKeyError?: boolean;
}

declare global {
    interface AIStudio {
        openSelectKey: () => Promise<void>;
        hasSelectedApiKey: () => Promise<boolean>;
    }
    interface Window {
        aistudio?: AIStudio;
    }
}

// Token Handler Component - Enhanced to handle embedded mode
const TokenHandler: React.FC<{ setIsEmbedded: (value: boolean) => void }> = ({ setIsEmbedded }) => {
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const token = searchParams.get('token');
        const embedded = searchParams.get('embedded');

        // Check if this is embedded in an iframe
        const isInIframe = window.self !== window.top;
        const isEmbeddedMode = embedded === 'true' || isInIframe;

        if (isEmbeddedMode) {
            setIsEmbedded(true);
            document.body.classList.add('embedded-mode');
            console.log('🖼️ Running in embedded mode');
        }

        if (token) {
            // Store the token
            localStorage.setItem('compliauthToken', token);
            console.log('✅ Token received and stored successfully');
        }

        // Clean up URL - remove sensitive params from address bar
        if (token || embedded) {
            searchParams.delete('token');
            // Keep embedded param for detection if needed

            const cleanSearch = searchParams.toString();
            const cleanUrl = `${location.pathname}${cleanSearch ? `?${cleanSearch}` : ''}${location.hash}`;

            // Replace the URL without reloading
            navigate(cleanUrl, { replace: true });
        }
    }, [location, navigate, setIsEmbedded]);

    return null; // This component doesn't render anything
};

const App: React.FC = () => {
    const [error, setError] = useState<AppError | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [reloadCounter, setReloadCounter] = useState(0);
    const [isEmbedded, setIsEmbedded] = useState(false); // Track embedded state

    const handleTryAgain = () => {
        setError(null);
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
            setError(null);
            setReloadCounter(c => c + 1);
        } else {
            alert("API Key selection utility is not available.");
        }
    };

    return (
        <BrowserRouter>
            <TokenHandler setIsEmbedded={setIsEmbedded} />
            <div className="h-screen bg-cratic-background text-cratic-text-primary flex relative overflow-hidden md:overflow-auto">
                {/* Hide Sidebar when embedded in iframe */}
                {!isEmbedded && (
                    <Sidebar
                        isOpen={isSidebarOpen}
                        closeSidebar={() => setIsSidebarOpen(false)}
                    />
                )}

                <div className={`flex-1 flex flex-col overflow-hidden ${isEmbedded ? 'w-full' : ''}`}>
                    {/* Hide Header when embedded if desired */}
                    {!error && !isEmbedded && (
                        <Header toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
                    )}

                    {/* Show a minimal header when embedded */}
                    {!error && isEmbedded && (
                        <div className="bg-white border-b border-gray-200 px-4 py-2">
                            <div className="text-sm text-gray-600">
                                CAT Portal - Embedded Mode
                            </div>
                        </div>
                    )}

                    <main className="flex-grow overflow-y-auto">
                        {error ? (
                            <div className="flex flex-col items-center justify-center h-full bg-red-50 text-red-800 p-4 text-center">
                                <h1 className="text-3xl font-bold mb-4">Application Error</h1>
                                <p className="max-w-lg mb-6">{error.message}</p>

                                {error.isApiKeyError ? (
                                    <div className="flex flex-col items-center space-y-3">
                                        <button onClick={handleChangeApiKey} className="px-5 py-2 rounded-md bg-yellow-400 text-yellow-900 font-semibold hover:bg-yellow-500 transition-colors">
                                            Change API Key
                                        </button>
                                        <p className="text-xs text-slate-500 max-w-sm">If the problem persists after changing the key, please ensure your Google Cloud project has the 'Vertex AI API' enabled and billing is active.</p>
                                    </div>
                                ) : (
                                    <button onClick={handleTryAgain} className="px-4 py-2 rounded-md bg-cratic-purple text-white hover:bg-cratic-purple-hover transition-colors">
                                        Try Again
                                    </button>
                                )}
                            </div>
                        ) : (
                            <Routes>
                                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                                <Route path="/dashboard" element={<DashboardView />} />
                                <Route path="/chat" element={<ChatbotView handleError={handleError} />} />
                                <Route path="/files" element={<DocumentManager handleError={handleError} />} />
                                <Route path="*" element={<Navigate to="/dashboard" replace />} />
                            </Routes>
                        )}
                    </main>
                </div>
            </div>
        </BrowserRouter>
    );
};

export default App;