/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, LanguageCode, supportedLanguages, languageFlags } from '../types';
import * as geminiService from '../services/geminiService';
import Spinner from './Spinner';
import SendIcon from './icons/SendIcon';
import RefreshIcon from './icons/RefreshIcon';
import MicrophoneIcon from './icons/MicrophoneIcon';
import SpeakerIcon from './icons/SpeakerIcon';
import StopIcon from './icons/StopIcon';

// Add SpeechRecognition to window type for browsers that support it (e.g., Chrome)
declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

// Audio Helper Functions
function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext): Promise<AudioBuffer> {
    // Gemini TTS provides raw PCM data at 24000Hz, 1 channel, Int16
    const sampleRate = 24000;
    const numChannels = 1;
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}


interface ChatInterfaceProps {
    documentName: string;
    history: ChatMessage[];
    isQueryLoading: boolean;
    onSendMessage: (message: string) => void;
    onNewChat: () => void;
    suggestions: string[];
    language: LanguageCode;
    onLanguageChange: (lang: LanguageCode) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ documentName, history, isQueryLoading, onSendMessage, onNewChat, suggestions, language, onLanguageChange }) => {
    const [query, setQuery] = useState('');
    const [currentSuggestion, setCurrentSuggestion] = useState('');
    const [modalContent, setModalContent] = useState<string | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    
    // Speech Recognition (Input) state
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any | null>(null);
    const [isSpeechRecognitionSupported, setIsSpeechRecognitionSupported] = useState(false);

    // Text-to-Speech (Output) state
    const [speakingMessageIndex, setSpeakingMessageIndex] = useState<number | null>(null);
    const [audioLoadingIndex, setAudioLoadingIndex] = useState<number | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

    // Effect for setting up Speech Recognition
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            setIsSpeechRecognitionSupported(true);
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = language;

            recognition.onstart = () => setIsListening(true);
            recognition.onend = () => setIsListening(false);
            recognition.onerror = (event: any) => {
                console.error("Speech recognition error", event.error);
                setIsListening(false);
            };
            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                setQuery(transcript);
            };
            
            recognitionRef.current = recognition;
        } else {
            console.warn("Speech Recognition API is not supported in this browser.");
            setIsSpeechRecognitionSupported(false);
        }
    }, [language]);
    
    // Effect for Text-to-Speech cleanup
    useEffect(() => {
        return () => {
            if (audioSourceRef.current) {
                audioSourceRef.current.stop();
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, []);

    const handleMicClick = () => {
        if (!recognitionRef.current) return;
        if (isListening) {
            recognitionRef.current.stop();
        } else {
            recognitionRef.current.start();
        }
    };
    
    const handleSpeak = async (text: string, index: number) => {
        if (speakingMessageIndex === index) {
            if (audioSourceRef.current) {
                audioSourceRef.current.stop();
            }
            return;
        }

        if (audioSourceRef.current) {
            audioSourceRef.current.stop();
        }

        setAudioLoadingIndex(index);
        setSpeakingMessageIndex(null);

        try {
            if (window.aistudio) {
                const hasKey = await window.aistudio.hasSelectedApiKey();
                if (!hasKey) {
                    await window.aistudio.openSelectKey();
                }
            }
            const base64Audio = await geminiService.generateSpeech(text);

            if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            }
            
            const audioContext = audioContextRef.current;
            const audioBuffer = await decodeAudioData(decode(base64Audio), audioContext);
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            
            source.onended = () => {
                if (audioSourceRef.current === source) {
                    setSpeakingMessageIndex(null);
                    audioSourceRef.current = null;
                }
            };
            
            source.start();
            audioSourceRef.current = source;
            setSpeakingMessageIndex(index);

        } catch (error) {
            console.error('Error generating or playing speech:', error);
            const errorDetails = geminiService.getApiErrorDetails(error);
            if (errorDetails) {
                alert(errorDetails.message);
            } else {
                alert('Sorry, there was an error generating audio for this message.');
            }
        } finally {
            setAudioLoadingIndex(null);
        }
    };


    useEffect(() => {
        if (suggestions.length === 0) {
            setCurrentSuggestion('');
            return;
        }

        setCurrentSuggestion(suggestions[0]);
        let suggestionIndex = 0;
        const intervalId = setInterval(() => {
            suggestionIndex = (suggestionIndex + 1) % suggestions.length;
            setCurrentSuggestion(suggestions[suggestionIndex]);
        }, 5000);

        return () => clearInterval(intervalId);
    }, [suggestions]);
    
    const renderMarkdown = (text: string) => {
        if (!text) return { __html: '' };

        const lines = text.split('\n');
        let html = '';
        let listType: 'ul' | 'ol' | null = null;
        let paraBuffer = '';

        function flushPara() {
            if (paraBuffer) {
                html += `<p class="my-2">${paraBuffer}</p>`;
                paraBuffer = '';
            }
        }

        function flushList() {
            if (listType) {
                html += `</${listType}>`;
                listType = null;
            }
        }

        for (const rawLine of lines) {
            const line = rawLine
                .replace(/\*\*(.*?)\*\*|__(.*?)__/g, '<strong>$1$2</strong>')
                .replace(/\*(.*?)\*|_(.*?)_/g, '<em>$1$2</em>')
                .replace(/`([^`]+)`/g, '<code class="bg-cratic-subtle px-1 py-0.5 rounded-sm font-mono text-sm">$1</code>');

            const isOl = line.match(/^\s*\d+\.\s(.*)/);
            const isUl = line.match(/^\s*[\*\-]\s(.*)/);

            if (isOl) {
                flushPara();
                if (listType !== 'ol') {
                    flushList();
                    html += '<ol class="list-decimal list-inside my-2 pl-5 space-y-1">';
                    listType = 'ol';
                }
                html += `<li>${isOl[1]}</li>`;
            } else if (isUl) {
                flushPara();
                if (listType !== 'ul') {
                    flushList();
                    html += '<ul class="list-disc list-inside my-2 pl-5 space-y-1">';
                    listType = 'ul';
                }
                html += `<li>${isUl[1]}</li>`;
            } else {
                flushList();
                if (line.trim() === '') {
                    flushPara();
                } else {
                    paraBuffer += (paraBuffer ? '<br/>' : '') + line;
                }
            }
        }

        flushPara();
        flushList();

        return { __html: html };
    };


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            onSendMessage(query);
            setQuery('');
        }
    };

    const handleSourceClick = (text: string) => {
        setModalContent(text);
    };

    const closeModal = () => {
        setModalContent(null);
    };

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [history, isQueryLoading]);

    return (
        <div className="flex flex-col h-full bg-cratic-panel">
            <header className="p-4 bg-cratic-panel z-10 flex justify-between items-center border-b border-cratic-border flex-shrink-0">
                <div className="w-full max-w-4xl mx-auto flex flex-col sm:flex-row justify-between sm:items-center gap-2 px-2 sm:px-4">
                    <h1 className="text-xl sm:text-2xl font-bold text-cratic-text-primary truncate" title={`Chat with ${documentName}`}>Chat with {documentName}</h1>
                    <div className="flex items-center space-x-2 self-end sm:self-center">
                        <div className="relative">
                            <select
                                value={language}
                                onChange={(e) => onLanguageChange(e.target.value as LanguageCode)}
                                className="appearance-none bg-cratic-subtle border border-cratic-border rounded-full py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-cratic-purple"
                                aria-label="Select language"
                            >
                                {Object.entries(supportedLanguages).map(([code, name]) => (
                                    <option key={code} value={code}>
                                        {languageFlags[code as LanguageCode]} {name}
                                    </option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-cratic-text-secondary">
                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                            </div>
                        </div>
                        <button
                            onClick={onNewChat}
                            className="flex items-center px-4 py-2 bg-cratic-purple hover:bg-cratic-purple-hover rounded-full text-white transition-colors flex-shrink-0"
                            title="End current chat and start a new one"
                        >
                            <RefreshIcon />
                            <span className="ml-2 hidden sm:inline">New Chat</span>
                        </button>
                    </div>
                </div>
            </header>

            <div className="flex-grow overflow-y-auto px-4 pt-6 pb-4">
                <div className="w-full max-w-4xl mx-auto space-y-6">
                    {history.map((message, index) => (
                        <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xl lg:max-w-2xl px-5 py-3 rounded-2xl group relative ${
                                message.role === 'user' 
                                ? 'bg-cratic-purple text-white' 
                                : 'bg-cratic-subtle text-cratic-text-primary'
                            }`}>
                                <div dangerouslySetInnerHTML={renderMarkdown(message.parts[0].text)} />

                                {message.role === 'model' && (
                                     <button
                                        onClick={() => handleSpeak(message.parts[0].text, index)}
                                        className="absolute top-1 right-1 p-1 rounded-full bg-slate-200/50 text-cratic-text-secondary hover:bg-slate-300/50 transition-opacity disabled:opacity-50"
                                        aria-label={speakingMessageIndex === index ? 'Stop speaking' : 'Speak message'}
                                        title={speakingMessageIndex === index ? 'Stop speaking' : 'Speak message'}
                                        disabled={audioLoadingIndex !== null}
                                    >
                                        {audioLoadingIndex === index ? <Spinner /> : (speakingMessageIndex === index ? <StopIcon /> : <SpeakerIcon />)}
                                    </button>
                                )}

                                {message.role === 'model' && message.groundingChunks && message.groundingChunks.length > 0 && (
                                    <div className="mt-4 pt-3 border-t border-slate-300/50">
                                        <h4 className="text-xs font-semibold text-cratic-text-secondary mb-2 text-right">Sources:</h4>
                                        <div className="flex flex-wrap gap-2 justify-end">
                                            {message.groundingChunks.map((chunk, chunkIndex) => (
                                                chunk.retrievedContext?.text && (
                                                    <button
                                                        key={chunkIndex}
                                                        onClick={() => handleSourceClick(chunk.retrievedContext!.text!)}
                                                        className="bg-cratic-subtle hover:bg-cratic-border text-xs px-3 py-1 rounded-md transition-colors"
                                                        aria-label={`View source ${chunkIndex + 1}`}
                                                        title="View source document chunk"
                                                    >
                                                        Source {chunkIndex + 1}
                                                    </button>
                                                )
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {isQueryLoading && (
                        <div className="flex justify-start">
                            <div className="max-w-xl lg:max-w-2xl px-5 py-3 rounded-2xl bg-cratic-subtle flex items-center">
                                <Spinner />
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>
            </div>

            <div className="p-2 sm:p-4 bg-cratic-panel flex-shrink-0">
                 <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-2 min-h-[3rem] flex items-center justify-center">
                        {!isQueryLoading && currentSuggestion && (
                            <button
                                onClick={() => setQuery(currentSuggestion)}
                                className="text-sm sm:text-base text-cratic-text-primary bg-cratic-panel hover:bg-cratic-subtle border border-cratic-border transition-colors px-4 py-2 rounded-full"
                                title="Use this suggestion as your prompt"
                            >
                                Try: "{currentSuggestion}"
                            </button>
                        )}
                    </div>
                     <form onSubmit={handleSubmit} className="flex items-center space-x-2 sm:space-x-3">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Ask a question about the SOPs..."
                            className="flex-grow bg-cratic-panel border border-cratic-border rounded-full py-2 px-4 sm:py-3 sm:px-5 focus:outline-none focus:ring-2 focus:ring-cratic-purple"
                            disabled={isQueryLoading}
                        />
                         {isSpeechRecognitionSupported && (
                            <button type="button" onClick={handleMicClick} disabled={isQueryLoading} className={`p-2 sm:p-3 rounded-full text-white transition-colors ${isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-cratic-purple hover:bg-cratic-purple-hover'}`} title="Ask with your voice">
                                <MicrophoneIcon isListening={isListening}/>
                            </button>
                        )}
                        <button type="submit" disabled={isQueryLoading || !query.trim()} className="p-2 sm:p-3 bg-cratic-purple hover:bg-cratic-purple-hover rounded-full text-white disabled:bg-slate-300 transition-colors" title="Send message">
                            <SendIcon />
                        </button>
                    </form>
                </div>
            </div>

            {modalContent !== null && (
                <div 
                    className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" 
                    onClick={closeModal} 
                    role="dialog" 
                    aria-modal="true"
                    aria-labelledby="source-modal-title"
                >
                    <div className="bg-cratic-panel p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <h3 id="source-modal-title" className="text-xl font-bold mb-4">Source Text</h3>
                        <div 
                            className="flex-grow overflow-y-auto pr-4 text-cratic-text-secondary border-t border-b border-cratic-border py-4"
                            dangerouslySetInnerHTML={renderMarkdown(modalContent || '')}
                        >
                        </div>
                        <div className="flex justify-end mt-6">
                            <button onClick={closeModal} className="px-6 py-2 rounded-md bg-cratic-purple hover:bg-cratic-purple-hover text-white transition-colors" title="Close source view">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatInterface;
