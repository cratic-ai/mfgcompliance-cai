/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useRef, useEffect, useCallback } from 'react';
// FIX: LiveSession is not an exported member of @google/genai.
import { GoogleGenAI, LiveServerMessage, Modality, Blob as GenAI_Blob } from "@google/genai";
import { TranscriptEntry } from '../types';

// FIX: Define the LiveSession type locally based on its usage in this file.
type LiveSession = {
    sendRealtimeInput(params: { media: GenAI_Blob }): void;
    close(): void;
};

interface LiveDemoViewProps {
    handleError: (message: string, err: any) => void;
}

const LiveDemoView: React.FC<LiveDemoViewProps> = ({ handleError }) => {
    const [status, setStatus] = useState<'idle' | 'connecting' | 'active' | 'error'>('idle');
    const [statusMessage, setStatusMessage] = useState('Click to start the live demo');
    const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
    
    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);

    const currentInputTranscription = useRef('');
    const currentOutputTranscription = useRef('');

    const transcriptEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcripts]);

    const handleEndDemo = useCallback(() => {
        setStatus('idle');
        setStatusMessage('Click to start the live demo');
        
        if (sessionPromiseRef.current) {
            sessionPromiseRef.current.then(session => session.close());
            sessionPromiseRef.current = null;
        }

        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }

        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }

        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
            inputAudioContextRef.current.close();
            inputAudioContextRef.current = null;
        }

        if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
            sourcesRef.current.forEach(source => source.stop());
            sourcesRef.current.clear();
            outputAudioContextRef.current.close();
            outputAudioContextRef.current = null;
        }
    }, []);

    useEffect(() => {
        return () => handleEndDemo();
    }, [handleEndDemo]);

    const handleStartDemo = async () => {
        if (window.aistudio) {
            const hasKey = await window.aistudio.hasSelectedApiKey();
            if (!hasKey) {
                try {
                    await window.aistudio.openSelectKey();
                } catch (e) {
                    console.log("API key selection was cancelled.");
                    return; // Stop the demo if user cancels key selection
                }
            }
        }
        
        setTranscripts([]);
        setStatus('connecting');
        setStatusMessage('Initializing session...');
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            
            const outputNode = outputAudioContextRef.current.createGain();
            outputNode.connect(outputAudioContextRef.current.destination);

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        setStatus('active');
                        setStatusMessage('Listening...');
                        
                        const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
                        const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = scriptProcessor;

                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            sessionPromiseRef.current?.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContextRef.current!.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        handleTranscription(message);

                        const base64EncodedAudioString = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
                        if (base64EncodedAudioString && outputAudioContextRef.current) {
                            setStatusMessage('AI is speaking...');
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current.currentTime);
                            const audioBuffer = await decodeAudioData(decode(base64EncodedAudioString), outputAudioContextRef.current, 24000, 1);
                            
                            const source = outputAudioContextRef.current.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputNode);
                            source.addEventListener('ended', () => {
                                sourcesRef.current.delete(source);
                                if(sourcesRef.current.size === 0) {
                                    setStatusMessage('Listening...');
                                }
                            });
                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            sourcesRef.current.add(source);
                        }

                        if (message.serverContent?.interrupted) {
                            sourcesRef.current.forEach(s => s.stop());
                            sourcesRef.current.clear();
                            nextStartTimeRef.current = 0;
                            setStatusMessage('Listening...');
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        setStatus('error');
                        setStatusMessage('Session error. Please try again.');
                        handleError('Live session error', e);
                        handleEndDemo();
                    },
                    onclose: () => {
                        handleEndDemo();
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' }}},
                    systemInstruction: 'You are a helpful and friendly AI assistant for manufacturing SOPs. Keep your answers concise and clear. Do not refer to any documents unless asked.',
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                },
            });
        } catch (err) {
            handleError('Failed to start live demo', err);
            setStatus('error');
            setStatusMessage('Could not start session. Check permissions and API key.');
            handleEndDemo();
        }
    };
    
    const handleTranscription = (message: LiveServerMessage) => {
        let inputUpdated = false;
        let outputUpdated = false;

        if (message.serverContent?.inputTranscription) {
            currentInputTranscription.current += message.serverContent.inputTranscription.text;
            inputUpdated = true;
        }
        if (message.serverContent?.outputTranscription) {
            currentOutputTranscription.current += message.serverContent.outputTranscription.text;
            outputUpdated = true;
        }

        setTranscripts(prev => {
            const newTranscripts = [...prev];
            if (inputUpdated) {
                const last = newTranscripts[newTranscripts.length - 1];
                if (last && last.speaker === 'user' && !last.isFinal) {
                    last.text = currentInputTranscription.current;
                } else if(currentInputTranscription.current.trim()) {
                    newTranscripts.push({ speaker: 'user', text: currentInputTranscription.current, isFinal: false });
                }
            }
             if (outputUpdated) {
                const last = newTranscripts[newTranscripts.length - 1];
                if (last && last.speaker === 'model' && !last.isFinal) {
                    last.text = currentOutputTranscription.current;
                } else if (currentOutputTranscription.current.trim()) {
                    newTranscripts.push({ speaker: 'model', text: currentOutputTranscription.current, isFinal: false });
                }
            }
            return newTranscripts;
        });
        
        if (message.serverContent?.turnComplete) {
            const finalInput = currentInputTranscription.current;
            const finalOutput = currentOutputTranscription.current;
            setTranscripts(prev => prev.map(t => 
                (t.speaker === 'user' && t.text === finalInput) ? { ...t, isFinal: true } :
                (t.speaker === 'model' && t.text === finalOutput) ? { ...t, isFinal: true } :
                t
            ));
            currentInputTranscription.current = '';
            currentOutputTranscription.current = '';
        }
    };

    const handleButtonClick = () => {
        if (status === 'idle' || status === 'error') {
            handleStartDemo();
        } else {
            handleEndDemo();
        }
    };

    const getStatusIndicatorClass = () => {
        switch (status) {
            case 'connecting': return 'animate-pulse bg-blue-500';
            case 'active': return 'animate-pulse bg-cratic-purple';
            case 'error': return 'bg-red-500';
            default: return 'bg-slate-300';
        }
    };

    return (
        <div className="flex flex-col h-full bg-cratic-panel p-4 sm:p-6 items-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-cratic-text-primary mb-2 sm:mb-4 text-center">Live Conversation Demo</h1>
            <p className="text-cratic-text-secondary mb-4 sm:mb-8 text-center">Speak freely with the AI assistant.</p>
            
            <div className="flex-grow flex flex-col items-center justify-center w-full max-w-4xl">
                <button onClick={handleButtonClick} className="relative w-40 h-40 sm:w-48 sm:h-48 rounded-full flex items-center justify-center transition-transform transform hover:scale-105 focus:outline-none" aria-label={status === 'active' ? 'End Demo' : 'Start Demo'}>
                    <div className={`absolute inset-0 rounded-full ${getStatusIndicatorClass()} opacity-20`}></div>
                    <div className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full ${getStatusIndicatorClass()} flex items-center justify-center text-white text-lg font-semibold`}>
                        {status === 'active' ? 'End Demo' : 'Start Demo'}
                    </div>
                </button>
                <p className="mt-6 text-base sm:text-lg font-medium h-7">{statusMessage}</p>
            </div>

            <div className="w-full max-w-4xl h-2/5 sm:h-1/3 bg-cratic-subtle rounded-lg p-2 sm:p-4 overflow-y-auto border border-cratic-border">
                <div className="space-y-4">
                    {transcripts.map((entry, index) => (
                        <div key={index} className={`flex ${entry.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-prose px-4 py-2 rounded-xl ${entry.speaker === 'user' ? 'bg-cratic-purple text-white' : 'bg-white'}`}>
                                <p style={{ opacity: entry.isFinal ? 1 : 0.7 }}>
                                    {entry.text}
                                </p>
                            </div>
                        </div>
                    ))}
                    {transcripts.length === 0 && status === 'active' && (
                        <p className="text-center text-cratic-text-secondary">Start speaking to see the transcript...</p>
                    )}
                    <div ref={transcriptEndRef}></div>
                </div>
            </div>
        </div>
    );
};


// Audio Helper Functions
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
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

function createBlob(data: Float32Array): GenAI_Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

export default LiveDemoView;