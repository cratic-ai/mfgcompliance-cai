// services/geminiService.js
const API_URL = process.env.REACT_APP_API_URL || 'https://chatbot-service-one.vercel.app/api';
//  'http://localhost:3001/api';

const getAuthHeaders = () => {
    const token = localStorage.getItem('compliauthToken');
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };
};

const getAuthHeadersMultipart = () => {
    const token = localStorage.getItem('compliauthToken');
    return {
        'Authorization': `Bearer ${token}`,
    };
};

export interface ApiError {
    message: string;
    isApiKeyError: boolean;
}

export function getApiErrorDetails(error: any): ApiError | null {
    const defaultMessage = "Upload failed. This is commonly caused by an invalid API key or one that lacks the necessary permissions. Please verify your API key and permissions.";

    if (!error) return null;

    const errorMessage = (error instanceof Error ? error.message : String(error)).toLowerCase();

    if (
        errorMessage.includes('api key not valid') ||
        errorMessage.includes('requested entity was not found') ||
        errorMessage.includes('failed to get upload url') ||
        errorMessage.includes('permission denied')
    ) {
        return { message: defaultMessage, isApiKeyError: true };
    }

    return null;
}

export async function listRagStores(): Promise<RagStore[]> {
    const response = await fetch(`${API_URL}/gemini/stores`, {
        method: 'GET',
        headers: getAuthHeaders(),
    });

    if (!response.ok) {
        throw new Error('Failed to list RAG stores');
    }

    const data = await response.json();
    return data.stores;
}

export async function listAllDocuments(): Promise<DocumentWithStore[]> {
    const response = await fetch(`${API_URL}/gemini/documents`, {
        method: 'GET',
        headers: getAuthHeaders(),
    });

    if (!response.ok) {
        throw new Error('Failed to list documents');
    }

    const data = await response.json();
    return data.documents;
}

export async function listDocumentsInStore(storeName: string): Promise<DocumentWithStore[]> {
    const response = await fetch(`${API_URL}/gemini/stores/${encodeURIComponent(storeName)}/documents`, {
        method: 'GET',
        headers: getAuthHeaders(),
    });

    if (!response.ok) {
        throw new Error('Failed to list documents in store');
    }

    const data = await response.json();
    return data.documents;
}

export async function createRagStore(displayName: string): Promise<string> {
    const response = await fetch(`${API_URL}/gemini/stores`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ displayName }),
    });

    if (!response.ok) {
        throw new Error('Failed to create RAG store');
    }

    const data = await response.json();
    return data.name;
}

export async function uploadToRagStore(ragStoreName: string, file: File): Promise<void> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_URL}/gemini/stores/${encodeURIComponent(ragStoreName)}/upload`, {
        method: 'POST',
        headers: getAuthHeadersMultipart(),
        body: formData,
    });

    if (!response.ok) {
        throw new Error('Failed to upload file');
    }
}

export async function uploadDocument(ragStoreName: string, file: File, metadata: CustomMetadata[]): Promise<void> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('metadata', JSON.stringify(metadata));

    const response = await fetch(`${API_URL}/gemini/stores/${encodeURIComponent(ragStoreName)}/upload-with-metadata`, {
        method: 'POST',
        headers: getAuthHeadersMultipart(),
        body: formData,
    });

    if (!response.ok) {
        throw new Error('Failed to upload document');
    }
}

export async function fileSearch(ragStoreName: string, query: string, language: LanguageCode): Promise<QueryResult> {
    const response = await fetch(`${API_URL}/gemini/search`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ragStoreName, query, language }),
    });

    if (!response.ok) {
        throw new Error('Failed to perform search');
    }

    const data = await response.json();
    return {
        text: data.text,
        groundingChunks: data.groundingChunks,
    };
}

export async function generateExampleQuestions(ragStoreName: string, language: LanguageCode): Promise<string[]> {
    try {
        const response = await fetch(`${API_URL}/gemini/generate-questions`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ ragStoreName, language }),
        });

        if (!response.ok) {
            throw new Error('Failed to generate questions');
        }

        const data = await response.json();
        return data.questions || [];
    } catch (error) {
        console.error("Failed to generate or parse example questions:", error);
        return [];
    }
}

export async function generateSpeech(text: string): Promise<string> {
    const response = await fetch(`${API_URL}/gemini/generate-speech`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ text }),
    });

    if (!response.ok) {
        throw new Error('Failed to generate speech');
    }

    const data = await response.json();
    return data.audio;
}

export async function deleteRagStore(ragStoreName: string): Promise<void> {
    const response = await fetch(`${API_URL}/gemini/stores/${encodeURIComponent(ragStoreName)}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
    });

    if (!response.ok) {
        throw new Error('Failed to delete RAG store');
    }
}

export async function deleteDocument(documentName: string): Promise<void> {
    const response = await fetch(`${API_URL}/gemini/documents/${encodeURIComponent(documentName)}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
    });

    if (!response.ok) {
        throw new Error('Failed to delete document');
    }
}