import { useState, useRef, useCallback, useEffect } from 'react';

interface UseWhisperRecognitionOptions {
  onResult?: (transcript: string) => void;
  onError?: (error: string) => void;
  language?: string;
}

interface UseWhisperRecognitionReturn {
  transcript: string;
  isListening: boolean;
  isSupported: boolean;
  isTranscribing: boolean;
  startListening: () => Promise<boolean>;
  stopListening: () => Promise<string>;
  resetTranscript: () => void;
  permissionStatus: 'granted' | 'denied' | 'prompt' | 'unknown';
  error: string | null;
  mediaStream: MediaStream | null;
}

export function useWhisperRecognition({
  onResult,
  onError,
  language = 'en',
}: UseWhisperRecognitionOptions = {}): UseWhisperRecognitionReturn {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
  const [error, setError] = useState<string | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const resolveStopRef = useRef<((text: string) => void) | null>(null);

  useEffect(() => {
    onResultRef.current = onResult;
    onErrorRef.current = onError;
  });

  const isSupported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

  const checkPermission = useCallback(async () => {
    try {
      if (!navigator.permissions) { setPermissionStatus('unknown'); return; }
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      setPermissionStatus(result.state as any);
      result.onchange = () => setPermissionStatus(result.state as any);
    } catch {
      setPermissionStatus('unknown');
    }
  }, []);

  useEffect(() => { checkPermission(); }, [checkPermission]);

  const sendToWhisper = useCallback(async (blob: Blob): Promise<string> => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      // Whisper needs a proper file extension
      const ext = blob.type.includes('webm') ? 'webm' : blob.type.includes('mp4') ? 'mp4' : 'webm';
      formData.append('file', blob, `recording.${ext}`);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/openai-stt`,
        {
          method: 'POST',
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`STT request failed: ${response.status}`);
      }

      const data = await response.json();
      return data.text || '';
    } catch (err: any) {
      console.error('[useWhisperRecognition] Whisper error:', err);
      const msg = err.message || 'Transcription failed';
      setError(msg);
      onErrorRef.current?.(msg);
      return '';
    } finally {
      setIsTranscribing(false);
    }
  }, []);

  const startListening = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError('MediaRecorder not supported');
      onErrorRef.current?.('MediaRecorder not supported');
      return false;
    }

    setTranscript('');
    setError(null);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setMediaStream(stream);
      setPermissionStatus('granted');

      // Pick a supported mime type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        chunksRef.current = [];

        // Stop all tracks
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        setMediaStream(null);

        if (blob.size < 1000) {
          // Too small, probably no speech
          console.log('[useWhisperRecognition] Audio too small, skipping');
          resolveStopRef.current?.('');
          return;
        }

        const text = await sendToWhisper(blob);
        setTranscript(text);
        if (text) onResultRef.current?.(text);
        resolveStopRef.current?.(text);
      };

      recorder.start(1000); // collect chunks every second
      setIsListening(true);
      console.log('[useWhisperRecognition] Recording started');
      return true;
    } catch (err: any) {
      console.error('[useWhisperRecognition] Start error:', err);
      if (err.name === 'NotAllowedError') {
        setPermissionStatus('denied');
        setError('Microphone permission denied');
        onErrorRef.current?.('Microphone permission denied');
      } else {
        setError('Failed to start recording');
        onErrorRef.current?.('Failed to start recording');
      }
      return false;
    }
  }, [isSupported, sendToWhisper]);

  const stopListening = useCallback(async (): Promise<string> => {
    console.log('[useWhisperRecognition] Stop requested');
    setIsListening(false);

    return new Promise<string>((resolve) => {
      resolveStopRef.current = resolve;

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      } else {
        // Clean up stream if recorder is already inactive
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        setMediaStream(null);
        resolve('');
      }
    });
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  return {
    transcript,
    isListening,
    isSupported,
    isTranscribing,
    startListening,
    stopListening,
    resetTranscript,
    permissionStatus,
    error,
    mediaStream,
  };
}
