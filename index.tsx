import React, { useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Chat } from "@google/genai";
import { 
  ShieldCheck, AlertTriangle, Upload, X, Loader2, ArrowRight, Mic, Square, 
  Video, Image as ImageIcon, ExternalLink, Printer, Share2, Check, 
  MessageSquare, Bot, Globe, RefreshCcw, Quote, FileSearch, Scale, 
  Fingerprint, Sparkles, ChevronDown, ChevronLeft, ChevronRight, Feather, MailWarning, FileWarning, EyeOff,
  Search, Info, MousePointerClick, FileText, Lock, Paperclip, Link, AudioLines, FileQuestion, History, Clock, Trash2, Send
} from 'lucide-react';

// --- Configuration ---
// The API key must be obtained exclusively from the environment variable process.env.API_KEY.
// Assume this variable is pre-configured, valid, and accessible.

// --- Constants ---
const MAX_DAILY_QUERIES = 20;
const STORAGE_USAGE_KEY = 'veritas_usage_v1';
const STORAGE_HISTORY_KEY = 'veritas_history_v1';

// --- Types ---
type Language = 'es' | 'en' | 'pt';
type AnalysisStage = 'idle' | 'uploading' | 'scanning' | 'searching' | 'reasoning' | 'finalizing' | 'complete';

interface VerificationResult {
  score: number;
  verdict: 'CREDIBLE' | 'SUSPICIOUS' | 'FAKE' | 'SATIRE';
  summary: string;
  isAiGenerated: boolean;
  aiConfidence: number;
  aiReasoning: string;
  extractedContent?: string;
  claims: Array<{
    text: string;
    isFact: boolean;
    assessment: string;
  }>;
}

interface Source {
  title: string;
  uri: string;
}

interface MediaFile {
  id: string;
  type: 'image' | 'video' | 'audio';
  data: string;
  mimeType: string;
  transcription?: string;
  analysis?: string;
  isProcessing?: boolean;
}

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

interface HistoryItem {
  id: string;
  timestamp: number;
  result: VerificationResult; // Stores the PRIMARY result
  previewText: string;
  sources: Source[];
}

// --- Translations ---
const TRANSLATIONS = {
  es: {
    title: "Veritas",
    subtitle: "Detector de Información Falsa y Fraude",
    placeholder: "Pegue una noticia, un correo sospechoso o arrastre archivos...",
    urlPlaceholder: "Pegue el enlace del artículo o noticia (https://...)",
    uploadLabel: "Archivos",
    micLabel: "Dictar",
    linkLabel: "Enlace",
    analyzeBtn: "Investigar",
    processingSteps: {
      scanning: "Analizando huellas digitales...",
      searching: "Cruzando bases de datos de fraude...",
      reasoning: "Detectando patrones de engaño...",
      finalizing: "Generando dictamen..."
    },
    errorMediaSize: "Max 10MB.",
    errorInput: "Se requiere contenido o enlace.",
    errorAnalysis: "Error en el análisis.",
    errorNoKey: "Falta la API Key. Configure VITE_API_KEY en su entorno.",
    verdictLabels: {
      CREDIBLE: "Legítimo",
      SUSPICIOUS: "Sospechoso",
      FAKE: "Fraudulento",
      SATIRE: "Sátira"
    },
    reportHeader: "Dictamen de Seguridad",
    analyzedContent: "Evidencia Analizada",
    aiDetected: "Manipulado con IA",
    aiClean: "Sin manipulación IA",
    summary: "Conclusión",
    claims: "Puntos Clave",
    sources: "Fuentes",
    chatPrompt: "¿Dudas?",
    newSearch: "Reiniciar",
    copy: "Copiar",
    dropZone: "Suelte para analizar",
    capabilities: ["Fake News", "Deepfakes", "Phishing", "Estafas"],
    processingAudio: "Procesando audio...",
    transcribing: "Transcribiendo...",
    inputSummaryTitle: "Material Analizado",
    scoreLabel: "Índice de Credibilidad",
    scoreHigh: "Veraz / Fiable",
    scoreLow: "Falso / Riesgo Alto",
    originalText: "Texto Original",
    originalUrl: "Enlace Fuente",
    historyTitle: "Historial Reciente",
    historyEmpty: "No hay análisis guardados.",
    clearHistory: "Borrar todo",
    limitTitle: "Límite Diario Alcanzado",
    limitMsg: `Has alcanzado el límite de ${MAX_DAILY_QUERIES} consultas diarias gratuitas.`,
    limitSubMsg: "Por favor, vuelve mañana para realizar más análisis.",
    limitBtn: "Entendido",
    followUpPlaceholder: "Haga una pregunta para profundizar el análisis...",
    followUpLoading: "Analizando nueva consulta..."
  },
  en: {
    title: "Veritas",
    subtitle: "False Information & Fraud Detector",
    placeholder: "Paste news, suspicious email, or drop files...",
    urlPlaceholder: "Paste article or news link (https://...)",
    uploadLabel: "Files",
    micLabel: "Dictate",
    linkLabel: "Link",
    analyzeBtn: "Investigate",
    processingSteps: {
      scanning: "Analyzing digital fingerprints...",
      searching: "Checking fraud databases...",
      reasoning: "Detecting deception patterns...",
      finalizing: "Generating verdict..."
    },
    errorMediaSize: "Max 10MB.",
    errorInput: "Content or link required.",
    errorAnalysis: "Analysis error.",
    errorNoKey: "Missing API Key. Set VITE_API_KEY in your env.",
    verdictLabels: {
      CREDIBLE: "Legitimate",
      SUSPICIOUS: "Suspicious",
      FAKE: "Fraudulent",
      SATIRE: "Satire"
    },
    reportHeader: "Security Verdict",
    analyzedContent: "Analyzed Evidence",
    aiDetected: "AI Manipulated",
    aiClean: "No AI Manipulation",
    summary: "Conclusion",
    claims: "Key Points",
    sources: "Sources",
    chatPrompt: "Questions?",
    newSearch: "Reset",
    copy: "Copy",
    dropZone: "Drop to analyze",
    capabilities: ["Fake News", "Deepfakes", "Phishing", "Scams"],
    processingAudio: "Processing audio...",
    transcribing: "Transcribing...",
    inputSummaryTitle: "Analyzed Material",
    scoreLabel: "Credibility Index",
    scoreHigh: "Truthful / Reliable",
    scoreLow: "Fake / High Risk",
    originalText: "Original Text",
    originalUrl: "Source Link",
    historyTitle: "Recent History",
    historyEmpty: "No saved analyses.",
    clearHistory: "Clear all",
    limitTitle: "Daily Limit Reached",
    limitMsg: `You have reached the limit of ${MAX_DAILY_QUERIES} free daily queries.`,
    limitSubMsg: "Please come back tomorrow for more analyses.",
    limitBtn: "Understood",
    followUpPlaceholder: "Ask a question to deepen the analysis...",
    followUpLoading: "Analyzing new query..."
  },
  pt: {
    title: "Veritas",
    subtitle: "Detector de Informação Falsa e Fraude",
    placeholder: "Cole notícias, e-mail suspeito ou arraste arquivos...",
    urlPlaceholder: "Cole o link do artigo ou notícia (https://...)",
    uploadLabel: "Arquivos",
    micLabel: "Ditar",
    linkLabel: "Link",
    analyzeBtn: "Investigar",
    processingSteps: {
      scanning: "Analisando impressões digitais...",
      searching: "Verificando bancos de dados de fraude...",
      reasoning: "Detectando padrões de engano...",
      finalizing: "Gerando laudo..."
    },
    errorMediaSize: "Máx 10MB.",
    errorInput: "Conteúdo ou link necessário.",
    errorAnalysis: "Erro na análise.",
    errorNoKey: "Chave API ausente. Defina VITE_API_KEY.",
    verdictLabels: {
      CREDIBLE: "Legítimo",
      SUSPICIOUS: "Suspeito",
      FAKE: "Fraudulento",
      SATIRE: "Sátira"
    },
    reportHeader: "Laudo de Segurança",
    analyzedContent: "Evidência Analisada",
    aiDetected: "Manipulado com IA",
    aiClean: "Sem manipulação IA",
    summary: "Conclusão",
    claims: "Pontos Chave",
    sources: "Fontes",
    chatPrompt: "Dúvidas?",
    newSearch: "Reiniciar",
    copy: "Copiar",
    dropZone: "Solte para analisar",
    capabilities: ["Fake News", "Deepfakes", "Phishing", "Golpes"],
    processingAudio: "Processando áudio...",
    transcribing: "Transcrevendo...",
    inputSummaryTitle: "Material Analisado",
    scoreLabel: "Índice de Credibilidade",
    scoreHigh: "Verdadeiro / Confiável",
    scoreLow: "Falso / Alto Risco",
    originalText: "Texto Original",
    originalUrl: "Link Fonte",
    historyTitle: "Histórico Recente",
    historyEmpty: "Nenhuma análise salva.",
    clearHistory: "Limpar tudo",
    limitTitle: "Limite Diário Atingido",
    limitMsg: `Você atingiu o limite de ${MAX_DAILY_QUERIES} consultas diárias gratuitas.`,
    limitSubMsg: "Por favor, volte amanhã para realizar mais análises.",
    limitBtn: "Entendido",
    followUpPlaceholder: "Faça uma pergunta para aprofundar a análise...",
    followUpLoading: "Analisando nova consulta..."
  }
};

// --- Gemini Client ---
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

// --- Components ---

const BookLoader = ({ label }: { label: string }) => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const PageContent = () => (
    <div className="page-text">
       <div className="line"></div>
       <div className="line"></div>
       <div className="line"></div>
       <div className="line short"></div>
       <div className="line"></div>
       <div className="line"></div>
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-center gap-8 animate-fade-in py-20 w-full">
      <div className="book-wrapper">
        <div className="book">
          <div className="page"><PageContent /></div>
          <div className="page"><PageContent /></div>
          <div className="page"><PageContent /></div>
          <div className="page"><PageContent /></div>
        </div>
      </div>
      <div className="text-center space-y-2 relative z-10">
        <p className="font-serif italic text-xl text-gray-800 tracking-wide min-h-[1.75rem]">
          {label}
        </p>
        <p className="mono text-xs text-gray-500 font-medium tracking-wider">
          {formatTime(seconds)}
        </p>
      </div>
    </div>
  );
};

const ScoreMeter = ({ score, t }: { score: number, t: any }) => {
  return (
    <div className="w-full">
      <div className="flex justify-between items-end mb-2">
        <span className="font-mono text-xs font-bold uppercase tracking-widest text-gray-400">{t.scoreLabel}</span>
        <span className={`font-mono text-xl font-bold ${score < 50 ? 'text-rose-600' : score < 80 ? 'text-amber-500' : 'text-emerald-600'}`}>
          {score}/100
        </span>
      </div>
      <div className="h-4 w-full bg-gray-100 rounded-full relative overflow-hidden shadow-inner">
        <div className="absolute inset-0 bg-gradient-to-r from-rose-500 via-amber-300 to-emerald-500 opacity-80"></div>
        <div 
          className="absolute top-0 bottom-0 w-1.5 bg-black shadow-[0_0_10px_rgba(0,0,0,0.5)] transform -translate-x-1/2 transition-all duration-1000 ease-out z-10"
          style={{ left: `${score}%` }}
        ></div>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_50%,rgba(255,255,255,0.2)_50%)] bg-[length:4px_100%]"></div>
      </div>
      <div className="flex justify-between mt-2 text-[10px] font-mono font-medium text-gray-400 uppercase tracking-wider">
        <span>{t.scoreLow}</span>
        <span>{t.scoreHigh}</span>
      </div>
    </div>
  );
};

// Result Card Component (Extracted for reuse in the list)
interface ResultCardProps {
  result: VerificationResult;
  sources: Source[];
  t: any;
  isFirst: boolean;
  inputContext?: React.ReactNode;
}

const ResultCard: React.FC<ResultCardProps> = ({ result, sources, t, isFirst, inputContext }) => {
    const getStatusColor = (verdict: string) => {
        switch (verdict) {
          case 'CREDIBLE': return 'border-emerald-500 text-emerald-700';
          case 'SUSPICIOUS': return 'border-amber-500 text-amber-700';
          case 'FAKE': return 'border-rose-500 text-rose-700';
          case 'SATIRE': return 'border-violet-500 text-violet-700';
          default: return 'border-gray-500 text-gray-700';
        }
    };

    return (
        <div className="bg-[#F5F5F7] p-8 md:p-16 shadow-2xl shadow-gray-300/50 relative border-t-[6px] border-black mb-12 animate-fade-in-up rounded-sm">
             {/* Render Input Context only for the first card */}
             {isFirst && inputContext && (
                 <div className="mb-12 border-b-2 border-gray-200 pb-8">
                    <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
                       <FileQuestion size={14} /> {t.inputSummaryTitle}
                    </h3>
                    <div className="flex flex-col gap-6">
                        {inputContext}
                    </div>
                 </div>
             )}

             {/* HEADER & VERDICT */}
             <div className="flex flex-col md:flex-row gap-12 border-b-2 border-black pb-12 mb-12">
                <div className="flex-1">
                   <div className="flex items-center gap-3 mb-4">
                      <Feather size={28} className="text-black" />
                      <span className="serif text-3xl font-bold tracking-tight">Veritas</span>
                   </div>
                   <h2 className="font-mono text-xs font-bold text-gray-400 tracking-[0.2em] uppercase mb-4">{t.reportHeader}</h2>
                   <div className="flex items-center gap-3">
                      {result.verdict === 'CREDIBLE' ? <ShieldCheck size={32} className="text-emerald-600" /> : 
                       result.verdict === 'FAKE' ? <AlertTriangle size={32} className="text-rose-600" /> : <Info size={32} className="text-amber-600" />}
                      <span className={`text-4xl font-serif font-bold ${getStatusColor(result.verdict).split(' ')[1]}`}>
                         {t.verdictLabels[result.verdict]}
                      </span>
                   </div>
                </div>
                <div className="flex-1 flex items-end">
                   <ScoreMeter score={result.score} t={t} />
                </div>
             </div>
             
             {/* VERDICT SUMMARY */}
             <div className="mb-12 bg-white p-8 border-l-4 border-black shadow-sm">
                 <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">{t.summary}</h3>
                 <p className="font-serif text-xl leading-relaxed italic text-gray-800">
                    "{result.summary}"
                 </p>
             </div>

             {/* EXTRACTED CONTENT */}
             {result.extractedContent && (
               <div className="mb-12">
                  <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2"><FileText size={14}/> {t.analyzedContent}</h3>
                  <div className="bg-gray-50 border border-gray-200 p-6 rounded-md">
                      <p className="font-serif italic text-gray-600 leading-relaxed text-sm">
                        ...{result.extractedContent}...
                      </p>
                  </div>
               </div>
             )}

             {/* DETAILS */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
                <div>
                   <h4 className="font-mono text-xs font-bold uppercase tracking-widest border-b-2 border-gray-900 pb-3 mb-6 text-black">{t.claims}</h4>
                   <div className="space-y-6">
                      {result.claims.map((claim, idx) => (
                         <div key={idx} className="group">
                            <div className="flex items-start gap-3 mb-2">
                               <div className={`mt-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 ${claim.isFact ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                                  {claim.isFact ? <Check size={10} /> : <X size={10} />}
                               </div>
                               <p className="font-medium text-gray-900 leading-snug">{claim.text}</p>
                            </div>
                            <p className="text-sm text-gray-500 pl-8 leading-relaxed group-hover:text-gray-900 transition-colors">{claim.assessment}</p>
                         </div>
                      ))}
                   </div>
                </div>
                <div className="space-y-12">
                   <div>
                      <h4 className="font-mono text-xs font-bold uppercase tracking-widest border-b-2 border-gray-900 pb-3 mb-6 text-black">Análisis Técnico IA</h4>
                      <div className="bg-white p-5 border border-gray-200 shadow-sm rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                           <div className="flex items-center gap-2">
                              <Sparkles size={16} className={result.isAiGenerated ? 'text-rose-500' : 'text-emerald-500'} />
                              <span className="text-lg font-bold font-serif">{result.isAiGenerated ? t.aiDetected : t.aiClean}</span>
                           </div>
                           {result.isAiGenerated && <span className="font-mono text-xs bg-rose-100 text-rose-700 px-2 py-1 rounded font-bold">Probabilidad: {result.aiConfidence}%</span>}
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3">{result.aiReasoning}</p>
                      </div>
                   </div>
                   <div>
                      <h4 className="font-mono text-xs font-bold uppercase tracking-widest border-b-2 border-gray-900 pb-3 mb-6 text-black">{t.sources}</h4>
                      <ul className="space-y-3">
                         {sources.map((s, i) => (
                            <li key={i}>
                               <a href={s.uri} target="_blank" rel="noreferrer" className="flex items-center gap-3 group bg-white p-3 border border-transparent hover:border-gray-200 hover:shadow-sm transition-all rounded-lg">
                                  <div className="w-6 h-6 bg-gray-100 flex items-center justify-center rounded-full text-gray-400 group-hover:bg-black group-hover:text-white transition-colors">
                                    <ArrowRight size={10} />
                                  </div>
                                  <span className="text-sm text-gray-600 group-hover:text-black font-medium truncate flex-1">{s.title}</span>
                                  <ExternalLink size={12} className="text-gray-300 opacity-0 group-hover:opacity-100" />
                               </a>
                            </li>
                         ))}
                         {sources.length === 0 && <li className="text-sm text-gray-400 italic">No public sources found.</li>}
                      </ul>
                   </div>
                </div>
             </div>
             
             {/* Footer of Report */}
             <div className="pt-8 border-t border-gray-200 flex justify-between items-center text-[10px] text-gray-400 font-mono uppercase tracking-widest">
                <span className="flex items-center gap-2"><Fingerprint size={12} /> Generated by Veritas AI</span>
                <span>Ref: {Math.random().toString(36).substr(2, 9).toUpperCase()}</span>
             </div>
        </div>
    );
};

const App = () => {
  // Config States
  const [language, setLanguage] = useState<Language>('es');
  const [showLangMenu, setShowLangMenu] = useState(false);

  // Input States
  const [text, setText] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Process States
  const [stage, setStage] = useState<AnalysisStage>('idle');
  const [error, setError] = useState<string | null>(null);
  const [dynamicSteps, setDynamicSteps] = useState<string[] | null>(null);
  
  // Result States (Changed to Array for conversation flow)
  const [results, setResults] = useState<VerificationResult[]>([]);
  // Store all aggregated sources or per-result? For simplicity, we track the latest analysis sources globally or handle them in the result object.
  // The VerificationResult interface doesn't strictly have sources (extracted separately in analyzeContent).
  // We need to map sources to each result index.
  const [resultsSources, setResultsSources] = useState<Source[][]>([]);
  
  // UI States
  const [showHistory, setShowHistory] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);

  // Chat/Follow-up States
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [followUpInput, setFollowUpInput] = useState('');
  const [isFollowingUp, setIsFollowingUp] = useState(false);

  // Data Persistence States
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const dragCounter = useRef(0);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const endOfResultsRef = useRef<HTMLDivElement>(null);

  const t = TRANSLATIONS[language];

  // --- Effects ---

  useEffect(() => {
    // Load History
    const savedHistory = localStorage.getItem(STORAGE_HISTORY_KEY);
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) { console.error("Failed to load history"); }
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowLangMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (showUrlInput && urlInputRef.current) {
        urlInputRef.current.focus();
    }
  }, [showUrlInput]);

  useEffect(() => {
    if (stage === 'scanning') {
      const timers = [
        setTimeout(() => setStage('searching'), 2500),
        setTimeout(() => setStage('reasoning'), 5500),
        setTimeout(() => setStage('finalizing'), 8500)
      ];
      return () => timers.forEach(clearTimeout);
    }
  }, [stage === 'scanning']);

  // Scroll to bottom when results change
  useEffect(() => {
    if (endOfResultsRef.current && results.length > 0) {
        endOfResultsRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [results, isFollowingUp]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = document.getElementById('input-textarea');
    if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 400) + 'px'; // Increased max height
    }
  }, [text]);

  // --- Helpers for Usage Limits & History ---

  const checkUsageLimit = (): boolean => {
    const today = new Date().toLocaleDateString();
    const usageData = localStorage.getItem(STORAGE_USAGE_KEY);
    let usage = { date: today, count: 0 };

    if (usageData) {
      const parsed = JSON.parse(usageData);
      if (parsed.date === today) {
        usage = parsed;
      } else {
        localStorage.setItem(STORAGE_USAGE_KEY, JSON.stringify(usage));
      }
    }

    if (usage.count >= MAX_DAILY_QUERIES) {
      setShowLimitModal(true);
      return false;
    }
    return true;
  };

  const incrementUsage = () => {
    const today = new Date().toLocaleDateString();
    const usageData = localStorage.getItem(STORAGE_USAGE_KEY);
    let usage = { date: today, count: 0 };

    if (usageData) {
      const parsed = JSON.parse(usageData);
      if (parsed.date === today) {
        usage = parsed;
      }
    }

    usage.count += 1;
    localStorage.setItem(STORAGE_USAGE_KEY, JSON.stringify(usage));
  };

  const saveToHistory = (res: VerificationResult, preview: string, sourcesList: Source[]) => {
    const newItem: HistoryItem = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      result: res,
      previewText: preview || "Media Analysis",
      sources: sourcesList
    };
    const newHistory = [newItem, ...history].slice(0, 50);
    setHistory(newHistory);
    localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(newHistory));
  };

  const clearHistory = () => {
    if (confirm("Are you sure?")) {
      setHistory([]);
      localStorage.removeItem(STORAGE_HISTORY_KEY);
    }
  };

  const loadHistoryItem = (item: HistoryItem) => {
    // When loading history, we only restore the initial state
    setResults([item.result]);
    setResultsSources([item.sources]);
    setStage('complete');
    setShowHistory(false);
    
    // We cannot easily restore a "live" chat session from a single history item unless we stored the full context.
    // For now, we start a fresh session context based on the result so the user can continue asking questions.
    // However, without the original prompt text in the chat history, the model might lack context.
    // We will initialize the chat with the result as context.
    initializeChatWithContext(item.result);
  };

  // --- Handlers ---

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    setShowLangMenu(false);
  };

  const processFile = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setError(t.errorMediaSize);
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = (reader.result as string).split(',')[1];
      const id = Math.random().toString(36).substring(7);
      
      const newFile: MediaFile = {
        id,
        type: file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'image',
        data: base64Data,
        mimeType: file.type,
        isProcessing: file.type.startsWith('audio/')
      };

      setMediaFiles(prev => [...prev, newFile]);

      if (newFile.type === 'audio') {
          processAudioFile(newFile);
      }
    };
    reader.readAsDataURL(file);
  };

  const processAudioFile = async (file: MediaFile) => {
    try {
        const response = await ai.models.generateContent({
             model: 'gemini-2.5-flash',
             contents: {
                 parts: [
                     { inlineData: { mimeType: file.mimeType, data: file.data } },
                     { text: "Analyze this audio. Return JSON with two fields: 'transcript' (verbatim text) and 'analysis' (technical check for AI generation/deepfake artifacts, voice synthetic analysis)." }
                 ]
             },
             config: { responseMimeType: 'application/json' }
        });
        
        const json = JSON.parse(response.text || "{}");
        setMediaFiles(prev => prev.map(f => f.id === file.id ? { 
            ...f, 
            transcription: json.transcript || "No transcript generated.", 
            analysis: json.analysis || "No analysis available.", 
            isProcessing: false 
        } : f));
    } catch (e) {
        setMediaFiles(prev => prev.map(f => f.id === file.id ? { ...f, isProcessing: false, analysis: "Processing failed." } : f));
        console.error("Audio processing failed", e);
    }
  };

  const performDictation = async (base64Data: string, mimeType: string) => {
    setIsTranscribing(true);
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { mimeType, data: base64Data } },
                    { text: "Transcribe the audio into text. Detect the language automatically. Return ONLY the transcribed text, no explanations." }
                ]
            }
        });
        const transcript = response.text || "";
        setText(prev => (prev ? prev + " " : "") + transcript.trim());
    } catch (e) {
        console.error("Transcription failed", e);
        setError("Dictation failed.");
    } finally {
        setIsTranscribing(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
             const base64Data = (reader.result as string).split(',')[1];
             performDictation(base64Data, 'audio/webm');
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (e) {
      setError("Microphone access denied.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const generateDynamicSteps = async (textInput: string, files: MediaFile[], url: string, targetLang: Language) => {
    try {
      const mediaTypes = files.map(f => f.type).join(', ');
      let snippet = textInput ? `"${textInput.slice(0, 50)}..."` : '';
      if (url) snippet += ` URL: ${url}`;
      if (!snippet) snippet = 'No text';
      
      const contextDescription = `Content: [${snippet}]` + (files.length ? ` with attachments: [${mediaTypes}]` : "");

      const prompt = `
        Generate 4 short, highly contextual, forensic analysis status messages (max 6 words each) for a loading screen.
        The app is analyzing this specific user content: ${contextDescription}.
        If a URL is present, step 1 should mention fetching or reading the URL.
        
        The messages must represent these 4 sequential stages:
        1. Scanning/Ingestion (specific to content type, e.g., "Analyzing pixel data" or "Reading article")
        2. External Search/Verification (e.g., "Cross-referencing legal DBs")
        3. Logic/Reasoning/AI Detection
        4. Final Report Generation

        Language: ${targetLang} (${targetLang === 'es' ? 'Spanish' : targetLang === 'pt' ? 'Portuguese' : 'English'}).
        Output strictly a JSON array of 4 strings.
      `;

      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: prompt }] },
        config: { responseMimeType: 'application/json' }
      });

      const json = JSON.parse(result.text || "[]");
      if (Array.isArray(json) && json.length === 4) {
        setDynamicSteps(json);
      }
    } catch (e) {
      // Fail silently to default
      console.log("Dynamic step generation failed, using defaults");
    }
  };

  const analyzeContent = async () => {
    if (!checkUsageLimit()) return;

    if (!text && mediaFiles.length === 0 && !urlInput) {
      setError(t.errorInput);
      return;
    }

    setStage('scanning');
    setError(null);
    setResults([]); // Clear previous results
    setResultsSources([]);
    setDynamicSteps(null);

    // Fire and forget dynamic steps generation
    generateDynamicSteps(text, mediaFiles, urlInput, language);

    try {
      const parts = [];
      
      if (urlInput) {
         parts.push({ text: `PRIMARY SOURCE URL: ${urlInput}. 
         INSTRUCTION: Use Google Search to READ the full content of this URL. 
         Your analysis MUST be based on the content retrieved from this URL. 
         Extract the main text content you read and include it in the 'extractedContent' JSON field.` });
      }

      if (text) parts.push({ text: `ADDITIONAL CONTEXT: ${text}` });
      
      mediaFiles.forEach(file => {
          if (file.type === 'audio') {
              parts.push({ text: `[AUDIO EVIDENCE - FILE ID: ${file.id}]:
              Technical Pre-Analysis: ${file.analysis || 'Pending or Failed'}
              Transcript: "${file.transcription || 'No transcript'}"
              INSTRUCTION: Use the above audio transcript and technical analysis to judge the credibility of the audio content. Consider potential deepfake artifacts mentioned in the technical analysis.`});
          } else {
              parts.push({ inlineData: { mimeType: file.mimeType, data: file.data } });
          }
      });
      
      const languageName = language === 'es' ? 'Spanish' : language === 'pt' ? 'Portuguese' : 'English';

      const systemPrompt = `
        You are 'Veritas', an advanced digital forensic analyst specializing in Fraud & Misinformation Detection.
        
        Analyze the input (URL, Text, Image, Audio, or Video) or the User's question for threats:
        1. **Misinformation**: Fake News, Rumors, Conspiracy Theories.
        2. **Cyber Threats**: Phishing Emails, Scam Attempts, Social Engineering, Financial Fraud.
        3. **Digital Manipulation**: Deepfakes, AI-generated content.
        
        If a URL is provided, you MUST fetch/search its content and use it as evidence.
        
        CRITICAL: ALL your responses must be strictly valid JSON matching this schema:
        {
          "score": number, // 0-100 (100=Safe/True, 0=Fraud/Fake)
          "verdict": "CREDIBLE" | "SUSPICIOUS" | "FAKE" | "SATIRE",
          "isAiGenerated": boolean,
          "aiConfidence": number,
          "aiReasoning": "1 sentence technical explanation about AI artifacts in ${languageName}",
          "summary": "Concise executive summary in ${languageName}. Reference specific details.",
          "extractedContent": "A brief summary (max 300 chars) of the text content analyzed (in ${languageName}).",
          "claims": [{ "text": "Key Point/Red Flag", "isFact": boolean, "assessment": "Concise analysis in ${languageName}" }]
        }
      `;

      // Start Chat Session for continuous analysis
      const chat = ai.chats.create({
        model: 'gemini-3-pro-preview',
        config: {
          systemInstruction: systemPrompt,
          tools: [{ googleSearch: {} }],
          thinkingConfig: { thinkingBudget: 2048 }
        }
      });

      // Send the initial analysis request
      const response = await chat.sendMessage({ message: parts });

      // Process Sources
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const extractedSources: Source[] = chunks
        .filter((c: any) => c.web)
        .map((c: any) => ({ title: c.web?.title || 'Source', uri: c.web?.uri || '#' }));
      
      const uniqueSources = Array.from(new Map(extractedSources.map(s => [s.uri, s] as [string, Source])).values());

      // Extract JSON
      let rawText = response.text || "";
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as VerificationResult;
        
        // Success: Increment Usage and Save History
        incrementUsage();
        const preview = urlInput || text.slice(0, 60) + (text.length > 60 ? '...' : '') || (mediaFiles.length ? `Media: ${mediaFiles[0].type}` : 'Analysis');
        saveToHistory(parsed, preview, uniqueSources);

        setResults([parsed]);
        setResultsSources([uniqueSources]);
        setChatSession(chat); // Save session for follow-ups
        setStage('complete');
      } else {
        throw new Error("Invalid format");
      }
    } catch (err) {
      console.error(err);
      setError(t.errorAnalysis);
      setStage('idle');
    }
  };

  const handleFollowUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpInput.trim() || !chatSession) return;
    
    const query = followUpInput;
    setFollowUpInput('');
    setIsFollowingUp(true);

    try {
        // Send the follow-up question to the existing chat session
        const response = await chatSession.sendMessage({ message: query });

        // Process new sources
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const extractedSources: Source[] = chunks
            .filter((c: any) => c.web)
            .map((c: any) => ({ title: c.web?.title || 'Source', uri: c.web?.uri || '#' }));
        const uniqueSources = Array.from(new Map(extractedSources.map(s => [s.uri, s] as [string, Source])).values());

        // Parse JSON
        let rawText = response.text || "";
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]) as VerificationResult;
            setResults(prev => [...prev, parsed]);
            setResultsSources(prev => [...prev, uniqueSources]);
        }
    } catch (err) {
        console.error("Follow-up failed", err);
    } finally {
        setIsFollowingUp(false);
    }
  };

  const initializeChatWithContext = (res: VerificationResult) => {
      // Helper for history loading: creates a pseudo-session so follow-ups work.
      // We start a new chat but system prompt is key.
      
      const languageName = language === 'es' ? 'Spanish' : language === 'pt' ? 'Portuguese' : 'English';
      const systemPrompt = `
        You are 'Veritas', a forensic analyst.
        The user is viewing a previous report: ${JSON.stringify(res)}.
        
        If the user asks a follow-up question, you MUST reply with a NEW valid JSON object in the exact same schema as before, analyzing the specific question or new claim they make.
        
        Schema:
        { "score": number, "verdict": "CREDIBLE"|"SUSPICIOUS"|"FAKE"|"SATIRE", "isAiGenerated": boolean, "aiConfidence": number, "aiReasoning": string, "summary": string, "extractedContent": string, "claims": array }
        
        Language: ${languageName}.
      `;

      const chat = ai.chats.create({
          model: 'gemini-3-pro-preview',
          config: { 
              systemInstruction: systemPrompt, 
              tools: [{googleSearch: {}}] 
          }
      });
      setChatSession(chat);
  };

  const reset = () => {
    setStage('idle');
    setResults([]);
    setResultsSources([]);
    setText('');
    setUrlInput('');
    setShowUrlInput(false);
    setMediaFiles([]);
    setDynamicSteps(null);
    setChatSession(null);
    dragCounter.current = 0;
  };

  // --- Drag & Drop / Paste Handlers ---
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      Array.from(e.dataTransfer.files).forEach(processFile);
      e.dataTransfer.clearData();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    let hasFile = false;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file') {
          const file = items[i].getAsFile();
          if (file) {
            processFile(file);
            hasFile = true;
          }
        }
      }
    }
    if (hasFile) {
        e.preventDefault();
    }
  };

  const getCapabilityIcon = (index: number) => {
     const icons = [FileWarning, EyeOff, MailWarning, ShieldCheck];
     const Icon = icons[index] || AlertTriangle;
     return <Icon size={14} strokeWidth={2} />;
  };

  const getLoadingLabel = (currentStage: AnalysisStage) => {
    const defaultLabel = t.processingSteps[currentStage as keyof typeof t.processingSteps] || t.processingSteps.scanning;
    if (dynamicSteps && dynamicSteps.length === 4) {
       const idx = ['scanning', 'searching', 'reasoning', 'finalizing'].indexOf(currentStage);
       if (idx !== -1) return dynamicSteps[idx];
    }
    return defaultLabel;
  };

  const isAnyFileProcessing = mediaFiles.some(f => f.isProcessing) || isTranscribing;

  return (
    <div 
      className="h-screen bg-[#FDFBF7] text-[#111] font-sans selection:bg-black selection:text-white flex flex-col relative overflow-hidden"
      onDragEnter={handleDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onPaste={handlePaste}
    >
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FDFBF7]/90 backdrop-blur-md border-b border-black/5">
        <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer group" onClick={reset}>
             <div className="bg-black text-white p-1 rounded-sm group-hover:rotate-6 transition-transform">
               <Feather size={20} strokeWidth={2} />
             </div>
             <span className="serif text-xl tracking-tighter font-bold text-black">Veritas</span>
          </div>

          <div className="flex items-center gap-2">
            <button 
                onClick={() => setShowHistory(true)}
                className="p-2 text-gray-500 hover:text-black hover:bg-gray-100 rounded-full transition-colors relative"
            >
                <History size={18} />
                {history.length > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full"></span>}
            </button>
            <div className="relative" ref={menuRef}>
                <button onClick={() => setShowLangMenu(!showLangMenu)} className="flex items-center gap-2 text-xs font-bold tracking-widest hover:bg-black hover:text-white px-4 py-2 rounded-full transition-colors text-gray-900 border border-transparent hover:border-black">
                <Globe size={14} /> <span className="uppercase">{language}</span> <ChevronDown size={12} />
                </button>
                {showLangMenu && (
                <div className="absolute right-0 mt-2 w-32 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-lg overflow-hidden py-1 animate-fade-in z-50">
                    {['es', 'en', 'pt'].map(l => (
                    <button key={l} onClick={() => handleLanguageChange(l as Language)} className="w-full text-left px-4 py-2 text-xs font-medium hover:bg-gray-100">
                        {l === 'es' ? 'Español' : l === 'en' ? 'English' : 'Português'}
                    </button>
                    ))}
                </div>
                )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Scrollable Content */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-6 pt-28 pb-40 overflow-y-auto no-scrollbar scroll-smooth">
        
        {/* IDLE STAGE: Hero & Capabilities */}
        {stage === 'idle' && (
          <div className="flex flex-col items-center animate-fade-in-up">
            
            <header className="text-center mb-10 max-w-2xl mx-auto w-full">
              <h1 className="serif text-7xl md:text-9xl text-black mb-4 tracking-tighter font-semibold leading-none">
                Veritas
              </h1>
              <p className="text-gray-500 font-serif italic text-2xl md:text-3xl leading-relaxed">
                {t.subtitle}
              </p>
            </header>

            {/* Static Capability Tags - Centered List */}
            <div className="w-full max-w-3xl flex flex-wrap justify-center gap-6 md:gap-10 mb-20 px-4">
                {t.capabilities.map((cap, i) => (
                    <div key={i} className="flex items-center gap-3 opacity-60 hover:opacity-100 transition-opacity cursor-default select-none">
                        <div className="text-gray-900">
                            {getCapabilityIcon(i)}
                        </div>
                        <span className="text-xs font-mono font-bold uppercase tracking-widest text-gray-500 border-b border-transparent hover:border-gray-300 pb-0.5 transition-colors">{cap}</span>
                    </div>
                ))}
            </div>

            {error && (
              <div className="mb-8 text-center text-rose-600 bg-rose-50 border border-rose-100 py-3 px-6 rounded-full text-sm font-medium animate-fade-in flex items-center gap-2">
                <AlertTriangle size={16} /> {error}
              </div>
            )}

          </div>
        )}

        {/* LOADING STAGE */}
        {stage !== 'idle' && stage !== 'complete' && (
           <BookLoader label={getLoadingLabel(stage)} />
        )}

        {/* RESULT STAGE (Iterate over multiple results) */}
        {stage === 'complete' && (
           <div className="animate-fade-in py-8">
              
              {/* Controls */}
              <div className="flex justify-between items-center mb-8 no-print">
                 <button onClick={reset} className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-black transition-colors bg-white px-4 py-2 rounded-full border border-transparent hover:border-gray-200 shadow-sm">
                    <RefreshCcw size={14} /> {t.newSearch}
                 </button>
                 <button onClick={() => window.print()} className="p-2 text-gray-500 hover:text-black hover:bg-white rounded-full transition-all"><Printer size={20} /></button>
              </div>

              {/* RENDER ALL RESULTS IN SEQUENCE */}
              {results.map((res, index) => {
                  const resultSources = resultsSources[index] || [];
                  
                  // Construct Input Summary only for the first item
                  let inputContext: React.ReactNode = null;
                  if (index === 0) {
                      inputContext = (
                        <>
                            {urlInput && (
                                <div className="flex items-start gap-4 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                                    <div className="p-2 bg-gray-100 rounded-full text-gray-500"><Link size={18}/></div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-mono uppercase text-gray-400 font-bold mb-1">{t.originalUrl}</p>
                                        <a href={urlInput} target="_blank" className="text-sm text-blue-600 hover:underline truncate block">{urlInput}</a>
                                    </div>
                                </div>
                            )}
                            {text && (
                                <div className="flex items-start gap-4 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                                    <div className="p-2 bg-gray-100 rounded-full text-gray-500"><Quote size={18}/></div>
                                    <div className="flex-1">
                                        <p className="text-[10px] font-mono uppercase text-gray-400 font-bold mb-1">{t.originalText}</p>
                                        <p className="text-sm text-gray-700 italic font-serif leading-relaxed line-clamp-3">"{text}"</p>
                                    </div>
                                </div>
                            )}
                            {mediaFiles.length > 0 && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {mediaFiles.map((f, i) => (
                                        <div key={i} className="relative aspect-square bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm flex items-center justify-center">
                                            {f.type === 'video' && <Video size={24} className="text-gray-400" />}
                                            {f.type === 'audio' && <AudioLines size={24} className="text-gray-400" />}
                                            {f.type === 'image' && <img src={`data:${f.mimeType};base64,${f.data}`} className="w-full h-full object-cover" />}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                      );
                  }

                  return (
                      <ResultCard 
                        key={index} 
                        result={res} 
                        sources={resultSources} 
                        t={t} 
                        isFirst={index === 0}
                        inputContext={inputContext}
                      />
                  );
              })}

              {/* Loading indicator for follow-up */}
              {isFollowingUp && (
                 <div className="flex justify-center py-8">
                     <div className="bg-white border border-gray-200 px-6 py-4 rounded-full shadow-sm flex items-center gap-3 animate-pulse">
                         <Loader2 size={18} className="animate-spin text-black" />
                         <span className="font-mono text-xs uppercase tracking-widest text-gray-500">{t.followUpLoading}</span>
                     </div>
                 </div>
              )}
              
              <div ref={endOfResultsRef} />
           </div>
        )}
      </main>

      {/* FIXED BOTTOM INPUT BAR (Only in Idle State for Initial Search) */}
      {stage === 'idle' && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#FDFBF7] via-[#FDFBF7] to-transparent z-40">
           <div className="max-w-5xl mx-auto relative bg-white border border-gray-200 shadow-2xl rounded-2xl p-2 md:p-3 transition-all duration-300 focus-within:ring-2 focus-within:ring-black/5 focus-within:border-black/20" ref={inputContainerRef}>
              
              {/* Media Preview Area */}
              {mediaFiles.length > 0 && (
                 <div className="flex gap-3 px-2 pt-2 pb-2 overflow-x-auto no-scrollbar">
                    {mediaFiles.map((f, i) => (
                      <div key={f.id} className="relative group/media w-14 h-14 flex-shrink-0 bg-gray-50 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                         {f.type === 'video' ? (
                           <div className="w-full h-full flex items-center justify-center bg-gray-100"><Video size={16} className="text-gray-400" /></div>
                         ) : f.type === 'audio' ? (
                            <div className="w-full h-full flex items-center justify-center bg-gray-100 relative">
                                {f.isProcessing ? (
                                    <Loader2 size={16} className="text-blue-500 animate-spin" />
                                ) : (
                                    <AudioLines size={16} className="text-gray-500" />
                                )}
                            </div>
                         ) : (
                           <img src={`data:${f.mimeType};base64,${f.data}`} className="w-full h-full object-cover grayscale group-hover/media:grayscale-0 transition-all" />
                         )}
                         <button onClick={() => setMediaFiles(prev => prev.filter(file => file.id !== f.id))} className="absolute inset-0 bg-black/60 text-white opacity-0 group-hover/media:opacity-100 flex items-center justify-center transition-opacity">
                           <X size={12} />
                         </button>
                      </div>
                    ))}
                 </div>
              )}

              {/* URL Input Area (Conditional) */}
              {showUrlInput && (
                <div className="px-2 pb-2 mb-2 border-b border-gray-100 animate-fade-in-up">
                  <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200 focus-within:border-black/30 focus-within:ring-1 focus-within:ring-black/10 transition-all">
                     <Link size={16} className="text-gray-400" />
                     <input 
                       ref={urlInputRef}
                       type="url" 
                       value={urlInput}
                       onChange={(e) => setUrlInput(e.target.value)}
                       placeholder={t.urlPlaceholder}
                       className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-black placeholder:text-gray-400"
                       onKeyDown={(e) => {
                         if (e.key === 'Enter') analyzeContent();
                       }}
                     />
                     <button onClick={() => { setUrlInput(''); setShowUrlInput(false); }} className="text-gray-400 hover:text-black transition-colors">
                       <X size={14} />
                     </button>
                  </div>
                </div>
              )}

              {/* Text Input Area */}
              <div className="flex items-end gap-2">
                 <textarea 
                    id="input-textarea"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={t.placeholder}
                    className="flex-1 max-h-[60vh] min-h-[80px] py-4 px-4 bg-transparent resize-none outline-none font-serif text-lg placeholder:font-sans placeholder:font-light placeholder:text-gray-400 text-gray-900 leading-relaxed"
                    rows={1}
                 />
              </div>

              {/* Action Bar */}
              <div className="flex justify-between items-center px-2 pb-1 mt-1">
                  <div className="flex items-center gap-1">
                      <input type="file" multiple ref={fileInputRef} className="hidden" accept="image/*,video/*,audio/*" onChange={(e) => e.target.files && Array.from(e.target.files).forEach(processFile)} />
                      
                      <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-colors" title={t.uploadLabel}>
                        <Paperclip size={20} strokeWidth={2} />
                      </button>

                      <button onClick={() => setShowUrlInput(!showUrlInput)} className={`p-2 rounded-full transition-colors ${showUrlInput ? 'text-black bg-gray-100' : 'text-gray-400 hover:text-black hover:bg-gray-100'}`} title={t.linkLabel}>
                        <Link size={20} strokeWidth={2} />
                      </button>
                      
                      <button onClick={isRecording ? stopRecording : startRecording} disabled={isTranscribing} className={`p-2 rounded-full transition-colors ${isRecording ? 'text-red-500 bg-red-50 animate-pulse' : isTranscribing ? 'text-blue-500 bg-blue-50' : 'text-gray-400 hover:text-black hover:bg-gray-100'}`} title={t.micLabel}>
                         {isTranscribing ? <Loader2 size={20} className="animate-spin" /> : isRecording ? <Square size={20} fill="currentColor" /> : <Mic size={20} />}
                      </button>
                  </div>

                  <button 
                    onClick={analyzeContent}
                    disabled={(!text && mediaFiles.length === 0 && !urlInput) || isAnyFileProcessing}
                    className="bg-black text-white rounded-full px-5 py-2.5 font-medium text-sm flex items-center gap-2 hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md"
                  >
                    {isAnyFileProcessing ? (isTranscribing ? t.transcribing : t.processingAudio) : t.analyzeBtn} <ArrowRight size={14} />
                  </button>
              </div>
           </div>
        </div>
      )}

      {/* FIXED FOLLOW-UP INPUT BAR (Only when results exist) */}
      {stage === 'complete' && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-gray-200 z-50">
           <form onSubmit={handleFollowUpSubmit} className="max-w-4xl mx-auto flex items-center gap-3">
               <div className="relative flex-1">
                 <input 
                    type="text"
                    value={followUpInput}
                    onChange={(e) => setFollowUpInput(e.target.value)}
                    placeholder={t.followUpPlaceholder}
                    className="w-full bg-gray-100 border border-transparent focus:bg-white focus:border-black/20 rounded-full pl-5 pr-12 py-4 text-sm focus:ring-2 focus:ring-black/5 outline-none transition-all placeholder:text-gray-400"
                    disabled={isFollowingUp}
                 />
                 <button 
                    type="submit" 
                    disabled={!followUpInput.trim() || isFollowingUp}
                    className="absolute right-2 top-2 p-2 bg-black text-white rounded-full hover:bg-gray-800 disabled:opacity-50 disabled:bg-gray-400 transition-colors"
                 >
                    {isFollowingUp ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                 </button>
               </div>
           </form>
        </div>
      )}

      {/* History Slide-over */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowHistory(false)}></div>
            <div className="relative w-full max-w-md bg-white shadow-2xl h-full flex flex-col animate-fade-in-up">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                    <h2 className="font-serif font-bold text-xl flex items-center gap-2"><History size={20}/> {t.historyTitle}</h2>
                    <div className="flex items-center gap-2">
                         {history.length > 0 && (
                            <button onClick={clearHistory} className="p-2 text-rose-500 hover:bg-rose-50 rounded-full" title={t.clearHistory}><Trash2 size={18}/></button>
                         )}
                         <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-gray-200 rounded-full"><X size={20}/></button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {history.length === 0 && (
                        <div className="text-center text-gray-400 mt-20 flex flex-col items-center">
                            <Clock size={48} className="mb-4 opacity-20"/>
                            <p>{t.historyEmpty}</p>
                        </div>
                    )}
                    {history.map(item => (
                        <div key={item.id} onClick={() => loadHistoryItem(item)} className="group cursor-pointer bg-white border border-gray-200 p-4 rounded-xl shadow-sm hover:shadow-md hover:border-black transition-all">
                            <div className="flex justify-between items-start mb-2">
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${item.result.verdict === 'CREDIBLE' ? 'bg-emerald-100 text-emerald-700' : item.result.verdict === 'FAKE' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {t.verdictLabels[item.result.verdict]}
                                </span>
                                <span className="text-xs text-gray-400 font-mono">{new Date(item.timestamp).toLocaleDateString()}</span>
                            </div>
                            <p className="text-sm text-gray-800 font-medium line-clamp-2 mb-2 group-hover:text-black">"{item.previewText}"</p>
                            <div className="flex justify-between items-end">
                                <span className={`font-mono text-sm font-bold ${item.result.score < 50 ? 'text-rose-500' : 'text-emerald-500'}`}>Score: {item.result.score}/100</span>
                                <ArrowRight size={14} className="text-gray-300 group-hover:text-black group-hover:translate-x-1 transition-all"/>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}

      {/* Limit Modal */}
      {showLimitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
            <div className="relative bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl animate-fade-in text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Lock size={32} className="text-black"/>
                </div>
                <h3 className="font-serif text-2xl font-bold mb-3">{t.limitTitle}</h3>
                <p className="text-gray-600 mb-6">{t.limitMsg}<br/>{t.limitSubMsg}</p>
                <button 
                    onClick={() => setShowLimitModal(false)}
                    className="w-full bg-black text-white py-3 rounded-full font-bold hover:bg-gray-800 transition-colors"
                >
                    {t.limitBtn}
                </button>
            </div>
        </div>
      )}

      {/* Global Drop Zone Overlay */}
      {isDragging && stage === 'idle' && (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-md z-50 flex flex-col items-center justify-center animate-fade-in border-4 border-dashed border-gray-900 m-4 rounded-3xl">
           <div className="bg-black text-white p-6 rounded-full animate-bounce mb-6">
             <Upload size={40} strokeWidth={1.5} />
           </div>
           <h3 className="font-serif text-4xl text-black font-bold mb-2">{t.dropZone}</h3>
           <p className="font-mono text-sm text-gray-500 tracking-widest uppercase">Release to verify</p>
        </div>
      )}

      <style>{`
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #d1d5db; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);