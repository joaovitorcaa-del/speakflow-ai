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
  stopListening: () => string;
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
  const isActiveRef = useRef(false);
  const restartCountRef = useRef(0);
  const maxRestarts = 3;

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

  // Request microphone access
  const requestMicrophoneAccess = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Check if track is active
      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack || !audioTrack.enabled) {
        throw new Error('Microphone track not active');
      }
      // Stop the stream immediately, we just needed permission
      stream.getTracks().forEach(track => track.stop());
      setPermissionStatus('granted');
      setError(null);
      return true;
    } catch (err) {
      console.error('Microphone access error:', err);
      setPermissionStatus('denied');
      setError('Microphone permission required');
      onError?.('Microphone permission required');
      return false;
    }
  }, [onError]);

  // Initialize recognition
  const initRecognition = useCallback(() => {
    if (!isSupported) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();
    
    // iOS Safari works better with non-continuous mode
    // We'll accumulate transcripts manually
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
        // This is normal, just restart if we're still supposed to be listening
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
        // Aborted is fine, happens on stop
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

    // Request permission first
    const hasPermission = await requestMicrophoneAccess();
    if (!hasPermission) {
      return false;
    }

    // Reset state
    accumulatedRef.current = '';
    finalTranscriptRef.current = '';
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
  }, [isSupported, requestMicrophoneAccess, initRecognition, onError]);

  const stopListening = useCallback((): string => {
    console.log('[SpeechRecognition] Stop requested');
    isActiveRef.current = false;
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error('[SpeechRecognition] Stop error:', err);
      }
    }
    
    setIsListening(false);
    const finalText = accumulatedRef.current.trim();
    
    if (finalText) {
      onResult?.(finalText);
    }
    
    return finalText;
  }, [onResult]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    accumulatedRef.current = '';
    finalTranscriptRef.current = '';
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
