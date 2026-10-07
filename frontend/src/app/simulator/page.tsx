"use client";


import React, { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchDiscoveredJobs,
  startInterviewSession,
  respondInterviewTurn,
  InterviewSessionData,
  InterviewTurnData,
} from "../../lib/api";
import {
  Sparkles,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  RotateCcw,
  Award,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Loader2,
  MessageSquare,
  TrendingUp,
  BrainCircuit,
  Building,
  Target,
  ChevronRight,
  User,
  Bot,
  Copy,
  Check,
} from "lucide-react";

interface TurnHistoryItem {
  round: number;
  question: string;
  answer: string;
  evaluation: InterviewTurnData;
}

export default function SimulatorPage() {
  // Fetch live jobs for quick preset selection
  const { data: discoveredJobs = [] } = useQuery({
    queryKey: ["discoveredJobsForSimulator"],
    queryFn: () => fetchDiscoveredJobs({ province: "ALL" }),
  });

  // Setup / Configuration State
  const [inSession, setInSession] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [companyName, setCompanyName] = useState("Shopify");
  const [roleTitle, setRoleTitle] = useState("Backend Developer Intern");
  const [interviewType, setInterviewType] = useState<"BEHAVIORAL_STAR" | "SYSTEM_DESIGN" | "ROLE_DEEP_DIVE">("BEHAVIORAL_STAR");
  const [difficulty, setDifficulty] = useState("INTERN_NEW_GRAD");

  // Active Session State
  const [sessionData, setSessionData] = useState<InterviewSessionData | null>(null);
  const [currentRound, setCurrentRound] = useState(1);
  const [totalRounds, setTotalRounds] = useState(3);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [userAnswer, setUserAnswer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastTurnData, setLastTurnData] = useState<InterviewTurnData | null>(null);
  const [history, setHistory] = useState<TurnHistoryItem[]>([]);
  const [isFinalDebriefOpen, setIsFinalDebriefOpen] = useState(false);

  // Audio / Speech State
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Quick preset selector
  const handleSelectJobPreset = (jobId: string) => {
    setSelectedJobId(jobId);
    if (!jobId) return;
    const found = discoveredJobs.find((j) => j.id === jobId);
    if (found) {
      setCompanyName(found.company_name);
      setRoleTitle(found.role_title);
    }
  };

  // Start interview session
  const handleStartSession = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    setHistory([]);
    setLastTurnData(null);
    setIsFinalDebriefOpen(false);

    try {
      const data = await startInterviewSession({
        company_name: companyName || "Target Company",
        role_title: roleTitle || "Software Engineer",
        interview_type: interviewType,
        difficulty,
        total_rounds: 3,
      });

      setSessionData(data);
      setCurrentRound(data.current_round);
      setTotalRounds(data.total_rounds);
      setCurrentQuestion(data.question);
      setUserAnswer("");
      setInSession(true);

      // Auto-speak question if speech is enabled
      speakText(data.question);
    } catch (err: any) {
      alert("Failed to start session: " + (err.message || "Unknown error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Answer & Evaluate Turn
  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAnswer.trim() || isSubmitting) return;

    // Stop recording if active
    if (isRecording) {
      stopRecording();
    }

    setIsSubmitting(true);
    try {
      const turnResult = await respondInterviewTurn({
        company_name: companyName,
        role_title: roleTitle,
        interview_type: interviewType,
        current_round: currentRound,
        total_rounds: totalRounds,
        question: currentQuestion,
        answer: userAnswer.trim(),
        history: history.map((h) => ({
          round: h.round,
          question: h.question,
          answer: h.answer,
          overall_score: h.evaluation.overall_score,
        })),
      });

      setLastTurnData(turnResult);

      const newHistoryItem: TurnHistoryItem = {
        round: currentRound,
        question: currentQuestion,
        answer: userAnswer.trim(),
        evaluation: turnResult,
      };

      const updatedHistory = [...history, newHistoryItem];
      setHistory(updatedHistory);

      if (turnResult.is_final) {
        setIsFinalDebriefOpen(true);
        speakText(
          `Thank you for completing the interview. Your overall score is ${turnResult.overall_score} out of 100 with a decision of ${turnResult.final_decision?.replace("_", " ")}.`
        );
      } else if (turnResult.follow_up_question) {
        setCurrentRound((prev) => prev + 1);
        setCurrentQuestion(turnResult.follow_up_question);
        setUserAnswer("");
        speakText(turnResult.follow_up_question);
      }
    } catch (err: any) {
      alert("Evaluation error: " + (err.message || "Failed to score answer"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Web Speech API: Text-to-Speech
  const speakText = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  // Web Speech API: Speech-to-Text (Microphone)
  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const startRecording = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setUserAnswer((prev) => (prev ? prev + " " + transcript : transcript));
      };

      recognition.onerror = (e: any) => {
        console.error("Speech recognition error:", e);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (e) {
      console.error(e);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
  };

  const resetInterview = () => {
    stopSpeaking();
    stopRecording();
    setInSession(false);
    setSessionData(null);
    setHistory([]);
    setLastTurnData(null);
    setCurrentRound(1);
    setUserAnswer("");
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Interactive AI Interview Simulator
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              STAR Rubric &bull; Multi-Turn
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Practice real technical &amp; behavioral interviews tailored to top Canadian employers with instant conversational feedback.
          </p>
        </div>

        {inSession && (
          <button
            onClick={resetInterview}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            End &amp; Reset Interview
          </button>
        )}
      </div>

      {/* ======================================================================= */}
      {/* 1. SETUP ROOM (Before Session Starts)                                   */}
      {/* ======================================================================= */}
      {!inSession && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Configure Your Interview Session
              </h2>
              <p className="text-xs text-slate-500">
                Select your target company, role, and focus area. The AI interviewer adapts dynamically to your background.
              </p>
            </div>
          </div>

          <form onSubmit={handleStartSession} className="space-y-4">
            {/* Quick Preset Selector */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Quick Select from Live Canadian Roles (Optional)
              </label>
              <select
                value={selectedJobId}
                onChange={(e) => handleSelectJobPreset(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer"
              >
                <option value="">-- Or type custom company and title below --</option>
                {discoveredJobs.slice(0, 40).map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.company_name} — {job.role_title} ({job.city}, {job.province})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Company</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shopify, Amazon, Hootsuite, Clio, RBC"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Target Role Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Backend Developer Intern (Co-op)"
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Interview Track</label>
                <select
                  value={interviewType}
                  onChange={(e: any) => setInterviewType(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="BEHAVIORAL_STAR">Behavioral STAR (Ownership, Conflict, Trade-offs)</option>
                  <option value="SYSTEM_DESIGN">System Design &amp; Architecture (APIs, Caching, Databases)</option>
                  <option value="ROLE_DEEP_DIVE">Role Deep Dive (Concurrency, Debugging, Tooling)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Seniority / Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="INTERN_NEW_GRAD">Co-op / Intern / New Grad (Recommended)</option>
                  <option value="MID_LEVEL">Junior to Mid-Level (2-4 Years)</option>
                  <option value="SENIOR_STAFF">Senior / Staff Engineer</option>
                </select>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-between border-t border-slate-100">
              <span className="text-xs text-slate-500">
                Includes speech recognition (mic), real-time audio playback, and multi-turn follow-ups.
              </span>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-[#0066FF] hover:bg-blue-700 rounded-lg shadow-xs transition-all disabled:opacity-60 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Initializing Interviewer...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Enter Interview Room
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================================= */}
      {/* 2. ACTIVE INTERVIEW ROOM                                                */}
      {/* ======================================================================= */}
      {inSession && sessionData && (
        <div className="space-y-6">
          {/* Top Progress & Role Badge */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                {currentRound}/{totalRounds}
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  {companyName} &bull; {roleTitle}
                </h2>
                <p className="text-xs text-slate-500">
                  Interviewer: <span className="font-medium text-slate-700">{sessionData.interviewer_persona}</span>
                </p>
              </div>
            </div>

            {/* Audio Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => (isSpeaking ? stopSpeaking() : speakText(currentQuestion))}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                  isSpeaking
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
                title={isSpeaking ? "Mute audio" : "Listen to question"}
              >
                {isSpeaking ? <VolumeX className="w-3.5 h-3.5 text-amber-600" /> : <Volume2 className="w-3.5 h-3.5" />}
                {isSpeaking ? "Speaking..." : "Read Aloud"}
              </button>
            </div>
          </div>

          {/* Interviewer Speech Card */}
          <div className="bg-gradient-to-br from-blue-50/70 to-slate-50 rounded-xl border border-blue-100 p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-700">
              <Bot className="w-4 h-4" />
              Round {currentRound} Question:
            </div>
            <p className="text-base font-medium text-slate-900 leading-relaxed font-sans">
              &ldquo;{currentQuestion}&rdquo;
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-blue-200/40 text-xs text-slate-600">
              <span className="font-semibold text-slate-700">Key dimensions to address:</span>
              {sessionData.expected_dimensions?.map((dim, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded text-[11px] font-medium bg-white text-blue-700 border border-blue-200"
                >
                  {dim}
                </span>
              ))}
            </div>
          </div>

          {/* User Answer Form */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-900 flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-slate-500" />
                Your Response (STAR Method)
              </label>

              {/* Speech to text button */}
              <button
                type="button"
                onClick={toggleRecording}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isRecording
                    ? "bg-red-50 text-red-600 border border-red-200 animate-pulse"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-blue-600" />}
                {isRecording ? "Stop Recording (Listening...)" : "Dictate with Mic"}
              </button>
            </div>

            <textarea
              rows={5}
              placeholder="State the Situation/Task, describe your technical Actions (architecture, languages, trade-offs), and conclude with quantifiable Results (metrics, latency, latency drops)..."
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              className="w-full p-3.5 text-sm bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 leading-relaxed"
            />

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-500">
                {userAnswer.split(/\s+/).filter(Boolean).length} words
              </span>

              <button
                onClick={handleSubmitAnswer}
                disabled={isSubmitting || !userAnswer.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#0066FF] hover:bg-blue-700 rounded-lg shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Scoring STAR Rubric...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit Answer (Round {currentRound})
                  </>
                )}
              </button>
            </div>
          </div>

          {/* =================================================================== */}
          {/* 3. LAST ROUND STAR RUBRIC FEEDBACK                                  */}
          {/* =================================================================== */}
          {lastTurnData && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5 animate-in fade-in duration-300">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-50 border-2 border-blue-600 flex flex-col items-center justify-center">
                    <span className="text-base font-bold text-blue-700 leading-none">
                      {lastTurnData.overall_score}
                    </span>
                    <span className="text-[8px] font-semibold text-blue-600 uppercase">/100</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Round {lastTurnData.current_round} STAR Breakdown
                    </h3>
                    <p className="text-xs text-slate-500">
                      Evaluated against Tier-1 Canadian tech engineering standards.
                    </p>
                  </div>
                </div>

                <div className="text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                  <span className="font-semibold text-slate-800">Interviewer Reaction: </span>
                  &ldquo;{lastTurnData.interviewer_response}&rdquo;
                </div>
              </div>

              {/* STAR 4-Pillar Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Situation */}
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200/80">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      Situation
                    </span>
                    <span className="text-xs font-bold text-blue-700">
                      {lastTurnData.star_rubric.situation.score}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {lastTurnData.star_rubric.situation.feedback}
                  </p>
                </div>

                {/* Task */}
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200/80">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      Task
                    </span>
                    <span className="text-xs font-bold text-blue-700">
                      {lastTurnData.star_rubric.task.score}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {lastTurnData.star_rubric.task.feedback}
                  </p>
                </div>

                {/* Action */}
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200/80">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      Action
                    </span>
                    <span className="text-xs font-bold text-blue-700">
                      {lastTurnData.star_rubric.action.score}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {lastTurnData.star_rubric.action.feedback}
                  </p>
                </div>

                {/* Result */}
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200/80">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      Result
                    </span>
                    <span className="text-xs font-bold text-blue-700">
                      {lastTurnData.star_rubric.result.score}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {lastTurnData.star_rubric.result.feedback}
                  </p>
                </div>
              </div>

              {/* Coaching Tip */}
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-emerald-900">Coaching Advice: </span>
                  {lastTurnData.coaching_tip}
                </div>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* 4. FINAL HIRING DEBRIEF MODAL / PANEL                               */}
          {/* =================================================================== */}
          {isFinalDebriefOpen && lastTurnData?.final_debrief && (
            <div className="bg-white rounded-xl border-2 border-blue-600 p-6 shadow-md space-y-6 animate-in zoom-in-95 duration-300">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Decision: {lastTurnData.final_debrief.decision.replace("_", " ")}
                    </span>
                    <span className="text-sm font-semibold text-slate-900">
                      Final Interview Debrief
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Overall Candidate Score: <span className="font-bold text-blue-600">{lastTurnData.final_debrief.overall_score}/100</span>
                  </p>
                </div>

                <button
                  onClick={resetInterview}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#0066FF] hover:bg-blue-700 rounded-lg shadow-xs cursor-pointer"
                >
                  Start New Interview Practice
                </button>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Hiring Committee Summary:
                </h4>
                <p className="text-sm text-slate-800 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                  {lastTurnData.final_debrief.summary}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-emerald-50/60 p-3.5 rounded-lg border border-emerald-200">
                  <h5 className="text-xs font-bold text-emerald-900 uppercase tracking-wider mb-2">
                    Key Strengths Observed:
                  </h5>
                  <ul className="list-disc ml-4 space-y-1 text-xs text-emerald-800">
                    {lastTurnData.final_debrief.key_strengths.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-amber-50/60 p-3.5 rounded-lg border border-amber-200">
                  <h5 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-2">
                    High-Leverage Growth Areas:
                  </h5>
                  <ul className="list-disc ml-4 space-y-1 text-xs text-amber-800">
                    {lastTurnData.final_debrief.growth_areas.map((g, idx) => (
                      <li key={idx}>{g}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {lastTurnData.final_debrief.model_answer_snippet && (
                <div className="space-y-1.5">
                  <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Model Top-Tier Response Architecture:
                  </h5>
                  <div className="bg-slate-900 text-slate-100 p-3.5 rounded-lg text-xs leading-relaxed font-mono">
                    {lastTurnData.final_debrief.model_answer_snippet}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Previous Turn History Accordion */}
          {history.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Interview Session Transcript ({history.length} Rounds)
              </h4>
              <div className="space-y-2">
                {history.map((h, idx) => (
                  <div
                    key={idx}
                    className="bg-white p-3.5 rounded-lg border border-slate-200/90 shadow-xs text-xs space-y-1.5"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-slate-900">
                        Round {h.round}: {h.question.slice(0, 80)}...
                      </span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700">
                        Score: {h.evaluation.overall_score}/100
                      </span>
                    </div>
                    <p className="text-slate-600 line-clamp-2 italic">
                      &ldquo;{h.answer}&rdquo;
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
