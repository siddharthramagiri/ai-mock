import { useEffect, useRef, useState } from 'react';

const useVoiceToText = () => {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('SpeechRecognition not supported');
      setError('Speech recognition not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true; // Changed to true to keep listening
    recognition.interimResults = true; // Changed to true to get interim results
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log('Speech recognition started');
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: any) => {
      console.log('Speech recognition result:', event);
      
      // Get the latest result
      const lastResultIndex = event.results.length - 1;
      const result = event.results[lastResultIndex];
      
      if (result.isFinal) {
        const transcript = result[0].transcript.trim();
        console.log('Final transcript:', transcript);
        if (transcript) {
          setTranscript(transcript);
          // Stop listening after getting final result  
          recognitionRef.current?.stop();
        }
      } else {
        // Handle interim results for better UX
        const interimTranscript = result[0].transcript;
        console.log('Interim transcript:', interimTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      
      // Handle specific errors
      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please allow microphone permissions.');
      } else if (event.error === 'no-speech') {
        console.log('No speech detected, but continuing to listen...');
        // Don't set error for no-speech, just continue
        return;
      } else if (event.error === 'audio-capture') {
        setError('No microphone found or audio capture failed.');
      } else if (event.error === 'network') {
        setError('Network error occurred during speech recognition.');
      } else if (event.error === 'aborted') {
        console.log('Speech recognition aborted');
        return;
      } else {
        setError(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      console.log('Speech recognition ended');
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    // Cleanup function
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const startListening = async () => {
    if (!recognitionRef.current) {
      setError('Speech recognition not initialized');
      return;
    }

    if (isListening) {
      console.log('Already listening, ignoring start request');
      return;
    }

    try {
      // Request microphone permission explicitly
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      setTranscript('');
      setError(null);
      
      // Add a small delay to ensure proper state management
      setTimeout(() => {
        recognitionRef.current?.start();
        console.log('Starting speech recognition...');
      }, 100);
    } catch (err) {
      console.error('Error requesting microphone permission:', err);
      setError('Microphone permission denied or unavailable');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      console.log('Stopping speech recognition...');
    }
  };

  const resetTranscript = () => {
    setTranscript('');
    setError(null);
  };

  return { 
    transcript, 
    isListening, 
    startListening, 
    stopListening, 
    resetTranscript,
    error 
  };
};

export default useVoiceToText;