import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/button';
import { Mic, Square, Play, Pause, Save, Loader2, RotateCcw } from 'lucide-react';
import { Input } from '../ui/input';

interface AudioRecorderProps {
  onSave: (blob: Blob, duration: number, title?: string) => Promise<void>;
  onCancel: () => void;
}

export function AudioRecorder({ onSave, onCancel }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [title, setTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const MAX_DURATION = 60;

  useEffect(() => {
    return () => {
      stopRecording();
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (isRecording && timeElapsed >= MAX_DURATION) {
      stopRecording();
    }
  }, [isRecording, timeElapsed]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const options = { mimeType: 'audio/webm;codecs=opus' };
      const recorder = new MediaRecorder(stream, MediaRecorder.isTypeSupported(options.mimeType) ? options : undefined);
      mediaRecorderRef.current = recorder;
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setRecordedBlob(blob);
      };

      audioChunksRef.current = [];
      recorder.start();
      setIsRecording(true);
      setTimeElapsed(0);
      setRecordedBlob(null);

      timerRef.current = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone', err);
      alert('Could not access microphone. Please allow permissions.');
    }
  };

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current && recordedBlob) {
      audioRef.current = new Audio(URL.createObjectURL(recordedBlob));
      audioRef.current.onended = () => setIsPlaying(false);
    }
    
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSave = async () => {
    if (!recordedBlob) return;
    setIsSaving(true);
    try {
      await onSave(recordedBlob, timeElapsed, title);
    } finally {
      setIsSaving(false);
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4 p-4 border rounded-xl bg-card">
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-semibold text-sm">Record Audio Snippet</h4>
        <span className="text-xs text-muted-foreground font-mono">
          {formatTime(timeElapsed)} / 1:00
        </span>
      </div>

      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-1000 ease-linear ${isRecording ? 'bg-destructive' : 'bg-primary'}`} 
          style={{ width: `${(timeElapsed / MAX_DURATION) * 100}%` }}
        />
      </div>

      {!recordedBlob ? (
        <div className="flex justify-center gap-4 mt-6">
          {!isRecording ? (
            <Button onClick={startRecording} variant="destructive" className="rounded-full w-12 h-12 p-0">
              <Mic className="w-5 h-5" />
            </Button>
          ) : (
            <Button onClick={stopRecording} variant="outline" className="rounded-full w-12 h-12 p-0 border-destructive text-destructive hover:bg-destructive/10">
              <Square className="w-5 h-5 fill-current" />
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4 mt-4">
          <div className="flex justify-center gap-3">
            <Button onClick={togglePlayback} variant="outline" size="icon" className="rounded-full h-10 w-10">
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            </Button>
            <Button 
              onClick={() => {
                setRecordedBlob(null);
                setTimeElapsed(0);
                if (audioRef.current) {
                  audioRef.current.pause();
                  audioRef.current = null;
                }
                setIsPlaying(false);
              }} 
              variant="ghost" 
              size="icon" 
              className="rounded-full h-10 w-10 text-muted-foreground"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
          
          <Input 
            placeholder="Title (e.g. Harmony Variation 1)" 
            value={title}
            onChange={e => setTitle(e.target.value)}
            disabled={isSaving}
          />
          
          <div className="flex gap-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={onCancel} disabled={isSaving}>Cancel</Button>
            <Button type="button" className="flex-1" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
