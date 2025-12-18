import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Clock, Mic, MicOff, Volume2, VolumeX, AlertCircle, Send } from 'lucide-react';
import speak, { stopSpeaking } from '@/components/speak';
import useVoiceToText from '@/components/useVoiceToText';
import { User as UserData } from '@/auth/AuthContext';
import { ResumeData } from './ResumeUpload';
import { Input } from './ui/input';
import API_URL from '@/api';

interface Props {
  resumeData: ResumeData | null;
  company: string | null;
  jobRole: string | null;
  user: UserData;
  startInterviewNow: boolean;
  onEnd: () => void;
}

const InterviewSession: React.FC<Props> = ({ resumeData, company, jobRole, user, startInterviewNow, onEnd }) => {
  const [sessionTime, setSessionTime] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [isProcessingAnswer, setIsProcessingAnswer] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [answer, setAnswer] = useState<string>('');
  
  // Use refs to prevent unnecessary re-renders
  const hasStartedRef = useRef(false);
  const isProcessingRef = useRef(false);

  const { transcript, isListening, startListening, stopListening, resetTranscript, error } = useVoiceToText();

  // Push-to-talk state
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const spaceHoldTimeoutRef = useRef<NodeJS.Timeout>();

  // Timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isSessionActive) {
      timer = setInterval(() => setSessionTime(prev => prev + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [isSessionActive]);

  // Keyboard event handlers for push-to-talk
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle spacebar in interview session and prevent if user is typing in input
      if (e.code === 'Space' && 
          isSessionActive && 
          !isSpacePressed && 
          !isSpeaking && 
          !isProcessingAnswer &&
          !(e.target as HTMLElement)?.tagName.match(/INPUT|TEXTAREA/)) {
        
        e.preventDefault();
        setIsSpacePressed(true);
        
        // Small delay to prevent accidental triggers
        spaceHoldTimeoutRef.current = setTimeout(() => {
          if (!isListening) {
            startListening();
          }
        }, 100);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isSpacePressed) {
        e.preventDefault();
        setIsSpacePressed(false);
        
        // Clear the timeout if space was released quickly
        if (spaceHoldTimeoutRef.current) {
          clearTimeout(spaceHoldTimeoutRef.current);
        }
        
        // Stop listening and process the transcript
        if (isListening) {
          stopListening();
          // The transcript will be processed by the existing useEffect
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      if (spaceHoldTimeoutRef.current) {
        clearTimeout(spaceHoldTimeoutRef.current);
      }
    };
  }, [isSessionActive, isSpacePressed, isSpeaking, isProcessingAnswer, isListening, startListening, stopListening]);

  // Memoized API functions to prevent re-creation
  const fetchFirstQuestion = useCallback(async () => {
    const params = new URLSearchParams({ jobRole: jobRole || '', company: company || '' });
    const res = await fetch(`${API_URL}/api/interview/start/${user.id}?${params.toString()}`, {
      method: 'GET',
      credentials: 'include'
    });
    if (!res.ok) throw new Error('Failed to start interview');
    return await res.text();
  }, [jobRole, company, user.id]);

  const sendAnswerAndGetNext = useCallback(async (answerText: string) => {
    if (!answerText.trim() || isProcessingRef.current) return;

    console.log('Sending answer:', answerText);
    isProcessingRef.current = true;
    setIsProcessingAnswer(true);
    
    try {
      const res = await fetch(`${API_URL}/api/interview/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ answer: answerText }),
      });
      
      if (!res.ok) throw new Error('Failed to fetch response');
      const data = await res.json();

      console.log('Next question:', data.question);
      
      setCurrentQuestion(data.question);
      setQuestionCount(prev => prev + 1);
      
      // Clear both voice transcript and text input
      resetTranscript();
      setAnswer('');
      
      // Speak the new question
      speak(data.question, () => setIsSpeaking(false));
      setIsSpeaking(true);
      
    } catch (err) {
      console.error('Error during response:', err);
    } finally {
      setIsProcessingAnswer(false);
      isProcessingRef.current = false;
    }
  }, [resetTranscript]);

  // Start interview effect - only runs once
  useEffect(() => {
    if (startInterviewNow && !isSessionActive && !hasStartedRef.current) {
      hasStartedRef.current = true;
      setIsSessionActive(true);
      
      (async () => {
        try {
          const firstQuestion = await fetchFirstQuestion();
          setCurrentQuestion(firstQuestion);
          setQuestionCount(1);
          
          speak(firstQuestion, () => setIsSpeaking(false));
          setIsSpeaking(true);
        } catch (err) {
          console.error('Error starting interview:', err);
        }
      })();
    }
  }, [startInterviewNow, isSessionActive, fetchFirstQuestion]);

  // Handle voice transcript processing
  useEffect(() => {
    if (transcript.trim() && !isProcessingAnswer && isSessionActive) {
      sendAnswerAndGetNext(transcript);
    }
  }, [transcript, isProcessingAnswer, isSessionActive, sendAnswerAndGetNext]);

  const handleMic = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Handle text input submission
  const handleTextSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (answer.trim()) {
      sendAnswerAndGetNext(answer);
    }
  }, [answer, sendAnswerAndGetNext]);

  // Handle Enter key in input
  const handleInputKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTextSubmit(e);
    }
  }, [handleTextSubmit]);

  const formatTime = useCallback((s: number) => 
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`, []
  );

  const progress = Math.min(questionCount * 10, 100);

  const getMicButtonState = () => {
    if (isSpeaking) return { disabled: true, text: 'AI is speaking...' };
    if (isProcessingAnswer) return { disabled: true, text: 'Processing answer...' };
    if (error) return { disabled: true, text: error };
    if (isListening) return { disabled: false, text: 'Recording... (Release spacebar to send)' };
    if (isSpacePressed) return { disabled: false, text: 'Hold spacebar to record' };
    return { disabled: false, text: 'Hold spacebar to speak or click mic' };
  };

  const micState = getMicButtonState();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm">
        <div className="flex justify-between items-center h-16 px-6">
          <div className="flex items-center space-x-4">
            <Button onClick={() => {
                stopSpeaking()
                onEnd()
              }} variant="ghost">
              <ArrowLeft className="h-4 w-4 mr-2" /> End Interview
            </Button>
            <Clock className="h-4 w-4 text-gray-600" />
            <span className="font-mono text-sm">{formatTime(sessionTime)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">{user.name}</span>
            <Badge variant={user.pro ? 'default' : 'secondary'}>
              {user.pro ? 'Pro' : `${user.trials} trials left`}
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid lg:grid-cols-3 gap-6">
        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Interview Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Questions Asked</span>
                  <span>{questionCount}</span>
                </div>
                <Progress value={progress} />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span>AI Status</span>
                  {isSpeaking ? (
                    <div className="flex items-center gap-1 text-blue-600">
                      <Volume2 className="w-4 h-4" />
                      <span>Speaking</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-gray-500">
                      <VolumeX className="w-4 h-4" />
                      <span>Silent</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span>Your Mic</span>
                  {isListening ? (
                    <div className="flex items-center gap-1 text-red-600">
                      <Mic className="w-4 h-4" />
                      <span>Listening</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-gray-500">
                      <MicOff className="w-4 h-4" />
                      <span>Off</span>
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm p-2 bg-red-50 rounded">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {resumeData && (
            <Card>
              <CardHeader>
                <CardTitle>Your Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-semibold">{resumeData.candidate_name}</p>
                <p className="text-sm text-gray-500">{resumeData.location}</p>
                <p className="mt-2 text-sm font-medium">Key Skills:</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {resumeData.skills.slice(0, 6).map((skill, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{skill}</Badge>
                  ))}
                  {resumeData.skills.length > 6 && (
                    <Badge variant="outline" className="text-xs">
                      +{resumeData.skills.length - 6} more
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </aside>

        <section className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Voice Interview</CardTitle>
            </CardHeader>
            <CardContent className="h-[500px] flex flex-col">
              <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                {currentQuestion && (
                  <Card className="w-full max-w-2xl">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold mb-2 text-center">Current Question:</h3>
                      <p className="text-gray-700 text-center leading-relaxed">{currentQuestion}</p>
                    </CardContent>
                  </Card>
                )}

                <div className="flex flex-col items-center space-y-4">
                  <div className="flex gap-4 items-center justify-center">
                    {/* Mic Button */}
                    <Button
                      onClick={handleMic}
                      className={`w-20 h-20 rounded-full text-white transition-all duration-200 ${
                        isListening 
                          ? 'bg-red-600 hover:bg-red-700 scale-110' 
                          : 'bg-green-600 hover:bg-green-700'
                      }`}
                      disabled={micState.disabled}
                    >
                      {isListening ? (
                        <MicOff className="h-8 w-8" />
                      ) : (
                        <Mic className="h-8 w-8" />
                      )}
                    </Button>

                    {/* Stop AI Voice Button */}
                    <Button
                      variant="outline"
                      onClick={() => {
                        stopSpeaking();
                        setIsSpeaking(false);
                      }}
                      disabled={!isSpeaking}
                      className="h-10"
                    >
                      <VolumeX className="h-5 w-5 mr-2" />
                      Stop AI Voice
                    </Button>
                  </div>

                  <p className="text-center text-sm text-gray-600 max-w-xs">
                    {micState.text}
                  </p>

                  {isProcessingAnswer && (
                    <div className="flex items-center gap-2 text-blue-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span className="text-sm">Processing your answer...</span>
                    </div>
                  )}
                </div>

                {/* Text Input Alternative */}
                <div className="w-full max-w-md">
                  <p className="text-center text-sm text-gray-500 mb-2">Or type your answer:</p>
                  <form onSubmit={handleTextSubmit} className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Type your answer here..."
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      onKeyDown={handleInputKeyDown}
                      disabled={isProcessingAnswer}
                      className="flex-1"
                    />
                    <Button 
                      type="submit" 
                      disabled={!answer.trim() || isProcessingAnswer}
                      size="sm"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </div>

                {/* Show current transcript if listening */}
                {transcript && (
                  <div className="w-full max-w-md p-3 bg-blue-50 rounded-lg border">
                    <p className="text-sm text-gray-600 mb-1">Voice transcript:</p>
                    <p className="text-sm">{transcript}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
};

export default InterviewSession;