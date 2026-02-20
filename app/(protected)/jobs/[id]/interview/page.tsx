"use client";

import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  ChevronLeft,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Loader2,
  CheckCircle2,
  Video,
  VideoOff,
  Users,
} from "lucide-react";
import type { JobFull, ApplicationForApplicant } from "@/utils/types";
import Vapi from "@vapi-ai/web";

type CallStatus =
  | "idle"
  | "loading"
  | "connecting"
  | "active"
  | "ending"
  | "ended";

export default function InterviewPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const jobId = params.id;
  const stepId = searchParams.get("stepId");
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();

  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [transcriptMessages, setTranscriptMessages] = useState<
    Array<{ role: string; text: string }>
  >([]);
  const [partialTranscript, setPartialTranscript] = useState<{
    role: string;
    text: string;
  } | null>(null);

  const vapiRef = useRef<Vapi | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptRef = useRef<Array<{ role: string; text: string }>>([]);
  const callDurationRef = useRef(0);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const userVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  // Fetch job details
  const { data: job, isLoading: jobLoading } = useQuery<JobFull>({
    queryKey: ["job-interview", jobId],
    queryFn: () =>
      fetch(`/api/jobs/${jobId}`).then((r) => {
        if (!r.ok) throw new Error("Job not found");
        return r.json();
      }),
    enabled: !!jobId,
  });

  // Fetch application
  const { data: application, isLoading: appLoading } =
    useQuery<ApplicationForApplicant | null>({
      queryKey: ["application", jobId, currentUser?.user?.id],
      queryFn: async () => {
        const res = await fetch("/api/applications");
        if (!res.ok) return null;
        const apps = (await res.json()) as ApplicationForApplicant[];
        return apps.find((app) => app.job_id === jobId) || null;
      },
      enabled: !!jobId && !!currentUser?.user?.id,
    });

  // Camera helpers
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      cameraStreamRef.current = stream;
      if (userVideoRef.current) {
        userVideoRef.current.srcObject = stream;
      }
      setIsCameraOn(true);
    } catch {
      setIsCameraOn(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current = null;
    if (userVideoRef.current) userVideoRef.current.srcObject = null;
    setIsCameraOn(false);
  }, []);

  const handleToggleCamera = useCallback(() => {
    if (isCameraOn) {
      stopCamera();
    } else {
      startCamera();
    }
  }, [isCameraOn, startCamera, stopCamera]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep callDurationRef in sync for use inside event callbacks
  useEffect(() => {
    callDurationRef.current = callDuration;
  }, [callDuration]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcriptMessages, partialTranscript]);

  // Auto-submit when call ends
  useEffect(() => {
    if (callStatus === "ended" && !submitted && !isAnalyzing) {
      analyzeInterviewMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callStatus]);

  // Start duration timer
  useEffect(() => {
    if (callStatus === "active") {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callStatus]);

  // Cleanup VAPI on unmount
  useEffect(() => {
    return () => {
      if (vapiRef.current) {
        vapiRef.current.stop();
        vapiRef.current = null;
      }
    };
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Create interview assistant via our API
  const startInterviewMutation = useMutation({
    mutationFn: async () => {
      if (!application || !stepId) throw new Error("Missing data");

      setCallStatus("loading");

      // 1. Create the VAPI assistant via our API
      const res = await fetch(`/api/applications/${application.id}/interview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to start interview");
      }

      const { assistantId } = await res.json();

      // 2. Initialize VAPI web client
      const vapiPublicKey = process.env.NEXT_PUBLIC_VAPI_API_KEY;
      if (!vapiPublicKey) throw new Error("VAPI public key not configured");

      const vapiInstance = new Vapi(vapiPublicKey);
      vapiRef.current = vapiInstance;

      // 3. Set up event listeners
      vapiInstance.on("call-start", () => {
        setCallStatus("active");
        setCallDuration(0);
        callDurationRef.current = 0;
        transcriptRef.current = [];
        setTranscriptMessages([]);
        setPartialTranscript(null);
        startCamera();
      });

      vapiInstance.on("call-end", () => {
        setCallStatus("ended");
        stopCamera();
      });

      vapiInstance.on("speech-start", () => {
        setIsSpeaking(true);
      });

      vapiInstance.on("speech-end", () => {
        setIsSpeaking(false);
      });

      vapiInstance.on("volume-level", (level: number) => {
        setVolumeLevel(level);
      });

      vapiInstance.on("error", (error: any) => {
        console.error("[VAPI Error]", error);
        toast.error("Call error occurred. Please try again.");
        setCallStatus("idle");
      });

      vapiInstance.on("message", (message: any) => {
        if (message.type === "transcript") {
          if (message.transcriptType === "final") {
            const entry = {
              role: message.role as string,
              text: message.transcript as string,
            };
            setTranscriptMessages((prev) => {
              const next = [...prev, entry];
              transcriptRef.current = next;
              return next;
            });
            setPartialTranscript(null);
          } else if (message.transcriptType === "partial") {
            setPartialTranscript({
              role: message.role as string,
              text: message.transcript as string,
            });
          }
        }
        if (message.type === "status-update" && message.status === "ended") {
          setCallStatus("ended");
        }
      });

      // 4. Start the call
      setCallStatus("connecting");
      const call = await vapiInstance.start(assistantId);

      return call;
    },
    onError: (err) => {
      setCallStatus("idle");
      toast.error(err.message || "Failed to start interview");
    },
  });

  const handleEndCall = useCallback(() => {
    if (vapiRef.current) {
      setCallStatus("ending");
      vapiRef.current.stop();
      stopCamera();
    }
  }, [stopCamera]);

  const handleToggleMute = useCallback(() => {
    if (vapiRef.current) {
      const newMuted = !isMuted;
      vapiRef.current.setMuted(newMuted);
      setIsMuted(newMuted);
    }
  }, [isMuted]);

  // Analyze interview mutation
  const analyzeInterviewMutation = useMutation({
    mutationFn: async () => {
      if (!application || !stepId) {
        throw new Error("Missing interview data");
      }

      setIsAnalyzing(true);

      const messages = transcriptRef.current;
      if (messages.length === 0) {
        throw new Error("No transcript available to analyze.");
      }

      const formattedTranscript = messages
        .map((m) =>
          m.role === "assistant"
            ? `Nala (Interviewer): ${m.text}`
            : `Candidate: ${m.text}`,
        )
        .join("\n\n");

      const res = await fetch(
        `/api/applications/${application.id}/analyze-interview`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stepId,
            transcript: formattedTranscript,
            callDuration: callDurationRef.current,
          }),
        },
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to analyze interview");
      }

      return res.json();
    },
    onSuccess: () => {
      setIsAnalyzing(false);
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["application", jobId] });
    },
    onError: (err) => {
      setIsAnalyzing(false);
      toast.error(err.message || "Failed to analyze interview");
    },
  });

  const isLoading = jobLoading || appLoading;

  // Check if this interview step was already completed
  const alreadyCompleted = !!application?.progress?.some(
    (p) => p.step_id === stepId,
  );

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!job || !application || !stepId) {
    return (
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold">Interview not available</h1>
        <p className="text-muted-foreground">
          Could not load interview details. Make sure you have an active
          application.
        </p>
        <Button asChild variant="outline">
          <Link href={`/jobs/${jobId}`}>Back to Job</Link>
        </Button>
      </div>
    );
  }

  if (alreadyCompleted) {
    return (
      <div className="text-center space-y-4 max-w-3xl mx-auto py-16">
        <CheckCircle2 className="size-14 text-green-500 mx-auto" />
        <h1 className="text-2xl font-bold">Interview Already Submitted</h1>
        <p className="text-muted-foreground max-w-sm mx-auto">
          You have already completed this interview. Each interview can only be
          taken once.
        </p>
        <Button asChild variant="outline">
          <Link href={`/jobs/${jobId}`}>Back to Job</Link>
        </Button>
      </div>
    );
  }

  const interviewStep = job.recruitment_steps?.find(
    (s) => s.id === stepId && s.step_type === "Interview",
  );

  return (
    <div className="max-w-5xl w-full mx-auto space-y-6">
      {/* Header */}
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2">
          <Link href={`/jobs/${jobId}`} className="flex items-center gap-2">
            <ChevronLeft className="size-4" />
            Back to Job
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Virtual Interview</h1>
        <p className="text-muted-foreground mt-1">
          {job.title} at {job.company?.name}
        </p>
      </div>

      {/* Non-active states: idle, loading, connecting, ending, ended */}
      {callStatus !== "active" && (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          {/* Status bar */}
          <div className="p-5 border-b bg-muted/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`size-3 rounded-full ${
                  callStatus === "connecting"
                    ? "bg-amber-500 animate-pulse"
                    : callStatus === "ended"
                      ? "bg-gray-400"
                      : "bg-gray-300"
                }`}
              />
              <span className="text-sm font-medium">
                {callStatus === "idle"
                  ? "Ready to Start"
                  : callStatus === "loading"
                    ? "Preparing..."
                    : callStatus === "connecting"
                      ? "Connecting..."
                      : callStatus === "ending"
                        ? "Ending Call..."
                        : "Interview Complete"}
              </span>
            </div>
            {callStatus === "ended" && (
              <span className="text-sm font-mono text-muted-foreground">
                {formatDuration(callDuration)}
              </span>
            )}
          </div>

          <div className="p-10">
            {callStatus === "idle" && (
              <div className="text-center space-y-6">
                <div className="size-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Phone className="size-10 text-primary" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold">
                    Ready for Your Interview
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    You&apos;ll be connected to an AI interviewer who will ask
                    you questions about the {job.title} role. Make sure your
                    microphone and camera are working and you&apos;re in a quiet
                    environment.
                  </p>
                </div>
                <div className="space-y-3">
                  <Button
                    size="lg"
                    onClick={() => startInterviewMutation.mutate()}
                    disabled={startInterviewMutation.isPending}
                    className="px-8"
                  >
                    {startInterviewMutation.isPending ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Preparing...
                      </>
                    ) : (
                      <>
                        <Phone className="size-4" /> Start Interview
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Interview will last approximately 10–20 minutes
                  </p>
                </div>
              </div>
            )}

            {(callStatus === "loading" || callStatus === "connecting") && (
              <div className="text-center space-y-6">
                <div className="size-24 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
                  <Loader2 className="size-10 text-amber-600 animate-spin" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold">
                    {callStatus === "loading"
                      ? "Setting Up Your Interview..."
                      : "Connecting to Interviewer..."}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Please wait while we prepare everything. This may take a few
                    seconds.
                  </p>
                </div>
              </div>
            )}

            {callStatus === "ending" && (
              <div className="text-center space-y-6">
                <div className="size-24 rounded-full bg-muted flex items-center justify-center mx-auto">
                  <Loader2 className="size-10 text-muted-foreground animate-spin" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Ending the call...
                </p>
              </div>
            )}

            {callStatus === "ended" && (
              <div className="text-center space-y-4">
                {isAnalyzing ? (
                  <>
                    <Loader2 className="size-10 animate-spin text-muted-foreground mx-auto" />
                    <p className="text-sm text-muted-foreground">
                      Submitting your interview...
                    </p>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-12 text-green-500 mx-auto" />
                    <h2 className="text-xl font-semibold">
                      Interview submitted!
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Your responses have been recorded. You&apos;ll hear back
                      soon.
                    </p>
                    <Button asChild variant="outline" className="mt-2">
                      <Link href={`/jobs/${jobId}`}>Back to Job</Link>
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active call — full video layout */}
      {callStatus === "active" && (
        <div
          className="rounded-xl overflow-hidden border shadow-xl bg-black relative"
          style={{ minHeight: "560px" }}
        >
          {/* Main area - Nala's avatar */}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-linear-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Animated ring when speaking */}
            <div
              className={`rounded-full transition-all duration-300 ${
                isSpeaking
                  ? "ring-4 ring-primary/60 ring-offset-4 ring-offset-slate-900"
                  : ""
              }`}
            >
              <div
                className={`size-28 rounded-full bg-primary/20 flex items-center justify-center transition-transform duration-300 ${
                  isSpeaking ? "scale-110" : "scale-100"
                }`}
                style={{
                  transform: isSpeaking
                    ? `scale(${1 + volumeLevel * 0.12})`
                    : undefined,
                }}
              >
                <span className="text-4xl font-bold text-primary select-none">
                  N
                </span>
              </div>
            </div>
            <p className="text-white font-semibold mt-4 text-lg">Nala</p>
            <p className="text-slate-400 text-sm">
              {isSpeaking ? "Speaking..." : "Listening..."}
            </p>
          </div>

          {/* User camera PiP bottom right */}
          <div className="absolute bottom-24 right-4 w-36 h-24 rounded-xl overflow-hidden border-2 border-white/20 shadow-lg bg-slate-700">
            <video
              ref={userVideoRef}
              autoPlay
              muted
              playsInline
              className={`w-full h-full object-cover scale-x-[-1] ${isCameraOn ? "block" : "hidden"}`}
            />
            {!isCameraOn && (
              <div className="w-full h-full flex items-center justify-center">
                <VideoOff className="size-6 text-slate-400" />
              </div>
            )}
          </div>

          {/* Transcript overlay — bottom left, scrollable */}
          <div className="absolute bottom-24 left-4 w-72 max-h-44 overflow-y-auto rounded-xl bg-black/60 backdrop-blur-sm p-3 space-y-2 text-sm">
            {transcriptMessages.length === 0 && !partialTranscript && (
              <p className="text-slate-400 text-xs text-center py-2">
                Transcript will appear here...
              </p>
            )}
            {transcriptMessages.map((msg, i) => (
              <div key={i} className="space-y-0.5">
                <span
                  className={`text-xs font-semibold ${
                    msg.role === "assistant" ? "text-primary" : "text-slate-300"
                  }`}
                >
                  {msg.role === "assistant" ? "Nala" : "You"}
                </span>
                <p className="text-white/90 leading-snug">{msg.text}</p>
              </div>
            ))}
            {partialTranscript && (
              <div className="space-y-0.5 opacity-60">
                <span
                  className={`text-xs font-semibold ${
                    partialTranscript.role === "assistant"
                      ? "text-primary"
                      : "text-slate-300"
                  }`}
                >
                  {partialTranscript.role === "assistant" ? "Nala" : "You"}
                </span>
                <p className="text-white/90 leading-snug italic">
                  {partialTranscript.text}
                </p>
              </div>
            )}
            <div ref={transcriptEndRef} />
          </div>

          {/* Timer + participants info */}
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-2 text-slate-300 text-xs bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <span className="font-mono">{formatDuration(callDuration)}</span>
            <span>·</span>
            <Users className="size-3" />
            <span>2 people in the call</span>
          </div>

          {/* Controls bar */}
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-black/80 backdrop-blur-sm flex items-center justify-center gap-5">
            <button
              onClick={handleToggleMute}
              className={`size-12 rounded-full flex items-center justify-center transition-colors ${
                isMuted
                  ? "bg-white/20 text-red-400"
                  : "bg-white/10 hover:bg-white/20 text-white"
              }`}
            >
              {isMuted ? (
                <MicOff className="size-5" />
              ) : (
                <Mic className="size-5" />
              )}
            </button>

            <button
              onClick={handleToggleCamera}
              className={`size-12 rounded-full flex items-center justify-center transition-colors ${
                !isCameraOn
                  ? "bg-white/20 text-red-400"
                  : "bg-white/10 hover:bg-white/20 text-white"
              }`}
            >
              {isCameraOn ? (
                <Video className="size-5" />
              ) : (
                <VideoOff className="size-5" />
              )}
            </button>

            <button
              onClick={handleEndCall}
              className="size-14 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-white transition-colors shadow-lg"
            >
              <PhoneOff className="size-6" />
            </button>
          </div>
        </div>
      )}

      {/* Tips Section */}
      {callStatus === "idle" && (
        <div className="rounded-lg border bg-muted/30 p-6">
          <h3 className="font-semibold mb-3">Interview Tips</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">1.</span> Find a quiet
              room with minimal background noise
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">2.</span> Speak clearly
              and at a natural pace
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">3.</span> Take a moment
              to think before answering each question
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">4.</span> Use specific
              examples from your experience when possible
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">5.</span> The interview
              typically takes 10–20 minutes
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
