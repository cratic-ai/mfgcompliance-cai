// services/geminiService.ts
import axios, { AxiosError } from 'axios';
import { RagStore, DocumentWithStore, CustomMetadata, GroundingChunk } from '../types';

// Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
const API_TIMEOUT = 300000; // 5 minutes for long operations

// Create axios instance with default config
export const apiClient = axios.create({
    baseURL: `${API_BASE_URL}/api`,
    timeout: API_TIMEOUT,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // Important for cookie-based auth
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('mfgcompliauthToken') || sessionStorage.getItem('mfgcompliauthToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        if (error.response?.status === 401) {
            // Handle unauthorized - redirect to login or refresh token
            console.error('Unauthorized access - please login again');
            // Optional: Clear tokens and redirect
            localStorage.removeItem('mfgcompliauthToken');
            sessionStorage.removeItem('mfgcompliauthToken');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// ============================================
// RAG Store Management
// ============================================

export async function listRagStores(): Promise<RagStore[]> {
    try {
        const response = await apiClient.get('/gemini/stores');
        return response.data.stores || [];
    } catch (error) {
        console.error('Error listing RAG stores:', error);
        throw error;
    }
}

export async function createRagStore(displayName: string): Promise<string> {
    try {
        const response = await apiClient.post('/gemini/stores', { displayName });
        return response.data.name;
    } catch (error) {
        console.error('Error creating RAG store:', error);
        throw error;
    }
}

export async function deleteRagStore(storeName: string): Promise<void> {
    try {
        // Encode the storeName to handle special characters
        const encodedStoreName = encodeURIComponent(storeName);
        await apiClient.delete(`/gemini/stores/${encodedStoreName}`);
    } catch (error) {
        console.error('Error deleting RAG store:', error);
        throw error;
    }
}

// ============================================
// Document Management
// ============================================

export async function listAllDocuments(): Promise<DocumentWithStore[]> {
    try {
        const response = await apiClient.get('/gemini/documents');
        return response.data.documents || [];
    } catch (error) {
        console.error('Error listing documents:', error);
        throw error;
    }
}

export async function listDocumentsInStore(storeName: string): Promise<DocumentWithStore[]> {
    try {
        const encodedStoreName = encodeURIComponent(storeName);
        const response = await apiClient.get(`/gemini/stores/${encodedStoreName}/documents`);
        return response.data.documents || [];
    } catch (error) {
        console.error('Error listing documents in store:', error);
        throw error;
    }
}

export async function deleteDocument(documentName: string): Promise<void> {
    try {
        // Encode the entire document path
        const encodedDocName = encodeURIComponent(documentName);
        await apiClient.delete(`/gemini/documents/${encodedDocName}`);
    } catch (error) {
        console.error('Error deleting document:', error);
        throw error;
    }
}

// ============================================
// File Upload Operations
// ============================================

export async function uploadToRagStore(
    storeName: string,
    file: File
): Promise<{ message: string; operationId: string; status: string }> {
    try {
        const formData = new FormData();
        formData.append('file', file);

        const encodedStoreName = encodeURIComponent(storeName);
        const response = await apiClient.post(
            `/gemini/stores/${encodedStoreName}/upload`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                timeout: 600000, // 10 minutes for uploads
            }
        );

        return response.data;
    } catch (error) {
        console.error('Error uploading to RAG store:', error);
        throw error;
    }
}

export async function uploadDocument(
    storeName: string,
    file: File,
    metadata?: CustomMetadata[]
): Promise<{ message: string; operationId: string; status: string }> {
    try {
        const formData = new FormData();
        formData.append('file', file);

        if (metadata && metadata.length > 0) {
            formData.append('metadata', JSON.stringify(metadata));
        }

        const encodedStoreName = encodeURIComponent(storeName);
        const response = await apiClient.post(
            `/gemini/stores/${encodedStoreName}/upload-with-metadata`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                timeout: 600000, // 10 minutes for uploads
            }
        );

        return response.data;
    } catch (error) {
        console.error('Error uploading document with metadata:', error);
        throw error;
    }
}

// ============================================
// AI Operations
// ============================================

export async function fileSearch(
    ragStoreName: string,
    query: string,
    language?: string
): Promise<{ text: string; groundingChunks: GroundingChunk[] }> {
    try {
        const response = await apiClient.post('/gemini/search', {
            ragStoreName,
            query,
            language: language || 'en',
        });

        return {
            text: response.data.text || '',
            groundingChunks: response.data.groundingChunks || [],
        };
    } catch (error) {
        console.error('Error performing file search:', error);
        throw error;
    }
}

export async function generateExampleQuestions(
    ragStoreName: string,
    language?: string
): Promise<string[]> {
    try {
        const response = await apiClient.post('/gemini/generate-questions', {
            ragStoreName,
            language: language || 'en',
        });

        return response.data.questions || [];
    } catch (error) {
        console.error('Error generating example questions:', error);
        throw error;
    }
}

// ============================================
// Text-to-Speech
// ============================================

export async function generateSpeech(text: string): Promise<string> {
    try {
        const response = await apiClient.post('/gemini/generate-speech', { text });
        return response.data.audio;
    } catch (error) {
        console.error('Error generating speech:', error);
        throw error;
    }
}

// ============================================
// Error Handling Utilities
// ============================================

export interface ApiErrorDetails {
    message: string;
    statusCode?: number;
    details?: any;
}

export function getApiErrorDetails(error: any): ApiErrorDetails | null {
    if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<any>;

        if (axiosError.response) {
            // Server responded with error
            return {
                message: axiosError.response.data?.message || 'An error occurred',
                statusCode: axiosError.response.status,
                details: axiosError.response.data,
            };
        } else if (axiosError.request) {
            // Request made but no response
            return {
                message: 'No response from server. Please check your connection.',
                details: 'Network error',
            };
        } else {
            // Error in request setup
            return {
                message: axiosError.message || 'Request failed',
            };
        }
    }

    return null;
}



export async function checkHealth(): Promise<{
    status: string;
    features: {
        database: boolean;
        websocket: boolean;
        queue: boolean;
    };
}> {
    try {
        const response = await axios.get(`${API_BASE_URL}/health`, {
            timeout: 5000,
        });
        return response.data;
    } catch (error) {
        console.error('Health check failed:', error);
        throw error;
    }
}

// ============================================
// Authentication Helper (if needed)
// ============================================

export function setAuthToken(token: string, remember: boolean = false) {
    if (remember) {
        localStorage.setItem('authToken', token);
    } else {
        sessionStorage.setItem('authToken', token);
    }
}

export function clearAuthToken() {
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
}

export function getAuthToken(): string | null {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
}

// ============================================
// Export all functions as default object
// ============================================

export default {
    // RAG Store Management
    listRagStores,
    createRagStore,
    deleteRagStore,

    // Document Management
    listAllDocuments,
    listDocumentsInStore,
    deleteDocument,

    // File Upload
    uploadToRagStore,
    uploadDocument,

    // AI Operations
    fileSearch,
    generateExampleQuestions,
    generateSpeech,

    // Utilities
    getApiErrorDetails,
    checkHealth,

    // Auth
    setAuthToken,
    clearAuthToken,
    getAuthToken,

     apiClient,
};
