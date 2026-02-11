import { useState, useRef, useCallback, useEffect } from 'react';

interface UseSpeechRecognitionOptions {
  onResult?: (transcript: string) => void;
  onError?: (error: string) => void;
  onPartialResult?: (transcript: string) => void;
  continuous?: boolean;
  language?: string;
}

interface UseSpeechRecognitionReturn {
  transcript: string;
  isListening: boolean;
  isSupported: boolean;
  startListening: () => Promise<boolean>;
  stopListening: () => Promise<string>;
  resetTranscript: () => void;
  permissionStatus: 'granted' | 'denied' | 'prompt' | 'unknown';
  error: string | null;
}

export function useSpeechRecognition({
  onResult,
  onError,
  onPartialResult,
  continuous = false,
  language = 'en-US'
}: UseSpeechRecognitionOptions = {}): UseSpeechRecognitionReturn {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
  const [error, setError] = useState<string | null>(null);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef('');
  const accumulatedRef = useRef('');
  const lastInterimRef = useRef('');
  const isActiveRef = useRef(false);
  const restartCountRef = useRef(0);
  const maxRestarts = 8;

  const isSupported = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  // Check microphone permission
  const checkPermission = useCallback(async () => {
    try {
      if (!navigator.permissions) {
        setPermissionStatus('unknown');
        return 'unknown';
      }
      
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      setPermissionStatus(result.state as 'granted' | 'denied' | 'prompt');
      
      result.onchange = () => {
        setPermissionStatus(result.state as 'granted' | 'denied' | 'prompt');
      };
      
      return result.state;
    } catch {
      setPermissionStatus('unknown');
      return 'unknown';
    }
  }, []);

  // Initialize recognition
  const initRecognition = useCallback(() => {
    if (!isSupported) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();
    
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = language;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log('[SpeechRecognition] Started');
      setIsListening(true);
      setError(null);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let sessionFinal = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          sessionFinal += result[0].transcript + ' ';
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      // Save interim as fallback for iOS
      if (interimTranscript) {
        lastInterimRef.current = interimTranscript;
      }

      if (sessionFinal) {
        accumulatedRef.current += sessionFinal;
        finalTranscriptRef.current = accumulatedRef.current;
      }

      const currentTranscript = (accumulatedRef.current + interimTranscript).trim();
      setTranscript(currentTranscript);
      onPartialResult?.(currentTranscript);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      console.error('[SpeechRecognition] Error:', event.error);
      
      if (event.error === 'not-allowed') {
        setPermissionStatus('denied');
        setError('Microphone permission denied');
        onError?.('Microphone permission denied');
        isActiveRef.current = false;
        setIsListening(false);
      } else if (event.error === 'no-speech') {
        if (isActiveRef.current && continuous && restartCountRef.current < maxRestarts) {
          console.log('[SpeechRecognition] No speech detected, restarting...');
          restartCountRef.current++;
          setTimeout(() => {
            if (isActiveRef.current && recognitionRef.current) {
              try {
                recognitionRef.current.start();
              } catch (e) {
                console.error('[SpeechRecognition] Restart failed:', e);
              }
            }
          }, 100);
        }
      } else if (event.error === 'aborted') {
        setIsListening(false);
      } else {
        setError(`Speech recognition error: ${event.error}`);
        onError?.(event.error);
      }
    };

    recognition.onend = () => {
      console.log('[SpeechRecognition] Ended, active:', isActiveRef.current);
      
      // Auto-restart in continuous mode if still active
      if (isActiveRef.current && continuous && restartCountRef.current < maxRestarts) {
        console.log('[SpeechRecognition] Restarting for continuous mode...');
        restartCountRef.current++;
        setTimeout(() => {
          if (isActiveRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              console.error('[SpeechRecognition] Restart failed:', e);
              setIsListening(false);
            }
          }
        }, 100);
      } else {
        setIsListening(false);
        // Use lastInterimRef as fallback if accumulated is empty (iOS fix)
        if (!accumulatedRef.current.trim() && lastInterimRef.current.trim()) {
          console.log('[SpeechRecognition] Using interim fallback for iOS');
          accumulatedRef.current = lastInterimRef.current;
          finalTranscriptRef.current = lastInterimRef.current;
          setTranscript(lastInterimRef.current.trim());
        }
        const finalText = accumulatedRef.current.trim();
        if (finalText && !isActiveRef.current) {
          onResult?.(finalText);
        }
      }
    };

    return recognition;
  }, [isSupported, continuous, language, onResult, onError, onPartialResult]);

  // Initialize on mount
  useEffect(() => {
    checkPermission();
    recognitionRef.current = initRecognition();

    return () => {
      isActiveRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // Ignore
        }
      }
    };
  }, [checkPermission, initRecognition]);

  const startListening = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError('Speech recognition not supported');
      onError?.('Speech recognition not supported');
      return false;
    }

    // Reset state
    accumulatedRef.current = '';
    finalTranscriptRef.current = '';
    lastInterimRef.current = '';
    restartCountRef.current = 0;
    setTranscript('');
    setError(null);

    // Reinitialize recognition (helps with iOS issues)
    recognitionRef.current = initRecognition();

    if (!recognitionRef.current) {
      setError('Failed to initialize speech recognition');
      return false;
    }

    isActiveRef.current = true;
    
    try {
      recognitionRef.current.start();
      console.log('[SpeechRecognition] Start requested');
      return true;
    } catch (err) {
      console.error('[SpeechRecognition] Start error:', err);
      isActiveRef.current = false;
      setError('Failed to start speech recognition');
      onError?.('Failed to start speech recognition');
      return false;
    }
  }, [isSupported, initRecognition, onError]);

  const stopListening = useCallback(async (): Promise<string> => {
    console.log('[SpeechRecognition] Stop requested');
    isActiveRef.current = false;
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error('[SpeechRecognition] Stop error:', err);
      }
    }
    
    // Wait for iOS to deliver final result
    await new Promise(resolve => setTimeout(resolve, 350));
    
    setIsListening(false);
    
    // Use accumulated or interim fallback
    let finalText = accumulatedRef.current.trim();
    if (!finalText && lastInterimRef.current.trim()) {
      console.log('[SpeechRecognition] Using interim fallback in stopListening');
      finalText = lastInterimRef.current.trim();
    }
    
    if (finalText) {
      onResult?.(finalText);
    }
    
    return finalText;
  }, [onResult]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    accumulatedRef.current = '';
    finalTranscriptRef.current = '';
    lastInterimRef.current = '';
    restartCountRef.current = 0;
  }, []);

  return {
    transcript,
    isListening,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
    permissionStatus,
    error
  };
}
