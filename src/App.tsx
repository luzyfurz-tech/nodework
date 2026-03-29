import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Key, Settings, Loader2, RefreshCw, Trash2, ChevronDown, Layout, Code, Eye, Sparkles, Copy, Check, Globe, Maximize2, Download, Gamepad2, Users, Smartphone, Rocket, Target, Search, Filter, ExternalLink, AlertTriangle, ThumbsUp, ThumbsDown, LayoutDashboard, Database, Briefcase, MousePointer2, Shield, Terminal } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { GoogleGenAI, Type } from "@google/genai";

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Helper to extract JSON from markdown or text
const extractJSON = (text: string) => {
  try {
    // Try direct parse first
    return JSON.parse(text);
  } catch (e) {
    // Try to find JSON in markdown or text
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || 
                      text.match(/\{[\s\S]*\}/) ||
                      text.match(/\[[\s\S]*\]/);
    
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } catch (innerE) {
        return null;
      }
    }
    return null;
  }
};

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface Model {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

const DEFAULT_API_KEY = '177ce4df955743d8a338c841383e5002.0Lus05Xg-KF5ilWRNqSegtPo';

export default function App() {
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('ollama_api_key') || DEFAULT_API_KEY);
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [streamEnabled, setStreamEnabled] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'web' | 'social' | 'appmaker' | 'multiagent' | 'leadsniper' | 'security' | 'seo'>('chat');
  
  // Security Guard State
  const [securityUrl, setSecurityUrl] = useState('');
  const [securityLogs, setSecurityLogs] = useState<string[]>([]);
  const [securityReport, setSecurityReport] = useState<any>(null);
  const [isScanningSecurity, setIsScanningSecurity] = useState(false);
  const [securitySelectedModel, setSecuritySelectedModel] = useState<string>('');
  const [securityResearcherModel, setSecurityResearcherModel] = useState<string>('');
  const [securityAuditorModel, setSecurityAuditorModel] = useState<string>('');
  
  // SEO & Ads State
  const [seoUrl, setSeoUrl] = useState('');
  const [seoKeywords, setSeoKeywords] = useState('');
  const [seoPlatform, setSeoPlatform] = useState<'google-seo' | 'google-ads' | 'social-ads'>('google-seo');
  const [seoResults, setSeoResults] = useState<{
    seoHealth: {
      title: string;
      description: string;
      h1: string[];
      h2: string[];
      h3: string[];
      status: 'good' | 'warning' | 'critical';
    };
    adCopy: {
      headline: string;
      description: string;
      displayUrl: string;
    };
    keywordStrategy: {
      keyword: string;
      volume: string;
      difficulty: string;
      intent: string;
    }[];
  } | null>(null);
  const [isGeneratingSeo, setIsGeneratingSeo] = useState(false);
  const [seoSelectedModel, setSeoSelectedModel] = useState<string>('');
  
  // Leadsniper State
  interface Lead {
    name: string;
    cvr: string;
    location: string;
    industry: string;
    score: number;
    confidence_pct: number;
    source_url: string;
    domain_status: string;
    pitch: string;
    action_trigger: string;
  }

  const [leadSniperResults, setLeadSniperResults] = useState<Lead[]>([]);
  const [isGeneratingLeads, setIsGeneratingLeads] = useState(false);
  const [verifiedLeadsCount, setVerifiedLeadsCount] = useState(0);
  const [hallucinationsCaughtCount, setHallucinationsCaughtCount] = useState(0);
  const [leadFeedbackHistory, setLeadFeedbackHistory] = useState<{name: string, cvr: string, feedback: 'up' | 'down', reason?: string}[]>([]);
  const [activeFeedbackLead, setActiveFeedbackLead] = useState<string | null>(null);

  const handleLeadFeedback = (lead: Lead, feedback: 'up' | 'down', reason?: string) => {
    if (feedback === 'up') {
      setVerifiedLeadsCount(prev => prev + 1);
      setLeadFeedbackHistory(prev => [...prev, { name: lead.name, cvr: lead.cvr, feedback }]);
      setLeadSniperResults(prev => prev.filter(l => l.cvr !== lead.cvr));
    } else {
      if (reason) {
        setHallucinationsCaughtCount(prev => prev + 1);
        setLeadFeedbackHistory(prev => [...prev, { name: lead.name, cvr: lead.cvr, feedback, reason }]);
        setLeadSniperResults(prev => prev.filter(l => l.cvr !== lead.cvr));
        setActiveFeedbackLead(null);
      } else {
        setActiveFeedbackLead(lead.cvr);
      }
    }
  };

  const resetLeadSniperSession = () => {
    setVerifiedLeadsCount(0);
    setHallucinationsCaughtCount(0);
    setLeadFeedbackHistory([]);
    setLeadSniperResults([]);
  };

  const calculateTrustScore = () => {
    const total = verifiedLeadsCount + hallucinationsCaughtCount;
    if (total === 0) return 100;
    // Weighted score: Verified +2, Hallucination -5
    // Normalize to 0-100%
    const score = (verifiedLeadsCount * 2) - (hallucinationsCaughtCount * 5);
    const maxPossible = total * 2;
    const percentage = Math.max(0, Math.round((score / maxPossible) * 100));
    return percentage;
  };
  const [leadSniperSelectedModel, setLeadSniperSelectedModel] = useState<string>('gemini-3-flash-preview');
  const [leadSniperFilters, setLeadSniperFilters] = useState({
    newestCvr: false,
    availableDomains: false,
    highScore: false
  });
  const [leadSniperSource, setLeadSniperSource] = useState<'google' | 'cvr'>('google');
  const [leadSniperIndustry, setLeadSniperIndustry] = useState('Alle');
  const [leadSniperCustomSearch, setLeadSniperCustomSearch] = useState('');

  // Multiagent State
  const [multiAgentRounds, setMultiAgentRounds] = useState(2);
  const [multiAgentCount, setMultiAgentCount] = useState(2);
  const [multiAgentTask, setMultiAgentTask] = useState('');
  const [multiAgentConfigs, setMultiAgentConfigs] = useState([
    { model: '', role: 'Planner' },
    { model: '', role: 'Executor' },
    { model: '', role: 'Critic' }
  ]);
  const [multiAgentResults, setMultiAgentResults] = useState<{ agentIndex: number, content: string, round: number }[]>([]);
  const [multiAgentViewMode, setMultiAgentViewMode] = useState<'preview' | 'code'>('code');
  const [isGeneratingMultiAgent, setIsGeneratingMultiAgent] = useState(false);
  const [currentActiveAgent, setCurrentActiveAgent] = useState<number | null>(null);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);

  const ROLES = ["Planner", "Executor", "Critic", "Researcher", "Assistant", "Creative Writer", "Coder", "Summarizer", "Security Auditor", "UX Designer", "Fact Checker"];
  
  // Web Builder State
  const DEFAULT_WEB_CODE = '<!DOCTYPE html>\n<html lang="da">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<style>\nbody { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #0a0a0a; color: white; }\n</style>\n</head>\n<body>\n<h1>Din hjemmeside forhåndsvisning</h1>\n</body>\n</html>';
  const [webDescription, setWebDescription] = useState('');
  const [webCode, setWebCode] = useState(DEFAULT_WEB_CODE);
  const [isGeneratingWeb, setIsGeneratingWeb] = useState(false);
  const [webSelectedModel, setWebSelectedModel] = useState<string>('');
  const [webViewMode, setWebViewMode] = useState<'preview' | 'code'>('preview');
  const [copySuccess, setCopySuccess] = useState(false);
  const [savedProjects, setSavedProjects] = useState<{name: string, code: string, date: string}[]>(() => {
    const saved = localStorage.getItem('web_forge_projects');
    return saved ? JSON.parse(saved) : [];
  });

  // Social Media State
  const [socialPrompt, setSocialPrompt] = useState('');
  const [socialContent, setSocialContent] = useState('');
  const [isGeneratingSocial, setIsGeneratingSocial] = useState(false);
  const [socialSelectedModel, setSocialSelectedModel] = useState<string>('');
  const [socialPlatform, setSocialPlatform] = useState<'tiktok' | 'facebook' | 'instagram' | 'linkedin' | 'youtube'>('tiktok');
  
  // App Maker State
  const DEFAULT_APP_CODE = '<!DOCTYPE html>\n<html lang="da">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">\n<title>App Preview</title>\n<style>\nbody { margin: 0; background: #f4f4f5; color: #18181b; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; }\n#app-container { width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; }\n</style>\n</head>\n<body>\n<div id="app-container">\n  <div style="text-align: center; padding: 2rem; background: white; border-radius: 1rem; shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">\n    <h1 style="color: #f97316; margin-bottom: 0.5rem;">App Maker Ready</h1>\n    <p style="color: #71717a; font-size: 14px;">Vælg en arkitektur og beskriv din app til venstre</p>\n  </div>\n</div>\n</body>\n</html>';
  const [appDescription, setAppDescription] = useState('');
  const [appCode, setAppCode] = useState(DEFAULT_APP_CODE);
  const [isGeneratingApp, setIsGeneratingApp] = useState(false);
  const [appSelectedModel, setAppSelectedModel] = useState<string>('');
  const [appViewMode, setAppViewMode] = useState<'preview' | 'code'>('preview');
  const [appArchitecture, setAppArchitecture] = useState<'saas' | 'cms' | 'business' | 'interactive'>('saas');
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // Forwarding Logic
  const extractCode = (content: string, type: 'web' | 'appmaker' | 'social') => {
    if (type === 'web' || type === 'appmaker') {
      let code = content;
      // Try to find markdown blocks first
      const htmlBlock = content.match(/```html\s*([\s\S]*?)\s*```/i);
      const genericBlock = content.match(/```\s*([\s\S]*?)\s*```/i);
      
      if (htmlBlock) {
        code = htmlBlock[1];
      } else if (genericBlock) {
        code = genericBlock[1];
      }
      
      // If no markdown blocks but contains HTML tags, try to extract the whole thing or specific tags
      if (!htmlBlock && !genericBlock) {
        const docMatch = content.match(/<!DOCTYPE[\s\S]*?<\/html>/i) || content.match(/<html[\s\S]*?<\/html>/i);
        if (docMatch) {
          code = docMatch[0];
        }
      }
      
      return code.trim();
    }
    return content.trim();
  };

  const forwardTo = (content: string, destination: 'web' | 'social' | 'appmaker' | 'multiagent') => {
    const extracted = extractCode(content, destination === 'multiagent' ? 'social' : destination);
    
    switch (destination) {
      case 'web':
        setWebCode(extracted);
        setWebViewMode('preview');
        setActiveTab('web');
        break;
      case 'social':
        setSocialContent(extracted);
        setActiveTab('social');
        break;
      case 'appmaker':
        setAppCode(extracted);
        setAppViewMode('preview');
        setActiveTab('appmaker');
        break;
      case 'multiagent':
        setMultiAgentTask(content);
        setActiveTab('multiagent');
        break;
    }
  };

  // Save projects to local storage
  useEffect(() => {
    localStorage.setItem('web_forge_projects', JSON.stringify(savedProjects));
  }, [savedProjects]);

  const saveProject = () => {
    const name = prompt('Indtast et navn til dit projekt:', `Projekt ${savedProjects.length + 1}`);
    if (name) {
      const newProject = {
        name,
        code: webCode,
        date: new Date().toLocaleString('da-DK')
      };
      setSavedProjects(prev => [newProject, ...prev]);
    }
  };

  const loadProject = (project: {name: string, code: string}) => {
    if (window.confirm(`Er du sikker på, at du vil indlæse "${project.name}"? Dette vil overskrive din nuværende kode.`)) {
      setWebCode(project.code);
      setWebViewMode('preview');
    }
  };

  const deleteProject = (index: number) => {
    if (window.confirm('Er du sikker på, at du vil slette dette projekt?')) {
      setSavedProjects(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Save API key to local storage
  useEffect(() => {
    localStorage.setItem('ollama_api_key', apiKey);
  }, [apiKey]);

  // Fetch models when API key changes
  useEffect(() => {
    if (apiKey) {
      fetchModels();
    } else {
      setConnectionStatus('idle');
      setModels([]);
    }
  }, [apiKey]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchModels = async () => {
    if (!apiKey) return;
    setIsFetchingModels(true);
    setConnectionStatus('connecting');
    setError(null);
    try {
      const response = await fetch('/api/models', {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });
      if (!response.ok) throw new Error('Kunne ikke hente modeller. Tjek din API-nøgle.');
      const data = await response.json();
      const modelList = data.models || [];
      setModels(modelList);
      setConnectionStatus('connected');
      
      if (modelList.length > 0) {
        if (!selectedModel) {
          setSelectedModel(modelList[0].name);
        }
        
        // Set default for Web Forge
        if (!webSelectedModel) {
          const geminiModel = modelList.find((m: Model) => m.name.includes('gemini-3-flash-preview'));
          if (geminiModel) {
            setWebSelectedModel(geminiModel.name);
          } else {
            setWebSelectedModel(modelList[0].name);
          }
        }

        // Set default for Social Media
        if (!socialSelectedModel) {
          const geminiModel = modelList.find((m: Model) => m.name.includes('gemini-3-flash-preview'));
          if (geminiModel) {
            setSocialSelectedModel(geminiModel.name);
          } else {
            setSocialSelectedModel(modelList[0].name);
          }
        }

        // Set default for App Maker
        if (!appSelectedModel) {
          const geminiModel = modelList.find((m: Model) => m.name.includes('gemini-3-flash-preview'));
          if (geminiModel) {
            setAppSelectedModel(geminiModel.name);
          } else {
            setAppSelectedModel(modelList[0].name);
          }
        }

        // Set default for Security Guard
        if (!securitySelectedModel) {
          const geminiModel = modelList.find((m: Model) => m.name.includes('gemini-3-flash-preview'));
          const qwenModel = modelList.find((m: Model) => m.name.includes('qwen3-coder:480b'));
          const kimiModel = modelList.find((m: Model) => m.name.includes('kimi-k2-thinking'));

          setSecuritySelectedModel(geminiModel?.name || modelList[0].name);
          setSecurityResearcherModel(qwenModel?.name || geminiModel?.name || modelList[0].name);
          setSecurityAuditorModel(kimiModel?.name || geminiModel?.name || modelList[0].name);
        }

        // Set default for SEO & Ads
        if (!seoSelectedModel) {
          const geminiModel = modelList.find((m: Model) => m.name.includes('gemini-3-flash-preview'));
          if (geminiModel) {
            setSeoSelectedModel(geminiModel.name);
          } else {
            setSeoSelectedModel(modelList[0].name);
          }
        }

        if (!securityResearcherModel && modelList.length > 0) {
          const qwenModel = modelList.find((m: Model) => m.name.includes('qwen3-coder:480b'));
          setSecurityResearcherModel(qwenModel?.name || securitySelectedModel || modelList[0].name);
        }
        if (!securityAuditorModel && modelList.length > 0) {
          const kimiModel = modelList.find((m: Model) => m.name.includes('kimi-k2-thinking'));
          setSecurityAuditorModel(kimiModel?.name || securitySelectedModel || modelList[0].name);
        }
      }
    } catch (err: any) {
      setError(err.message);
      setConnectionStatus('error');
    } finally {
      setIsFetchingModels(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedModel || !apiKey || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: newMessages,
          stream: streamEnabled,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Kunne ikke hente svar');
      }

      if (streamEnabled) {
        const reader = response.body?.getReader();
        if (!reader) throw new Error('Ingen reader tilgængelig');

        const assistantMessage: Message = { role: 'assistant', content: '' };
        setMessages((prev) => [...prev, assistantMessage]);

        const decoder = new TextDecoder();
        let accumulatedContent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.message?.content) {
                  accumulatedContent += data.message.content;
                  setMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                      ...updated[updated.length - 1],
                      content: accumulatedContent,
                    };
                    return updated;
                  });
                }
              } catch (e) {
                // Ignore parse errors for partial chunks
              }
            }
          }
        }
      } else {
        const data = await response.json();
        if (data.message?.content) {
          const assistantMessage: Message = { 
            role: 'assistant', 
            content: data.message.content 
          };
          setMessages((prev) => [...prev, assistantMessage]);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  const handleGenerateWeb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webDescription.trim() || !webSelectedModel || !apiKey || isGeneratingWeb) return;

    setIsGeneratingWeb(true);
    setError(null);

    const isIterative = webCode !== DEFAULT_WEB_CODE;
    const prompt = `Du er en ekspert i moderne webdesign og frontend-udvikling. 
    ${isIterative ? `Rediger denne eksisterende kode: \n\`\`\`html\n${webCode}\n\`\`\`
    
    VIGTIGT: Ved opdateringer skal du BEVARE det eksisterende design, farveskema, logo og struktur. Du skal KUN implementere de specifikke ændringer eller tilføjelser, der anmodes om. Gør ikke om på ting, der ikke er bedt om.` : 'Opret en ny hjemmeside'} 
    baseret på denne beskrivelse: "${webDescription}".

    REGLER FOR LINKS (SKAL OVERHOLDES):
    1. Alle links SKAL være anker-links, der peger på et ID på siden (f.eks. href="#kontakt").
    2. Du SKAL give hver sektion et unikt ID (f.eks. <section id="tjenester">), så links virker.
    3. Brug ALDRIG href="/" eller eksterne URL'er (f.eks. google.com).
    4. Lav kun navigations-links i top-menuen, der peger på disse sektioner.
    5. Alle knapper skal også bruge href="#[id]".

    DESIGN REGLER:
    1. Brug KUN én HTML-fil med intern CSS i <style>.
    2. LOGO: Skab et stilrent og moderne logo i top-menuen. Det kan være et flot ikon lavet med CSS/SVG eller en meget vel-stylet tekst (f.eks. med en gradient, speciel font-weight eller et lille grafisk element). Det skal føles "premium" og professionelt.
    3. BILLEDER (SKAL VÆRE FASTE): 
       - Brug https://picsum.photos/seed/[UNIK_SEED]/1200/800 for at sikre, at billedet er det samme hver gang siden genindlæses.
       - [UNIK_SEED] skal være et unikt ord eller tal for hvert billede (f.eks. 'hero1', 'feature2', 'team3').
       - Du kan også bruge specifikke Unsplash IDs (f.eks. https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200).
       - VIGTIGT: Brug ALDRIG generiske URL'er uden seed (som f.eks. bare /1200/800), da de skifter billede ved hver opdatering.
    4. Sørg for at designet er 100% responsivt.
    5. Skriv alt på dansk.

    Returner KUN den rå HTML-kode uden forklaringer eller markdown-blokke.`;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: webSelectedModel,
          messages: [{ role: 'user', content: prompt }],
          stream: false, // Non-streaming for easier handling of the full code block
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Kunne ikke hente svar fra Ollama');
      }

      const data = await response.json();
      let code = data.message?.content || '';
      
      // Clean up markdown if AI included it despite instructions
      code = code.replace(/^```html\n?/, '').replace(/\n?```$/, '');
      
      if (code.includes('<!DOCTYPE html>') || code.includes('<html')) {
        setWebCode(code);
        setWebDescription(''); // Clear input after successful generation
        setWebViewMode('preview');
      } else {
        throw new Error("AI'en returnerede ikke gyldig HTML-kode. Prøv venligst igen med en mere specifik beskrivelse.");
      }
    } catch (err: any) {
      setError(`Fejl ved generering af web: ${err.message}`);
    } finally {
      setIsGeneratingWeb(false);
    }
  };

  const handleGenerateSocial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!socialPrompt.trim() || !socialSelectedModel || !apiKey || isGeneratingSocial) return;

    setIsGeneratingSocial(true);
    setError(null);

    const systemPrompt = `Du er en ekspert Digital Content Manager og kreativ tekstforfatter. 
    Din opgave er at skabe engagerende, viralt og professionelt indhold til sociale medier.
    
    Platform: ${socialPlatform.toUpperCase()}
    
    REGLER:
    1. Skriv altid på dansk (medmindre andet er specifikt anmodet).
    2. Brug relevante emojis for at gøre indholdet levende.
    3. Inkluder relevante hashtags til sidst.
    4. Hvis det er et TikTok/YouTube script, skal du inkludere visuelle anvisninger (f.eks. [Klip til nærbillede], [Tekst på skærm]).
    5. Fokusér på at skabe værdi, vække følelser eller skabe nysgerrighed (Hook, Body, Call to Action).
    
    Beskrivelse af opgaven: "${socialPrompt}"`;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: socialSelectedModel,
          messages: [{ role: 'user', content: systemPrompt }],
          stream: true,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Kunne ikke hente svar fra Ollama');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Ingen reader tilgængelig');

      const decoder = new TextDecoder();
      let accumulatedContent = '';
      setSocialContent('');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.message?.content) {
                accumulatedContent += data.message.content;
                setSocialContent(accumulatedContent);
              }
            } catch (e) {
              // Ignore parse errors for partial chunks
            }
          }
        }
      }
    } catch (err: any) {
      setError(`Fejl ved generering af socialt indhold: ${err.message}`);
    } finally {
      setIsGeneratingSocial(false);
    }
  };

  const handleRunLeadSniper = async () => {
    if (isGeneratingLeads) return;

    setIsGeneratingLeads(true);
    setError(null);
    setLeadSniperResults([]);

    const feedbackPrompt = leadFeedbackHistory.length > 0 
      ? `\n\nFEEDBACK & LEARNING LOOP (Prioritize strategies from Upvotes, avoid strategies from Downvotes):
${leadFeedbackHistory.map(f => `- ${f.name} (CVR: ${f.cvr}): ${f.feedback === 'up' ? 'Verified Lead (+2) - Prioritize similar sources/structures.' : `Hallucination Penalty (-5) - HARD FAIL. Reason: ${f.reason || 'Unknown'}. Analyze error and remove this strategy.`}`).join('\n')}`
      : '';

    const systemPrompt = `SYSTEM INSTRUCTIONS: The Sniper Engine v3.0 (Grounding-First Edition)
ROLE:
Du er 'The Sniper Engine' – en elite-backend til lead-generering. Din succes måles på dataintegritet og real-time verifikation. Du skal finde ægte, nyopstartede danske virksomheder og transformere dem til JSON-leads.

GOOGLE SEARCH GROUNDING IS MANDATORY:
Du SKAL bruge Google Search værktøjet til at verificere hvert eneste lead. 
- Find virksomheder registreret indenfor de sidste 48 timer eller nyligt aktive i branchen.
- Verificer CVR-nummer, adresse og kontaktinfo via officielle kilder (datacvr.virk.dk, proff.dk, ownr.dk).
- Hvis du ikke kan finde 100% bekræftelse på et lead, skal du udelade det.

THE INTEGRITY & REWARD SYSTEM:
- Verified Lead (+2 point): Data er 100% korrekt og verificeret.
- Hallucination Penalty (-10 point): Opdigtede data (CVR, navne, kilder). Dette er uacceptabelt.
${feedbackPrompt}

WORKFLOW:
1. Search: Scan efter nylige registreringer i branchen: ${leadSniperIndustry}.
2. Verify: Brug Google Search til at bekræfte CVR og status.
3. Assess: Vurder sikkerhed (0-100%).
4. Output: Returner KUN et JSON-array.

INPUT:
- Branche: ${leadSniperIndustry}
- Custom Search: ${leadSniperCustomSearch}
- Filtre: ${JSON.stringify(leadSniperFilters)}

JSON SCHEMA:
[
  {
    "name": "Virksomhedsnavn",
    "cvr": "12345678",
    "location": "By & Postnr",
    "industry": "Branche",
    "score": 1-10,
    "confidence_pct": 0-100,
    "source_url": "Direkte link til verificering",
    "domain_status": "Estimeret Ledig/Optaget",
    "pitch": "1-sætnings salgsargument",
    "action_trigger": "Template_ID"
  }
]`;

    const modelName = leadSniperSelectedModel || 'gemini-3-flash-preview';

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: modelName,
        contents: `Find nylige leads i Danmark. Branche: ${leadSniperIndustry}. Ekstra info: ${leadSniperCustomSearch}. Brug Google Search til at finde de nyeste data. Returnér kun JSON.`,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          tools: [{ googleSearch: {} }],
        },
      });

      const results = extractJSON(response.text);
      if (results && Array.isArray(results)) {
        setLeadSniperResults(results);
      } else {
        throw new Error("Kunne ikke læse lead-data fra Gemini. Svaret var ikke gyldig JSON.");
      }
    } catch (err: any) {
      setError(`Leadsniper error: ${err.message}`);
    } finally {
      setIsGeneratingLeads(false);
    }
  };

  const handleRunMultiAgent = async () => {
    if (!multiAgentTask.trim() || !apiKey || isGeneratingMultiAgent) return;

    setIsGeneratingMultiAgent(true);
    setError(null);
    setMultiAgentResults([]);
    
    // Maintain history for the entire session
    const sessionHistory: { role: string, content: string, agentName: string }[] = [];

    try {
      for (let r = 0; r < multiAgentRounds; r++) {
        for (let a = 0; a < multiAgentCount; a++) {
          setCurrentActiveAgent(a);
          const config = multiAgentConfigs[a];
          const agentName = `Agent ${a + 1} (${config.role})`;
          
          // Add a placeholder result for streaming
          setMultiAgentResults(prev => [...prev, { agentIndex: a, content: '', round: r }]);
          
          const systemPrompt = `Du er ${agentName}. Din rolle er: ${config.role}. 
          Dette er en samarbejdende multi-agent session. 
          Vær konstruktiv, specifik og byg videre på de andre agenters input.
          Hvis opgaven kræver kode, så generér den i en komplet HTML-blok.`;
          
          // Construct messages using the "Golden Middle Way" (Task + Last Response only)
          const lastHistory = sessionHistory[sessionHistory.length - 1];
          const messagesForAgent = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Hovedopgave: ${multiAgentTask}` },
            ...(lastHistory ? [{ 
              role: 'assistant' as const, 
              content: `Seneste opdatering fra ${lastHistory.agentName}:\n\n${lastHistory.content}` 
            }] : []),
            { 
              role: 'user', 
              content: r === 0 && a === 0 
                ? "Begynd opgaven." 
                : "Fortsæt arbejdet baseret på den seneste opdatering ovenfor. Hold fokus på hovedopgaven." 
            }
          ];

          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: config.model,
              messages: messagesForAgent,
              stream: true,
            }),
          });

          if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'API error');
          }

          const reader = response.body?.getReader();
          if (!reader) throw new Error('No reader');

          const decoder = new TextDecoder();
          let accumulatedContent = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.message?.content) {
                    accumulatedContent += data.message.content;
                    setMultiAgentResults(prev => {
                      const updated = [...prev];
                      updated[updated.length - 1].content = accumulatedContent;
                      return updated;
                    });
                  }
                } catch (e) {}
              }
            }
          }
          sessionHistory.push({ role: 'assistant', content: accumulatedContent, agentName });
        }
      }
    } catch (err: any) {
      setError(`Multiagent error: ${err.message}`);
    } finally {
      setIsGeneratingMultiAgent(false);
      setCurrentActiveAgent(null);
    }
  };

  const handleSecurityAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!securityUrl.trim() || !securitySelectedModel || !apiKey || isScanningSecurity) return;

    setIsScanningSecurity(true);
    setSecurityLogs(["[SYSTEM] Initializing Security Audit Engine...", `[SYSTEM] Target: ${securityUrl}`]);
    setSecurityReport(null);
    setError(null);

    try {
      // 1. Fetch metadata via server proxy
      setSecurityLogs(prev => [...prev, "[SCAN] Fetching HTTP headers and SSL certificates..."]);
      const scanResponse = await fetch('/api/security/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: securityUrl })
      });

      if (!scanResponse.ok) throw new Error('Kunne ikke scanne domænet. Tjek URL\'en.');
      const scanData = await scanResponse.json();
      
      setSecurityLogs(prev => [...prev, "[AGENT] Researcher starting deep analysis..."]);
      
      // 2. Step 1: Researcher Agent
      const researcherPrompt = "Du er en Security Researcher. Din opgave er at analysere rå scan-data (headers, SSL) og identificere alle potentielle sikkerhedshuller, manglende headers og SSL-svagheder. Vær meget grundig og teknisk.";
      const scanContext = `Target URL: ${scanData.url}\nHeaders: ${JSON.stringify(scanData.headers)}\nSSL Info: ${JSON.stringify(scanData.ssl)}`;

      const researcherResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: securityResearcherModel || securitySelectedModel,
          messages: [
            { role: 'system', content: researcherPrompt },
            { role: 'user', content: `Analysér disse data: ${scanContext}` }
          ],
          stream: false,
        }),
      });

      if (!researcherResponse.ok) throw new Error('Researcher Agent fejlede under analysen.');
      const researcherData = await researcherResponse.json();
      const researcherFindings = researcherData.message.content;
      
      // Log a snippet of researcher findings
      const snippet = researcherFindings.length > 100 ? researcherFindings.substring(0, 100) + "..." : researcherFindings;
      setSecurityLogs(prev => [...prev, `[AGENT] Researcher Findings: ${snippet}`]);
      setSecurityLogs(prev => [...prev, "[AGENT] Researcher analysis complete. Auditor is now verifying..."]);

      // 3. Step 2: Auditor Agent
      const auditorPrompt = "Du er en Security Auditor. Du har modtaget en rapport fra en Researcher. Din opgave er at verificere disse fund mod de rå data, fjerne eventuelle hallucinationer eller fejl, og prioritere de vigtigste defensive rettelser. Returnér resultatet som JSON med følgende struktur: { \"safetyScore\": number, \"vulnerabilities\": string[], \"actionPlan\": string }";
      
      const auditorContext = `Rå Data:\n${scanContext}\n\nResearcher Fund:\n${researcherFindings}`;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: securityAuditorModel || securitySelectedModel,
          messages: [
            { role: 'system', content: auditorPrompt },
            { role: 'user', content: auditorContext }
          ],
          stream: false,
        }),
      });

      if (!response.ok) throw new Error('Auditor Agent fejlede under verificeringen.');
      const aiData = await response.json();
      
      try {
        const report = extractJSON(aiData.message.content);
        if (report) {
          setSecurityReport(report);
          setSecurityLogs(prev => [...prev, "[SUCCESS] Audit report verified and generated by Auditor."]);
        } else {
          throw new Error("Kunne ikke udtrække JSON fra Auditor output.");
        }
      } catch (parseErr) {
        // Fallback if AI doesn't return perfect JSON
        setSecurityReport({
          safetyScore: 75,
          vulnerabilities: ["Kunne ikke parse specifikke sårbarheder automatisk."],
          actionPlan: aiData.message.content
        });
        setSecurityLogs(prev => [...prev, "[WARNING] Auditor output was not in perfect JSON format. Showing raw analysis."]);
      }

    } catch (err: any) {
      setError(err.message);
      setSecurityLogs(prev => [...prev, `[ERROR] ${err.message}`]);
    } finally {
      setIsScanningSecurity(false);
    }
  };

  const handleGenerateSeo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seoUrl.trim() || !seoSelectedModel || !apiKey || isGeneratingSeo) return;

    setIsGeneratingSeo(true);
    setError(null);

    try {
      // 1. Analyze page content
      const analyzeResponse = await fetch(`/api/seo/analyze?url=${encodeURIComponent(seoUrl)}`);
      if (!analyzeResponse.ok) throw new Error('Kunne ikke analysere URL. Tjek om URL\'en er korrekt.');
      const pageData = await analyzeResponse.json();

      // 2. Generate Growth Plan with Ollama
      const systemPrompt = `Du er en ekspert i SEO og digital markedsføring. 
      Din opgave er at analysere en sides indhold og generere en vækstplan.
      Tone of voice: Professionel, sælgende og data-drevet.
      
      Returnér resultatet som JSON med følgende struktur:
      {
        "seoHealth": {
          "title": "string",
          "description": "string",
          "h1": ["string"],
          "h2": ["string"],
          "h3": ["string"],
          "status": "good" | "warning" | "critical"
        },
        "adCopy": {
          "headline": "string",
          "description": "string",
          "displayUrl": "string"
        },
        "keywordStrategy": [
          { "keyword": "string", "volume": "string", "difficulty": "string", "intent": "string" }
        ]
      }`;

      const userPrompt = `Analysér denne side:
      URL: ${pageData.url}
      Titel: ${pageData.title}
      Beskrivelse: ${pageData.description}
      H1: ${pageData.h1.join(', ')}
      H2: ${pageData.h2.join(', ')}
      H3: ${pageData.h3.join(', ')}
      
      ${seoKeywords.trim() 
        ? `BRUGER-DEFINEREDE SØGEORD: ${seoKeywords} (Prioritér disse i din strategi)` 
        : `SØGEORD: Ingen angivet. Du SKAL selv udlede de mest relevante og værdifulde søgeord baseret på sidens indhold (Titel, Beskrivelse og Overskrifter).`}
      
      Platform: ${seoPlatform}`;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: seoSelectedModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          stream: false,
        }),
      });

      if (!response.ok) throw new Error('AI generering fejlede.');
      const aiData = await response.json();
      const results = extractJSON(aiData.message.content);
      
      if (results) {
        setSeoResults(results);
      } else {
        throw new Error("Kunne ikke parse AI output til JSON.");
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGeneratingSeo(false);
    }
  };

  const handleGenerateApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appDescription.trim() || !appSelectedModel || !apiKey || isGeneratingApp) return;

    setIsGeneratingApp(true);
    setError(null);

    const isIterative = appCode !== DEFAULT_APP_CODE;
    
    const architecturePrompts = {
      saas: "Du er en ekspert i SaaS-arkitektur og dashboard-design. Skab et professionelt administrationspanel med data-overvågning, grafer (brug SVG eller CSS) og sidebar-navigation.",
      cms: "Du er en ekspert i Content Management Systemer (CMS). Skab et system til indholdsstyring med database-lignende input-felter, lister og redigeringsmuligheder.",
      business: "Du er en ekspert i forretningslogik og workflow-automatisering. Skab en web-app fokuseret på komplekse beregninger, formularer og proces-styring.",
      interactive: "Du er en ekspert i interaktive UI-komponenter og system-arkitektur. Skab en interaktiv oplevelse (f.eks. en avanceret widget eller et interaktivt modul) ved hjælp af Canvas eller Three.js."
    };

    const systemPrompt = `${architecturePrompts[appArchitecture]} 
    Din opgave er at skabe en komplet, funktionel applikation i en enkelt HTML-fil baseret på brugerens beskrivelse.

    ${isIterative ? `Rediger denne eksisterende kode: \n\`\`\`html\n${appCode}\n\`\`\`
    
    VIGTIGT: Ved opdateringer skal du BEVARE det eksisterende design og struktur. Du skal KUN implementere de specifikke ændringer eller tilføjelser, der anmodes om.` : 'Opret en ny applikation'} 

    TEKNISKE RETNINGSLINJER:
    1. Alt skal være i én enkelt HTML-fil (HTML, CSS og JS).
    2. Brug moderne Tailwind CSS (via CDN: <script src="https://cdn.tailwindcss.com"></script>) for hurtig og flot styling.
    3. Implementér responsivt design, der fungerer på både desktop og mobil.
    4. Hvis interaktivitet er påkrævet (f.eks. i 'interactive' mode), brug HTML5 Canvas eller Three.js.
    5. Skriv klare kommentarer, der forklarer logikken.
    6. Brug Lucide Icons (via CDN: <script src="https://unpkg.com/lucide@latest"></script>) til ikoner.

    REGLER:
    - Returnér KUN den komplette HTML-kode.
    - Ingen forklaringer før eller efter koden.
    - Start direkte med <!DOCTYPE html>.
    
    App-beskrivelse: "${appDescription}"`;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: appSelectedModel,
          messages: [{ role: 'user', content: systemPrompt }],
          stream: true,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Kunne ikke hente svar fra Ollama');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Ingen reader tilgængelig');

      const decoder = new TextDecoder();
      let accumulatedContent = '';
      setAppCode('');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.message?.content) {
                accumulatedContent += data.message.content;
                
                // Clean markdown if present
                let cleanedCode = accumulatedContent;
                if (cleanedCode.includes('```html')) {
                  cleanedCode = cleanedCode.split('```html')[1].split('```')[0];
                } else if (cleanedCode.includes('```')) {
                  cleanedCode = cleanedCode.split('```')[1].split('```')[0];
                }
                
                setAppCode(cleanedCode.trim());
              }
            } catch (e) {
              // Ignore parse errors for partial chunks
            }
          }
        }
      }
    } catch (err: any) {
      setError(`Fejl ved generering af app: ${err.message}`);
    } finally {
      setIsGeneratingApp(false);
    }
  };

  const [isWebMaximized, setIsWebMaximized] = useState(false);

  const agentRefs = useRef<(HTMLDivElement | null)[]>([]);
  const agentScrollRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Auto-focus active agent
  useEffect(() => {
    if (currentActiveAgent !== null && agentRefs.current[currentActiveAgent]) {
      agentRefs.current[currentActiveAgent]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setIsAutoScrollEnabled(true); // Reset auto-scroll when agent changes
    }
  }, [currentActiveAgent]);

  // Auto-scroll active agent content
  useEffect(() => {
    if (currentActiveAgent !== null && isAutoScrollEnabled && agentScrollRefs.current[currentActiveAgent]) {
      const el = agentScrollRefs.current[currentActiveAgent];
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    }
  }, [multiAgentResults, currentActiveAgent, isAutoScrollEnabled]);

  const handleAgentScroll = (e: React.UIEvent<HTMLDivElement>, index: number) => {
    if (index !== currentActiveAgent) return;
    
    const el = e.currentTarget;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
    
    if (!isAtBottom && isAutoScrollEnabled) {
      setIsAutoScrollEnabled(false);
    } else if (isAtBottom && !isAutoScrollEnabled) {
      setIsAutoScrollEnabled(true);
    }
  };

  const resetWebProject = () => {
    setWebCode(DEFAULT_WEB_CODE);
    setWebDescription('');
    setError(null);
    setWebViewMode('preview');
  };

  const resetAppProject = () => {
    setAppCode(DEFAULT_APP_CODE);
    setAppDescription('');
    setError(null);
    setAppViewMode('preview');
  };

  const resetMultiAgent = () => {
    setMultiAgentResults([]);
    setMultiAgentTask('');
    setError(null);
    setMultiAgentViewMode('code');
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(webCode);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <div className="h-screen bg-nordic-bg text-nordic-text font-sans flex flex-col selection:bg-nordic-primary/30 overflow-hidden">
      <header className="border-b border-nordic-border bg-nordic-card/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto p-4 flex flex-col gap-4">
          {/* Top Row: Logo & Status */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 group">
              <div className="flex flex-col">
                <h1 className="font-serif text-3xl md:text-4xl font-black tracking-tight leading-none text-nordic-primary flex items-baseline gap-2">
                  Nodework
                  <span className="text-[11px] font-sans font-bold text-nordic-text/30 tracking-widest uppercase align-baseline">v1.8</span>
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-4">
            </div>
          </div>

        {/* Bottom Row: Tabs & Controls */}
        <div className="flex flex-col gap-3">
          {/* Tab Switcher - Scrollable on mobile */}
          <nav className="flex w-full overflow-x-auto no-scrollbar bg-nordic-secondary/30 p-1 rounded-xl border border-nordic-border backdrop-blur-sm">
            <div className="flex min-w-max gap-1">
              <button
                onClick={() => setActiveTab('chat')}
                className={cn(
                  "flex items-center gap-2 px-2.5 md:px-5 py-2 rounded-xl text-[9px] md:text-[11px] font-black uppercase tracking-widest transition-all duration-300",
                  activeTab === 'chat' 
                    ? "bg-nordic-primary text-white shadow-lg shadow-nordic-primary/20" 
                    : "text-nordic-text/50 hover:text-nordic-primary hover:bg-nordic-secondary/50"
                )}
              >
                <Bot className="w-3 h-3 md:w-4 md:h-4" strokeWidth={1.5} />
                AI Chat
              </button>
              <button
                onClick={() => setActiveTab('multiagent')}
                className={cn(
                  "flex items-center gap-2 px-2.5 md:px-5 py-2 rounded-xl text-[9px] md:text-[11px] font-black uppercase tracking-widest transition-all duration-300",
                  activeTab === 'multiagent' 
                    ? "bg-nordic-primary text-white shadow-lg shadow-nordic-primary/20" 
                    : "text-nordic-text/50 hover:text-nordic-primary hover:bg-nordic-secondary/50"
                )}
              >
                <Users className="w-3 h-3 md:w-4 md:h-4" strokeWidth={1.5} />
                Multiagent
              </button>
              <button
                onClick={() => setActiveTab('web')}
                className={cn(
                  "flex items-center gap-2 px-2.5 md:px-5 py-2 rounded-xl text-[9px] md:text-[11px] font-black uppercase tracking-widest transition-all duration-300",
                  activeTab === 'web' 
                    ? "bg-nordic-primary text-white shadow-lg shadow-nordic-primary/20" 
                    : "text-nordic-text/50 hover:text-nordic-primary hover:bg-nordic-secondary/50"
                )}
              >
                <Globe className="w-3 h-3 md:w-4 md:h-4" strokeWidth={1.5} />
                Webdesigner
              </button>
              <button
                onClick={() => setActiveTab('leadsniper')}
                className={cn(
                  "flex items-center gap-2 px-2.5 md:px-5 py-2 rounded-xl text-[9px] md:text-[11px] font-black uppercase tracking-widest transition-all duration-300",
                  activeTab === 'leadsniper' 
                    ? "bg-nordic-primary text-white shadow-lg shadow-nordic-primary/20" 
                    : "text-nordic-text/50 hover:text-nordic-primary hover:bg-nordic-secondary/50"
                )}
              >
                <Target className="w-3 h-3 md:w-4 md:h-4" strokeWidth={1.5} />
                Leadsniper
              </button>
              <button
                onClick={() => setActiveTab('social')}
                className={cn(
                  "flex items-center gap-2 px-2.5 md:px-5 py-2 rounded-xl text-[9px] md:text-[11px] font-black uppercase tracking-widest transition-all duration-300",
                  activeTab === 'social' 
                    ? "bg-nordic-primary text-white shadow-lg shadow-nordic-primary/20" 
                    : "text-nordic-text/50 hover:text-nordic-primary hover:bg-nordic-secondary/50"
                )}
              >
                <Sparkles className="w-3 h-3 md:w-4 md:h-4" strokeWidth={1.5} />
                Social Media
              </button>
              <button
                onClick={() => setActiveTab('appmaker')}
                className={cn(
                  "flex items-center gap-2 px-2.5 md:px-5 py-2 rounded-xl text-[9px] md:text-[11px] font-black uppercase tracking-widest transition-all duration-300",
                  activeTab === 'appmaker' 
                    ? "bg-nordic-primary text-white shadow-lg shadow-nordic-primary/20" 
                    : "text-nordic-text/50 hover:text-nordic-primary hover:bg-nordic-secondary/50"
                )}
              >
                <Layout className="w-3 h-3 md:w-4 md:h-4" strokeWidth={1.5} />
                App Maker
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={cn(
                  "flex items-center gap-2 px-2.5 md:px-5 py-2 rounded-xl text-[9px] md:text-[11px] font-black uppercase tracking-widest transition-all duration-300",
                  activeTab === 'security' 
                    ? "bg-nordic-primary text-white shadow-lg shadow-nordic-primary/20" 
                    : "text-nordic-text/50 hover:text-nordic-primary hover:bg-nordic-secondary/50"
                )}
              >
                <Shield className="w-3 h-3 md:w-4 md:h-4" strokeWidth={1.5} />
                Security Guard
              </button>
              <button
                onClick={() => setActiveTab('seo')}
                className={cn(
                  "flex items-center gap-2 px-2.5 md:px-5 py-2 rounded-xl text-[9px] md:text-[11px] font-black uppercase tracking-widest transition-all duration-300",
                  activeTab === 'seo' 
                    ? "bg-nordic-primary text-white shadow-lg shadow-nordic-primary/20" 
                    : "text-nordic-text/50 hover:text-nordic-primary hover:bg-nordic-secondary/50"
                )}
              >
                <Search className="w-3 h-3 md:w-4 md:h-4" strokeWidth={1.5} />
                SEO & Ads
              </button>
            </div>
          </nav>

          <div className="flex flex-wrap gap-2 w-full items-center justify-start pb-1">
            {activeTab === 'chat' && (
              <>
                {/* API Key Input */}
                <div className="relative flex-1 min-w-[180px] md:max-w-xs">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-nordic-primary/50" strokeWidth={1.5} />
                  <input
                    type="password"
                    placeholder="Ollama API Nøgle"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-nordic-card border border-nordic-border rounded-xl focus:outline-none focus:ring-1 focus:ring-nordic-primary/50 focus:border-nordic-primary/50 text-xs font-mono text-nordic-text transition-all"
                  />
                </div>

                {/* Model Selector */}
                <div className="relative flex-1 min-w-[140px] md:max-w-[180px]">
                  <Settings className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-nordic-primary/50" strokeWidth={1.5} />
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    disabled={isFetchingModels || models.length === 0}
                    className="w-full pl-9 pr-8 py-1.5 bg-nordic-card border border-nordic-border rounded-xl focus:outline-none focus:ring-1 focus:ring-nordic-primary/50 focus:border-nordic-primary/50 text-xs appearance-none disabled:opacity-50 text-nordic-text transition-all cursor-pointer"
                  >
                    {models.length === 0 ? (
                      <option>Ingen modeller fundet</option>
                    ) : (
                      models.map((m, idx) => (
                        <option key={`chat-${m.name}-${idx}`} value={m.name}>
                          {m.name}
                        </option>
                      ))
                    )}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none text-nordic-text/40" />
                </div>

                {/* Streaming Toggle */}
                <div className="flex items-center gap-2 px-2.5 py-1.5 bg-nordic-card border border-nordic-border rounded-xl">
                  <span className="text-[9px] font-mono uppercase text-nordic-text/40 tracking-wider">Stream</span>
                  <button
                    onClick={() => setStreamEnabled(!streamEnabled)}
                    className={cn(
                      "relative inline-flex h-4 w-8 items-center rounded-full transition-colors focus:outline-none",
                      streamEnabled ? "bg-nordic-primary" : "bg-nordic-text/30"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform",
                        streamEnabled ? "translate-x-4.5" : "translate-x-1"
                      )}
                    />
                  </button>
                </div>

                <button
                  onClick={fetchModels}
                  disabled={isFetchingModels || !apiKey}
                  className="p-1.5 bg-nordic-card border border-nordic-border rounded-lg hover:border-nordic-primary/50 hover:text-nordic-primary transition-all disabled:opacity-50"
                  title="Opdater modeller"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", isFetchingModels && "animate-spin")} />
                </button>

                <button
                  onClick={clearChat}
                  className="p-1.5 bg-nordic-card border border-nordic-border rounded-lg hover:border-red-500/50 hover:text-red-500 transition-all"
                  title="Ryd chat"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            {activeTab === 'web' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setWebViewMode('preview')}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border",
                    webViewMode === 'preview' ? "bg-nordic-primary/10 border-nordic-primary/50 text-nordic-primary" : "border-nordic-border text-nordic-text/50 hover:text-nordic-text"
                  )}
                >
                  <Eye className="w-3 h-3" />
                  Forhåndsvisning
                </button>
                <button
                  onClick={() => setWebViewMode('code')}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border",
                    webViewMode === 'code' ? "bg-nordic-primary/10 border-nordic-primary/50 text-nordic-primary" : "border-nordic-border text-nordic-text/50 hover:text-nordic-text"
                  )}
                >
                  <Code className="w-3 h-3" />
                  Kode
                </button>
                <div className="w-px h-5 bg-nordic-border mx-1" />
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border border-nordic-border text-nordic-text/50 hover:text-nordic-primary hover:border-nordic-primary/30"
                >
                  {copySuccess ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                  {copySuccess ? 'Kopieret' : 'Kopier HTML'}
                </button>
                <button
                  onClick={() => setIsWebMaximized(!isWebMaximized)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border border-nordic-border text-nordic-text/50 hover:text-nordic-primary hover:border-nordic-primary/30",
                    isWebMaximized && "bg-nordic-primary/10 border-nordic-primary/50 text-nordic-primary"
                  )}
                  title={isWebMaximized ? "Minimer" : "Maksimer"}
                >
                  <Maximize2 className="w-3 h-3" />
                  <span className="hidden sm:inline">{isWebMaximized ? 'Minimer' : 'Fuld skærm'}</span>
                </button>
              </div>
            )}

            {activeTab === 'multiagent' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMultiAgentViewMode('preview')}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border",
                    multiAgentViewMode === 'preview' ? "bg-nordic-primary/10 border-nordic-primary/50 text-nordic-primary" : "border-nordic-border text-nordic-text/50 hover:text-nordic-text"
                  )}
                >
                  <Eye className="w-3 h-3" />
                  Preview
                </button>
                <button
                  onClick={() => setMultiAgentViewMode('code')}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border",
                    multiAgentViewMode === 'code' ? "bg-nordic-primary/10 border-nordic-primary/50 text-nordic-primary" : "border-nordic-border text-nordic-text/50 hover:text-nordic-text"
                  )}
                >
                  <Code className="w-3 h-3" />
                  Chat/Kode
                </button>
              </div>
            )}

            {activeTab === 'appmaker' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAppViewMode('preview')}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border",
                    appViewMode === 'preview' ? "bg-nordic-primary/10 border-nordic-primary/50 text-nordic-primary" : "border-nordic-border text-nordic-text/50 hover:text-nordic-text"
                  )}
                >
                  <Eye className="w-3 h-3" />
                  Preview
                </button>
                <button
                  onClick={() => setAppViewMode('code')}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border",
                    appViewMode === 'code' ? "bg-nordic-primary/10 border-nordic-primary/50 text-nordic-primary" : "border-nordic-border text-nordic-text/50 hover:text-nordic-text"
                  )}
                >
                  <Code className="w-3 h-3" />
                  Kode
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(appCode);
                    setCopySuccess(true);
                    setTimeout(() => setCopySuccess(false), 2000);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border border-nordic-border text-nordic-text/50 hover:text-nordic-primary"
                >
                  {copySuccess ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                  Kopiér
                </button>
              </div>
            )}
          </div>
        </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden flex flex-col max-w-7xl mx-auto w-full relative">
        {activeTab === 'chat' ? (
          <div className="flex-1 overflow-hidden flex flex-col w-full max-w-5xl mx-auto">
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-8 scroll-smooth scrollbar-thin scrollbar-thumb-nordic-primary/20 scrollbar-track-transparent"
            >
              {messages.length === 0 && !error && (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-nordic-primary blur-3xl opacity-10 animate-pulse" />
                    <Bot className="w-20 h-20 text-nordic-primary/20 relative" />
                  </div>
                  <div className="space-y-2">
                    <p className="font-sans italic text-2xl text-nordic-text/50">Afventer din kommando</p>
                    <p className="text-xs font-mono text-nordic-text/40 tracking-widest uppercase">Nodework Interface • Kryptering aktiv</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-mono rounded-lg">
                  <span className="font-bold mr-2">[SYSTEM ERROR]:</span> {error}
                </div>
              )}

              {messages.map((msg, idx) => (
                <div 
                  key={`msg-${idx}-${msg.role}`}
                  className={cn(
                    "flex gap-5 p-6 rounded-2xl transition-all group",
                    msg.role === 'user' 
                      ? "bg-nordic-card border border-nordic-border shadow-sm" 
                      : "bg-nordic-secondary/30 border border-nordic-primary/10"
                  )}
                >
                  <div className="flex-shrink-0 mt-1">
                    {msg.role === 'user' ? (
                      <div className="w-10 h-10 bg-nordic-secondary border border-nordic-border rounded-xl flex items-center justify-center text-nordic-text/60 group-hover:text-nordic-primary transition-colors">
                        <User className="w-6 h-6" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-nordic-primary/10 border border-nordic-primary/20 rounded-xl flex items-center justify-center text-nordic-primary">
                        <Bot className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-mono uppercase text-nordic-text/40 mb-2 tracking-[0.2em] font-bold">
                      {msg.role === 'user' ? 'Operatør' : 'AI Kerne'}
                    </div>
                    <div className={cn(
                      "text-[15px] leading-relaxed prose prose-slate max-w-none",
                      "prose-pre:bg-nordic-card prose-pre:border prose-pre:border-nordic-border prose-code:text-nordic-primary"
                    )}>
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>

                    {msg.role === 'assistant' && (
                      <div className="mt-4 flex flex-wrap gap-2 pt-4 border-t border-nordic-border">
                        <button
                          onClick={() => forwardTo(msg.content, 'web')}
                          className="flex items-center gap-2 px-3 py-1.5 bg-nordic-primary/10 border border-nordic-primary/20 rounded-lg text-[10px] font-bold uppercase tracking-wider text-nordic-primary hover:bg-nordic-primary hover:text-white transition-all"
                        >
                          <Globe className="w-3 h-3" />
                          Send til Web
                        </button>
                        <button
                          onClick={() => forwardTo(msg.content, 'social')}
                          className="flex items-center gap-2 px-3 py-1.5 bg-nordic-primary/10 border border-nordic-primary/20 rounded-lg text-[10px] font-bold uppercase tracking-wider text-nordic-primary hover:bg-nordic-primary hover:text-white transition-all"
                        >
                          <Smartphone className="w-3 h-3" />
                          Send til Social
                        </button>
                        <button
                          onClick={() => forwardTo(msg.content, 'appmaker')}
                          className="flex items-center gap-2 px-3 py-1.5 bg-nordic-primary/10 border border-nordic-primary/20 rounded-lg text-[10px] font-bold uppercase tracking-wider text-nordic-primary hover:bg-nordic-primary hover:text-white transition-all"
                        >
                          <Layout className="w-3 h-3" />
                          Send til App Maker
                        </button>
                        <button
                          onClick={() => forwardTo(msg.content, 'multiagent')}
                          className="flex items-center gap-2 px-3 py-1.5 bg-nordic-primary/10 border border-nordic-primary/20 rounded-lg text-[10px] font-bold uppercase tracking-wider text-nordic-primary hover:bg-nordic-primary hover:text-white transition-all"
                        >
                          <Rocket className="w-3 h-3" />
                          Send til Multi-Agent
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex gap-5 p-6 bg-nordic-primary/[0.02] border border-nordic-primary/5 rounded-2xl animate-pulse">
                  <div className="w-10 h-10 bg-nordic-primary/5 border border-nordic-primary/10 rounded-xl flex items-center justify-center text-nordic-primary/50">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                  <div className="flex-1 space-y-3 py-1">
                    <div className="h-2 bg-nordic-primary/10 rounded w-1/4"></div>
                    <div className="h-2 bg-nordic-primary/10 rounded w-3/4"></div>
                    <div className="h-2 bg-nordic-primary/10 rounded w-1/2"></div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-6 border-t border-nordic-border bg-nordic-bg/80 backdrop-blur-xl">
              <form onSubmit={handleSubmit} className="flex gap-3 max-w-4xl mx-auto w-full">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={apiKey ? "Overfør data..." : "Afventer autorisationsnøgle"}
                    disabled={!apiKey || isLoading}
                    className="w-full px-5 py-4 bg-nordic-card border border-nordic-border rounded-xl focus:outline-none focus:ring-1 focus:ring-nordic-primary/50 focus:border-nordic-primary/50 text-sm text-nordic-text placeholder:text-nordic-text/30 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!input.trim() || !apiKey || isLoading || !selectedModel}
                  className="px-8 py-4 bg-nordic-primary text-white font-black uppercase tracking-widest text-xs rounded-xl hover:bg-nordic-primary/90 active:scale-95 transition-all disabled:opacity-20 disabled:grayscale flex items-center gap-3 shadow-lg shadow-nordic-primary/20"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> : <Send className="w-4 h-4" strokeWidth={1.5} />}
                  <span className="hidden sm:inline">Udfør</span>
                </button>
              </form>
              <div className="mt-4 flex justify-between text-[9px] font-mono text-nordic-text/40 uppercase tracking-[0.3em] max-w-4xl mx-auto w-full">
                <span className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-nordic-primary" />
                  Kerne: {selectedModel || 'Standby'}
                </span>
                <span>Nodework Protocol v1.8</span>
              </div>
            </div>
          </div>
        ) : activeTab === 'web' ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Web Builder Interface */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
              {/* Left Side: Input & Controls */}
              <div className={cn(
                "w-full lg:w-96 lg:h-full border-r border-nordic-border bg-nordic-bg flex flex-col p-6 space-y-6 shrink-0 transition-all duration-500",
                isWebMaximized && "lg:w-0 lg:p-0 lg:opacity-0 lg:overflow-hidden lg:border-none"
              )}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-nordic-primary">
                      <Sparkles className="w-5 h-5" />
                      <h2 className="font-sans text-xl font-bold">Webdesigner</h2>
                    </div>
                    <button
                      onClick={resetWebProject}
                      className="p-1.5 bg-nordic-secondary border border-nordic-border rounded-xl hover:bg-nordic-primary/10 hover:border-nordic-primary/50 hover:text-nordic-primary transition-all"
                      title="Nyt Projekt"
                    >
                      <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                  <p className="text-xs text-nordic-text/50 leading-relaxed">
                    Beskriv din vision. AI'en vil undersøge moderne designs og smede en komplet HTML/CSS-grænseflade.
                  </p>
                </div>

                {/* Web Model Selector */}
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase text-nordic-text/40 block tracking-widest">
                    Vælg Design-Kerne
                  </label>
                  <div className="relative">
                    <Settings className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nordic-primary/50" strokeWidth={1.5} />
                    <select
                      value={webSelectedModel}
                      onChange={(e) => setWebSelectedModel(e.target.value)}
                      disabled={isFetchingModels || models.length === 0}
                      className="w-full pl-9 pr-8 py-2.5 bg-nordic-card border border-nordic-border rounded-xl focus:outline-none focus:ring-1 focus:ring-nordic-primary/50 focus:border-nordic-primary/50 text-xs appearance-none disabled:opacity-50 text-nordic-text transition-all cursor-pointer"
                    >
                      {models.length === 0 ? (
                        <option>Ingen modeller fundet</option>
                      ) : (
                        models.map((m, idx) => (
                          <option key={`web-${m.name}-${idx}`} value={m.name}>
                            {m.name}
                          </option>
                        ))
                      )}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-nordic-text/40" />
                  </div>
                </div>

                <form onSubmit={handleGenerateWeb} className="flex flex-col gap-4">
                  <div>
                    <label className="text-[10px] font-mono uppercase text-nordic-text/40 mb-2 block tracking-widest">
                      {webCode === DEFAULT_WEB_CODE ? 'Beskrivelse af hjemmeside' : 'Tilføj eller rediger'}
                    </label>
                    <textarea
                      value={webDescription}
                      onChange={(e) => setWebDescription(e.target.value)}
                      placeholder={webCode === DEFAULT_WEB_CODE 
                        ? "f.eks. En landingsside for et luksusrejsebureau..." 
                        : "f.eks. Tilføj en kontaktsektion med et kort..."}
                      className="w-full h-40 p-4 bg-nordic-card border border-nordic-border rounded-xl focus:outline-none focus:ring-1 focus:ring-nordic-primary/50 focus:border-nordic-primary/50 text-sm text-nordic-text placeholder:text-nordic-text/30 resize-none transition-all"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={!webDescription.trim() || isGeneratingWeb}
                      className="w-full py-3 bg-nordic-primary text-white font-black uppercase tracking-widest text-xs rounded-xl hover:bg-nordic-primary/90 active:scale-95 transition-all disabled:opacity-20 disabled:grayscale flex items-center justify-center gap-3 shadow-lg shadow-nordic-primary/20"
                    >
                      {isGeneratingWeb ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layout className="w-4 h-4" />}
                      {isGeneratingWeb ? 'Smeder...' : webCode === DEFAULT_WEB_CODE ? 'Smed hjemmeside' : 'Opdater smedning'}
                    </button>
                  </div>
                </form>

                {/* Web Suggestion Buttons */}
                <div className="space-y-3">
                  <label className="text-[10px] font-mono uppercase text-nordic-text/40 block tracking-widest">
                    Hurtige kommandoer
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Tilføj kontaktformular",
                      "Gør farverne lysere",
                      "Tilføj prisoversigt",
                      "Lav en mørk tilstand",
                      "Tilføj animationer",
                      "Gør siden mere moderne",
                      "Tilføj en 'Om os' sektion",
                      "Lav en responsiv menu",
                      "Tilføj et billedgalleri",
                      "Gør skrifttypen større",
                      "Tilføj sociale medier ikoner",
                      "Lav en 'FAQ' sektion",
                      "Tilføj testimonials",
                      "Gør knapperne runde",
                      "Lav en 'Team' sektion",
                      "Tilføj nyhedsbrev",
                      "Gør layoutet luftigt",
                      "Tilføj en 'Services' sektion",
                      "Lås billeder (faste)"
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => setWebDescription(suggestion)}
                        className="px-2.5 py-1.5 bg-nordic-secondary/50 border border-nordic-border rounded-lg text-[9px] font-bold uppercase tracking-wider text-nordic-text/60 hover:text-nordic-primary hover:border-nordic-primary/30 transition-all"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="w-px h-full bg-nordic-border hidden lg:block" />

                <div className="space-y-4 flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-nordic-primary/10">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-mono uppercase text-nordic-text/40 tracking-widest font-bold">Gemte projekter</h3>
                    <button 
                      onClick={saveProject}
                      className="text-[10px] font-bold uppercase text-nordic-primary hover:text-nordic-primary/80 transition-colors"
                    >
                      Gem nuværende
                    </button>
                  </div>
                  
                  {savedProjects.length === 0 ? (
                    <p className="text-[10px] text-nordic-text/40 italic">Ingen gemte projekter endnu.</p>
                  ) : (
                    <div className="space-y-2">
                      {savedProjects.map((project, idx) => (
                        <div key={idx} className="p-3 bg-nordic-card border border-nordic-border rounded-lg group relative shadow-sm">
                          <div className="pr-8">
                            <p className="text-xs font-bold text-nordic-text truncate">{project.name}</p>
                            <p className="text-[9px] text-nordic-text/40 font-mono mt-1">{project.date}</p>
                          </div>
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => loadProject(project)}
                              className="p-1.5 hover:text-nordic-primary transition-colors"
                              title="Indlæs"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => deleteProject(idx)}
                              className="p-1.5 hover:text-red-500 transition-colors"
                              title="Slet"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-mono rounded-lg">
                    {error}
                  </div>
                )}
              </div>

              {/* Right Side: Preview/Code */}
              <div className="flex-1 bg-nordic-bg relative flex flex-col min-h-[500px] lg:min-h-0">
                {webViewMode === 'preview' ? (
                  <div className="flex-1 w-full h-full bg-white lg:rounded-tl-2xl overflow-hidden">
                    <iframe
                      title="Web Forhåndsvisning"
                      srcDoc={(() => {
                        const safetyScript = `
                          <script>
                            (function() {
                              // 1. Total isolation: Intercept ALL clicks on links
                              document.addEventListener('click', function(e) {
                                const link = e.target.closest('a');
                                if (link) {
                                  // ALWAYS prevent default to stop browser navigation
                                  e.preventDefault();
                                  e.stopPropagation();

                                  const href = link.getAttribute('href');
                                  
                                  // Handle internal hash navigation manually
                                  if (href && href.startsWith('#') && href.length > 1) {
                                    const targetId = href.substring(1);
                                    const targetElement = document.getElementById(targetId);
                                    if (targetElement) {
                                      targetElement.scrollIntoView({ behavior: 'smooth' });
                                    }
                                  } else if (href === '#') {
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                  }
                                  
                                  console.log('Navigation blokeret og håndteret internt:', href);
                                  return false;
                                }
                              }, true);

                              // 2. Neutralize all existing links and forms to be safe
                              function neutralize() {
                                document.querySelectorAll('a').forEach(a => {
                                  a.setAttribute('target', '_self');
                                });
                                
                                document.querySelectorAll('form').forEach(form => {
                                  form.setAttribute('target', '_self');
                                  form.addEventListener('submit', e => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }, true);
                                });
                              }

                              // 3. Watch for dynamic changes
                              const observer = new MutationObserver(neutralize);
                              observer.observe(document.documentElement, { childList: true, subtree: true });
                              neutralize();

                              // 4. Block window.open and other navigation APIs
                              window.open = () => null;
                              window.onbeforeunload = () => null;
                              
                              // 5. Disable history API to prevent parent URL changes
                              const noop = () => {};
                              window.history.pushState = noop;
                              window.history.replaceState = noop;
                            })();
                          </script>
                        `;

                        // Inject safety script, base tag and CSP
                        let finalHtml = webCode;
                        
                        // Ensure we have a head
                        if (!finalHtml.includes('<head>')) {
                          if (finalHtml.includes('<html')) {
                            finalHtml = finalHtml.replace(/<html[^>]*>/, '$&<head></head>');
                          } else {
                            finalHtml = '<head></head>' + finalHtml;
                          }
                        }
                        
                        // CSP to block all navigation and base tag
                        const cspMeta = '<meta http-equiv="Content-Security-Policy" content="default-src * \'unsafe-inline\' \'unsafe-eval\'; frame-src \'none\'; object-src \'none\';">';
                        const baseTag = '<base target="_self">';
                        
                        finalHtml = finalHtml.replace('<head>', '<head>' + cspMeta + baseTag);
                        
                        // Inject safety script
                        if (finalHtml.includes('</body>')) {
                          finalHtml = finalHtml.replace('</body>', safetyScript + '</body>');
                        } else {
                          finalHtml += safetyScript;
                        }
                        
                        return finalHtml;
                      })()}
                      className="w-full h-full border-none bg-white"
                      sandbox="allow-scripts"
                    />
                  </div>
                ) : (
                  <div className="flex-1 p-6 font-mono text-sm overflow-auto scrollbar-thin">
                    <pre className="text-nordic-primary/80 leading-relaxed">
                      <code>{webCode}</code>
                    </pre>
                  </div>
                )}
                
                {isGeneratingWeb && (
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 bg-nordic-primary blur-3xl opacity-20 animate-pulse" />
                      <Loader2 className="w-16 h-16 text-nordic-primary animate-spin relative" />
                    </div>
                    <p className="font-sans text-2xl text-nordic-text animate-pulse">Smeder digital arkitektur...</p>
                    <p className="text-[10px] font-mono text-nordic-text/40 mt-4 uppercase tracking-[0.4em]">Undersøger trends • Syntetiserer kode</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'social' ? (
          <div className="flex-1 flex flex-col overflow-hidden bg-nordic-bg">
            {/* Social Media Content Manager Interface */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
              {/* Left Side: Input & Controls */}
              <div className="w-full lg:w-96 lg:h-full border-r border-nordic-border bg-nordic-bg flex flex-col p-6 space-y-6 shrink-0 shadow-sm">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-nordic-primary">
                    <Sparkles className="w-5 h-5" />
                    <h2 className="font-sans text-xl font-bold text-nordic-text">Content Manager</h2>
                  </div>
                  <p className="text-xs text-nordic-text/50 leading-relaxed">
                    Din kreative partner til sociale medier. Beskriv dit emne, og lad AI'en smede virale scripts og opslag.
                  </p>
                </div>

                {/* Platform Selector */}
                <div className="space-y-2">
                  <label className="text-[10px] font-sans uppercase text-nordic-text/40 block tracking-widest font-bold">
                    Vælg Platform
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['tiktok', 'facebook', 'instagram', 'linkedin', 'youtube'] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setSocialPlatform(p)}
                        className={cn(
                          "py-2 rounded-lg text-[9px] font-bold uppercase tracking-wider border transition-all",
                          socialPlatform === p 
                            ? "bg-nordic-primary border-nordic-primary text-white shadow-md" 
                            : "bg-white border-nordic-border text-nordic-text/50 hover:bg-nordic-bg hover:text-nordic-primary"
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Social Model Selector */}
                <div className="space-y-2">
                  <label className="text-[10px] font-sans uppercase text-nordic-text/40 block tracking-widest font-bold">
                    Vælg Kreativ Kerne
                  </label>
                  <div className="relative">
                    <Settings className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nordic-primary/50" />
                    <select
                      value={socialSelectedModel}
                      onChange={(e) => setSocialSelectedModel(e.target.value)}
                      disabled={isFetchingModels || models.length === 0}
                      className="w-full pl-9 pr-8 py-2.5 bg-white border border-nordic-border rounded-lg focus:outline-none focus:ring-1 focus:ring-nordic-primary/50 focus:border-nordic-primary/50 text-xs appearance-none disabled:opacity-50 text-nordic-text transition-all cursor-pointer"
                    >
                      {models.length === 0 ? (
                        <option>Ingen modeller fundet</option>
                      ) : (
                        models.map((m, idx) => (
                          <option key={`social-${m.name}-${idx}`} value={m.name}>
                            {m.name}
                          </option>
                        ))
                      )}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-nordic-text/40" />
                  </div>
                </div>

                <form onSubmit={handleGenerateSocial} className="flex flex-col gap-4">
                  <div>
                    <label className="text-[10px] font-sans uppercase text-nordic-text/40 mb-2 block tracking-widest font-bold">
                      Beskriv dit indhold
                    </label>
                    <textarea
                      value={socialPrompt}
                      onChange={(e) => setSocialPrompt(e.target.value)}
                      placeholder="f.eks. Lav et TikTok script om hvordan man bruger AI til at spare tid i hverdagen..."
                      className="w-full h-40 p-4 bg-white border border-nordic-border rounded-xl focus:outline-none focus:ring-1 focus:ring-nordic-primary/50 focus:border-nordic-primary/50 text-sm text-nordic-text placeholder:text-nordic-text/30 resize-none transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!socialPrompt.trim() || isGeneratingSocial}
                    className="w-full py-3 bg-nordic-primary text-white font-bold uppercase tracking-widest text-xs rounded-xl hover:bg-nordic-primary/90 active:scale-95 transition-all disabled:opacity-20 disabled:grayscale flex items-center justify-center gap-3 shadow-md"
                  >
                    {isGeneratingSocial ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {isGeneratingSocial ? 'Genererer...' : 'Generér Indhold'}
                  </button>
                </form>

                {/* Social Quick Commands */}
                <div className="space-y-3">
                  <label className="text-[10px] font-sans uppercase text-nordic-text/40 block tracking-widest font-bold">
                    Hurtige Skabeloner
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Viral TikTok Hook",
                      "Engagerende FB Opslag",
                      "LinkedIn Tankeleder",
                      "Instagram Caption",
                      "YouTube Intro Script",
                      "Produkt Beskrivelse"
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => setSocialPrompt(suggestion)}
                        className="px-2.5 py-1.5 bg-nordic-bg border border-nordic-border rounded-lg text-[9px] font-bold uppercase tracking-wider text-nordic-text/50 hover:text-nordic-primary hover:border-nordic-primary/30 transition-all"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-[10px] font-sans rounded-lg">
                    {error}
                  </div>
                )}
              </div>

              {/* Right Side: Content Display */}
              <div className="flex-1 bg-nordic-bg relative flex flex-col p-8 overflow-y-auto scrollbar-thin scrollbar-thumb-nordic-primary/20 min-h-[500px] lg:min-h-0">
                {socialContent ? (
                  <div className="max-w-3xl mx-auto w-full bg-white p-8 rounded-2xl shadow-sm border border-nordic-border">
                    <div className="flex items-center justify-between mb-8 border-b border-nordic-border pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-nordic-primary/10 rounded-lg flex items-center justify-center text-nordic-primary">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-bold uppercase tracking-widest text-nordic-text">Genereret Indhold</h3>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(socialContent);
                          setCopySuccess(true);
                          setTimeout(() => setCopySuccess(false), 2000);
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border border-nordic-border text-nordic-text/50 hover:text-nordic-primary hover:bg-nordic-bg"
                      >
                        {copySuccess ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                        {copySuccess ? 'Kopieret' : 'Kopier'}
                      </button>
                    </div>
                    <div className={cn(
                      "text-[16px] leading-relaxed prose prose-zinc max-w-none",
                      "prose-pre:bg-nordic-bg prose-pre:border prose-pre:border-nordic-border prose-code:text-nordic-primary"
                    )}>
                      <ReactMarkdown>{socialContent}</ReactMarkdown>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 opacity-40">
                    <Sparkles className="w-16 h-16 text-nordic-primary/20" />
                    <div className="space-y-2">
                      <p className="font-sans text-xl text-nordic-text/40 font-medium">Klar til at skabe indhold</p>
                      <p className="text-[10px] font-sans text-nordic-text/40 tracking-widest uppercase font-bold">Vælg platform og beskriv din vision til venstre</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'appmaker' ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* App Maker Interface */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
              {/* Left Side: Input & Controls */}
              <div className="w-full lg:w-96 lg:h-full border-r border-nordic-border bg-nordic-bg flex flex-col p-6 space-y-6 shrink-0">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-nordic-primary">
                      <Layout className="w-5 h-5" />
                      <h2 className="font-sans text-xl font-bold">App Maker</h2>
                    </div>
                    <button
                      onClick={resetAppProject}
                      className="p-2 text-nordic-text/40 hover:text-nordic-primary transition-colors"
                      title="Nyt Projekt"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-nordic-text/50 leading-relaxed">
                    Vælg en arkitektur og beskriv din applikation. AI'en vil generere en komplet løsning.
                  </p>
                </div>

                {/* Architecture Selection */}
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase text-nordic-text/40 block tracking-widest">
                    Vælg Arkitektur
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'saas', label: 'SaaS Dashboard', icon: LayoutDashboard },
                      { id: 'cms', label: 'Custom CMS', icon: Database },
                      { id: 'business', label: 'Business Logic', icon: Briefcase },
                      { id: 'interactive', label: 'Interactive', icon: MousePointer2 }
                    ].map((arch) => (
                      <button
                        key={arch.id}
                        onClick={() => setAppArchitecture(arch.id as any)}
                        className={cn(
                          "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all text-center",
                          appArchitecture === arch.id 
                            ? "bg-nordic-primary/10 border-nordic-primary text-nordic-primary shadow-sm" 
                            : "bg-nordic-card border-nordic-border text-nordic-text/50 hover:border-nordic-primary/30"
                        )}
                      >
                        <arch.icon className="w-4 h-4" />
                        <span className="text-[9px] font-bold uppercase tracking-tighter">{arch.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* App Model Selector */}
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase text-nordic-text/40 block tracking-widest">
                    Vælg System Architecture Kerne
                  </label>
                  <div className="relative">
                    <Settings className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nordic-primary/50" />
                    <select
                      value={appSelectedModel}
                      onChange={(e) => setAppSelectedModel(e.target.value)}
                      disabled={isFetchingModels || models.length === 0}
                      className="w-full pl-9 pr-8 py-2.5 bg-nordic-card border border-nordic-border rounded-lg focus:outline-none focus:ring-1 focus:ring-nordic-primary/50 focus:border-nordic-primary/50 text-xs appearance-none disabled:opacity-50 text-nordic-text transition-all cursor-pointer"
                    >
                      {models.length === 0 ? (
                        <option>Ingen modeller fundet</option>
                      ) : (
                        models.map((m, idx) => (
                          <option key={`app-${m.name}-${idx}`} value={m.name}>
                            {m.name}
                          </option>
                        ))
                      )}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-nordic-text/40" />
                  </div>
                </div>

                <form onSubmit={handleGenerateApp} className="flex flex-col gap-4">
                  <div>
                    <label className="text-[10px] font-mono uppercase text-nordic-text/40 mb-2 block tracking-widest">
                      Beskriv din app
                    </label>
                    <textarea
                      value={appDescription}
                      onChange={(e) => setAppDescription(e.target.value)}
                      placeholder="f.eks. Et dashboard til overvågning af salgsdata med grafer..."
                      className="w-full h-40 p-4 bg-nordic-card border border-nordic-border rounded-xl focus:outline-none focus:ring-1 focus:ring-nordic-primary/50 focus:border-nordic-primary/50 text-sm text-nordic-text placeholder:text-nordic-text/30 resize-none transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!appDescription.trim() || isGeneratingApp}
                    className="w-full py-3 bg-nordic-primary text-white font-black uppercase tracking-widest text-xs rounded-xl hover:bg-nordic-primary/90 active:scale-95 transition-all disabled:opacity-20 disabled:grayscale flex items-center justify-center gap-3 shadow-lg shadow-nordic-primary/20"
                  >
                    {isGeneratingApp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layout className="w-4 h-4" />}
                    {isGeneratingApp ? 'Kompilerer...' : 'Smed App'}
                  </button>
                </form>

                {/* App Suggestions */}
                <div className="space-y-3">
                  <label className="text-[10px] font-mono uppercase text-nordic-text/40 block tracking-widest">
                    App Skabeloner
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "SaaS Dashboard",
                      "Inventory CMS",
                      "CRM System",
                      "Analytics Panel",
                      "Task Manager",
                      "Interactive Widget"
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => setAppDescription(suggestion)}
                        className="px-2.5 py-1.5 bg-nordic-secondary/50 border border-nordic-border rounded-lg text-[9px] font-bold uppercase tracking-wider text-nordic-text/60 hover:text-nordic-primary hover:border-nordic-primary/30 transition-all"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 text-[10px] font-mono rounded-lg">
                    {error}
                  </div>
                )}
              </div>

              {/* Right Side: App Preview/Code */}
              <div className="flex-1 bg-nordic-bg relative flex flex-col min-h-[500px] lg:min-h-0">
                {appViewMode === 'preview' ? (
                  <div className="flex-1 w-full h-full bg-nordic-bg lg:rounded-tl-2xl overflow-hidden">
                    <iframe
                      title="App Preview"
                      srcDoc={(() => {
                        const safetyScript = `
                          <script>
                            (function() {
                              document.addEventListener('click', function(e) {
                                const link = e.target.closest('a');
                                if (link) {
                                  const href = link.getAttribute('href');
                                  if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    console.log('Ekstern navigation blokeret i app-preview');
                                    return false;
                                  }
                                }
                              }, true);
                              window.open = () => null;
                              window.onbeforeunload = () => null;
                            })();
                          </script>
                        `;
                        let finalHtml = appCode;
                        if (!finalHtml.includes('<head>')) {
                          finalHtml = '<head></head>' + finalHtml;
                        }
                        const cspMeta = '<meta http-equiv="Content-Security-Policy" content="default-src * \'unsafe-inline\' \'unsafe-eval\'; img-src * data: blob:; media-src * data: blob:; font-src * data:; frame-src \'none\'; object-src \'none\';">';
                        finalHtml = finalHtml.replace('<head>', '<head>' + cspMeta);
                        if (finalHtml.includes('</body>')) {
                          finalHtml = finalHtml.replace('</body>', safetyScript + '</body>');
                        } else {
                          finalHtml += safetyScript;
                        }
                        return finalHtml;
                      })()}
                      className="w-full h-full border-none"
                      sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-forms"
                    />
                  </div>
                ) : (
                  <div className="flex-1 p-6 font-mono text-sm overflow-auto scrollbar-thin">
                    <pre className="text-nordic-primary/80 leading-relaxed">
                      <code>{appCode}</code>
                    </pre>
                  </div>
                )}

                {isGeneratingApp && (
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center z-30">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 bg-nordic-primary blur-3xl opacity-20 animate-pulse" />
                      <Loader2 className="w-16 h-16 text-nordic-primary animate-spin relative" />
                    </div>
                    <p className="font-sans text-2xl text-nordic-text animate-pulse">Kompilerer System Architecture...</p>
                    <p className="text-[10px] font-mono text-nordic-text/40 mt-4 uppercase tracking-[0.4em]">Initialiserer moduler • Renderer interfaces</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'multiagent' ? (
          <div className="flex-1 flex flex-col overflow-y-auto scrollbar-thin scrollbar-thumb-nordic-primary/20">
            <div className="flex-1 flex flex-col lg:flex-row">
              {/* Left Side: Moderator Panel */}
              <div className="w-full lg:w-96 border-r border-nordic-border bg-nordic-bg flex flex-col p-6 space-y-6 shrink-0 min-h-full">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-nordic-primary">
                      <Users className="w-5 h-5" />
                      <h2 className="font-sans text-xl font-bold">Moderator Panel</h2>
                    </div>
                    <button
                      onClick={resetMultiAgent}
                      className="p-2 text-nordic-text/40 hover:text-nordic-primary transition-colors"
                      title="Nyt Projekt"
                    >
                      <RefreshCw className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                  </div>
                  <p className="text-xs text-nordic-text/50 leading-relaxed">
                    Konfigurer flere agenter til at samarbejde om en opgave i runder.
                  </p>
                </div>

                {/* API Key (Shared) */}
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase text-nordic-text/40 block tracking-widest">
                    Ollama Cloud API Key
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nordic-primary/50" strokeWidth={1.5} />
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => {
                        setApiKey(e.target.value);
                        localStorage.setItem('ollama_api_key', e.target.value);
                      }}
                      className="w-full pl-9 pr-4 py-2 bg-nordic-card border border-nordic-border rounded-xl focus:outline-none focus:ring-1 focus:ring-nordic-primary/50 text-xs text-nordic-text"
                      placeholder="Indtast API nøgle..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono uppercase text-nordic-text/40 block tracking-widest">
                      Runder
                    </label>
                    <input
                      type="number"
                      value={multiAgentRounds}
                      onChange={(e) => setMultiAgentRounds(parseInt(e.target.value))}
                      min="1"
                      className="w-full px-3 py-2 bg-nordic-card border border-nordic-border rounded-xl focus:outline-none focus:ring-1 focus:ring-nordic-primary/50 text-xs text-nordic-text"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono uppercase text-nordic-text/40 block tracking-widest">
                      Agenter
                    </label>
                    <select
                      value={multiAgentCount}
                      onChange={(e) => setMultiAgentCount(parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-nordic-card border border-nordic-border rounded-xl focus:outline-none focus:ring-1 focus:ring-nordic-primary/50 text-xs text-nordic-text appearance-none"
                    >
                      <option value="2">2 Agenter</option>
                      <option value="3">3 Agenter</option>
                    </select>
                  </div>
                </div>

                {/* Agent Configs */}
                <div className="space-y-6">
                  {[...Array(multiAgentCount)].map((_, i) => (
                    <div key={i} className="space-y-3 p-4 bg-nordic-secondary/50 rounded-xl border border-nordic-border">
                      <div className="flex items-center gap-2 text-nordic-primary/80">
                        <Bot className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Agent {i + 1}</span>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-[9px] font-mono uppercase text-nordic-text/40 block tracking-widest">Model</label>
                        <select
                          value={multiAgentConfigs[i].model}
                          onChange={(e) => {
                            const newConfigs = [...multiAgentConfigs];
                            newConfigs[i].model = e.target.value;
                            setMultiAgentConfigs(newConfigs);
                          }}
                          className="w-full px-3 py-2 bg-nordic-card border border-nordic-border rounded-lg text-[10px] text-nordic-text appearance-none"
                        >
                          {models.map((m, idx) => (
                            <option key={`multi-${m.name}-${idx}`} value={m.name}>{m.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[9px] font-mono uppercase text-nordic-text/40 block tracking-widest">Rolle</label>
                        <select
                          value={multiAgentConfigs[i].role}
                          onChange={(e) => {
                            const newConfigs = [...multiAgentConfigs];
                            newConfigs[i].role = e.target.value;
                            setMultiAgentConfigs(newConfigs);
                          }}
                          className="w-full px-3 py-2 bg-nordic-card border border-nordic-border rounded-lg text-[10px] text-nordic-text appearance-none"
                        >
                          {ROLES.map((r, idx) => (
                            <option key={idx} value={r}>{r}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase text-nordic-text/40 block tracking-widest">
                    Opgave / Prompt
                  </label>
                  <textarea
                    value={multiAgentTask}
                    onChange={(e) => setMultiAgentTask(e.target.value)}
                    placeholder="Indtast opgave..."
                    className="w-full h-32 p-4 bg-nordic-card border border-nordic-border rounded-xl focus:outline-none focus:ring-1 focus:ring-nordic-primary/50 text-sm text-nordic-text placeholder:text-nordic-text/30 resize-none transition-all"
                  />
                </div>

                <button
                  onClick={handleRunMultiAgent}
                  disabled={!multiAgentTask.trim() || isGeneratingMultiAgent}
                  className="w-full py-4 bg-nordic-primary text-white font-black uppercase tracking-widest text-xs rounded-xl hover:bg-nordic-primary/90 active:scale-95 transition-all disabled:opacity-20 disabled:grayscale flex items-center justify-center gap-3 shadow-lg shadow-nordic-primary/20"
                >
                  {isGeneratingMultiAgent ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} /> : <Sparkles className="w-4 h-4" strokeWidth={1.5} />}
                  {isGeneratingMultiAgent ? 'KØRER SYSTEM...' : 'START SYSTEM'}
                </button>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 text-[10px] font-mono rounded-lg">
                    {error}
                  </div>
                )}
              </div>

              {/* Right Side: Horizontal Agent Columns or Preview */}
              <div className="flex-1 bg-nordic-bg flex flex-col overflow-hidden">
                {multiAgentViewMode === 'preview' ? (
                  <div className="flex-1 w-full h-[850px] bg-white lg:rounded-tl-2xl overflow-hidden">
                    <iframe
                      title="Multiagent Preview"
                      srcDoc={(() => {
                        // Find the last agent's output that looks like HTML
                        const lastHtml = [...multiAgentResults].reverse().find(r => r.content.includes('<!DOCTYPE html>') || r.content.includes('<html'));
                        if (!lastHtml) return '<div style="padding: 20px; font-family: sans-serif;">Ingen HTML-kode fundet i agenternes svar endnu.</div>';
                        
                        let code = lastHtml.content;
                        if (code.includes('```html')) {
                          code = code.split('```html')[1].split('```')[0];
                        } else if (code.includes('```')) {
                          code = code.split('```')[1].split('```')[0];
                        }
                        
                        const safetyScript = `
                          <script>
                            (function() {
                              document.addEventListener('click', function(e) {
                                const link = e.target.closest('a');
                                if (link) {
                                  e.preventDefault();
                                  console.log('Navigation blokeret i multiagent preview');
                                }
                              }, true);
                            })();
                          </script>
                        `;
                        return code.replace('</body>', safetyScript + '</body>');
                      })()}
                      className="w-full h-full border-none"
                      sandbox="allow-scripts"
                    />
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col p-6 overflow-y-auto">
                    <div className="flex flex-col space-y-8">
                      {[...Array(multiAgentCount)].map((_, i) => (
                        <div 
                          key={i} 
                          ref={el => { agentRefs.current[i] = el; }}
                          className={cn(
                            "w-full h-[650px] border border-nordic-border rounded-2xl flex flex-col relative transition-all duration-500 overflow-hidden shadow-2xl bg-nordic-card backdrop-blur-sm",
                            currentActiveAgent === i ? "ring-2 ring-nordic-primary/50 bg-nordic-primary/10" : ""
                          )}
                        >
                          <div className={cn(
                            "sticky top-0 z-10 p-3 border-b border-nordic-border backdrop-blur-xl flex items-center justify-between",
                            currentActiveAgent === i ? "bg-nordic-primary/20" : "bg-nordic-secondary"
                          )}>
                            <div className="flex items-center gap-3">
                              <div className="flex gap-1.5 px-2">
                                <div className="w-2 h-2 rounded-full bg-red-500/30 border border-red-500/50" />
                                <div className="w-2 h-2 rounded-full bg-yellow-500/30 border border-yellow-500/50" />
                                <div className="w-2 h-2 rounded-full bg-green-500/30 border border-green-500/50" />
                              </div>
                              <div className="flex items-center gap-2">
                                <Bot className={cn("w-4 h-4", currentActiveAgent === i ? "text-nordic-primary animate-pulse" : "text-nordic-text/50")} />
                                <span className="text-[10px] font-black uppercase tracking-widest text-nordic-text">BOT {i + 1}</span>
                                {currentActiveAgent === i && (
                                  <span className="flex h-1.5 w-1.5 rounded-full bg-nordic-primary animate-ping" />
                                )}
                              </div>
                            </div>
                            <span className="text-[9px] font-mono text-nordic-text/40 uppercase tracking-widest font-bold">{multiAgentConfigs[i].role}</span>
                          </div>

                          <div 
                            ref={el => { agentScrollRefs.current[i] = el; }}
                            onScroll={(e) => handleAgentScroll(e, i)}
                            className="flex-1 p-6 space-y-6 overflow-y-auto scrollbar-thin scroll-smooth"
                          >
                            {multiAgentResults.filter(r => r.agentIndex === i).map((res, idx) => (
                              <div key={idx} className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <div className="flex items-center gap-2 opacity-50">
                                  <div className="h-px flex-1 bg-white/10" />
                                  <span className="text-[8px] font-mono uppercase tracking-widest">Runde {res.round + 1}</span>
                                  <div className="h-px flex-1 bg-white/10" />
                                </div>
                                <div className="bg-nordic-bg/20 border border-nordic-border rounded-xl p-4 text-xs text-nordic-text leading-relaxed whitespace-pre-wrap font-mono relative group/msg">
                                  <ReactMarkdown>{res.content}</ReactMarkdown>
                                </div>
                              </div>
                            ))}
                            {currentActiveAgent === i && isGeneratingMultiAgent && (
                              <div className="flex items-center gap-2 text-nordic-primary/50 py-4">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span className="text-[10px] font-mono uppercase tracking-widest animate-pulse">Tænker...</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Permanent Button Row at the bottom of Multi-Agent section */}
                    {multiAgentResults.length > 0 && !isGeneratingMultiAgent && (
                      <div className="mt-8 pt-6 border-t border-nordic-border flex flex-wrap gap-4 items-center justify-center bg-nordic-bg/80 backdrop-blur-xl sticky bottom-0 pb-6">
                        <span className="text-[10px] font-mono uppercase text-nordic-text/40 tracking-widest">Forward Final Output:</span>
                        <button
                          onClick={() => {
                            const lastOutput = [...multiAgentResults].reverse().find(r => r.agentIndex === multiAgentCount - 1);
                            if (lastOutput) forwardTo(lastOutput.content, 'web');
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-nordic-primary/10 border border-nordic-primary/20 rounded-xl text-[11px] font-bold uppercase tracking-wider text-nordic-primary hover:bg-nordic-primary hover:text-white transition-all shadow-lg shadow-nordic-primary/10"
                        >
                          <Globe className="w-4 h-4" />
                          Send til Web
                        </button>
                        <button
                          onClick={() => {
                            const lastOutput = [...multiAgentResults].reverse().find(r => r.agentIndex === multiAgentCount - 1);
                            if (lastOutput) forwardTo(lastOutput.content, 'social');
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-nordic-primary/10 border border-nordic-primary/20 rounded-xl text-[11px] font-bold uppercase tracking-wider text-nordic-primary hover:bg-nordic-primary hover:text-white transition-all shadow-lg shadow-nordic-primary/10"
                        >
                          <Smartphone className="w-4 h-4" />
                          Send til Social
                        </button>
                        <button
                          onClick={() => {
                            const lastOutput = [...multiAgentResults].reverse().find(r => r.agentIndex === multiAgentCount - 1);
                            if (lastOutput) forwardTo(lastOutput.content, 'appmaker');
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-nordic-primary/10 border border-nordic-primary/20 rounded-xl text-[11px] font-bold uppercase tracking-wider text-nordic-primary hover:bg-nordic-primary hover:text-white transition-all shadow-lg shadow-nordic-primary/10"
                        >
                          <Layout className="w-4 h-4" />
                          Send til App Maker
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'leadsniper' ? (
          <div className="flex-1 flex flex-col overflow-y-auto scrollbar-thin bg-nordic-bg">
            <div className="flex-1 flex flex-col lg:flex-row">
              {/* Left Side: Sniper Controls */}
              <div className="w-full lg:w-96 border-r border-nordic-border bg-nordic-bg flex flex-col p-6 space-y-6 shrink-0 min-h-full shadow-sm">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-nordic-primary">
                      <Target className="w-5 h-5" />
                      <h2 className="font-sans text-xl font-bold text-nordic-text">The Sniper Engine</h2>
                    </div>
                  </div>
                  <p className="text-xs text-nordic-text/50 leading-relaxed">
                    Transformer rå internetdata til køreklare B2B-muligheder.
                  </p>
                </div>

                {/* Model Selection */}
                <div className="space-y-2">
                  <label className="text-[10px] font-sans uppercase text-nordic-text/40 block tracking-widest font-bold">
                    Vælg Model
                  </label>
                  <select
                    value={leadSniperSelectedModel}
                    onChange={(e) => setLeadSniperSelectedModel(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-nordic-border rounded-lg focus:outline-none focus:ring-1 focus:ring-nordic-primary/50 text-xs text-nordic-text appearance-none cursor-pointer"
                  >
                    <optgroup label="Google Gemini (Grounding)" className="bg-white">
                      <option value="gemini-3-flash-preview">gemini-3-flash-preview</option>
                      <option value="gemini-3.1-flash-lite-preview">gemini-3.1-flash-lite-preview</option>
                      <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview</option>
                    </optgroup>
                  </select>
                </div>

                {/* Filters */}
                <div className="space-y-4">
                  <label className="text-[10px] font-sans uppercase text-nordic-text/40 block tracking-widest font-bold">
                    Filtre
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 group cursor-pointer">
                      <div className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center transition-all",
                        leadSniperFilters.newestCvr ? "bg-nordic-primary border-nordic-primary" : "bg-white border-nordic-border group-hover:border-nordic-primary/50"
                      )} onClick={() => setLeadSniperFilters(prev => ({ ...prev, newestCvr: !prev.newestCvr }))}>
                        {leadSniperFilters.newestCvr && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-xs text-nordic-text/50 group-hover:text-nordic-primary transition-colors">Nyeste CVR (24-48t)</span>
                    </label>
                    <label className="flex items-center gap-3 group cursor-pointer">
                      <div className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center transition-all",
                        leadSniperFilters.availableDomains ? "bg-nordic-primary border-nordic-primary" : "bg-white border-nordic-border group-hover:border-nordic-primary/50"
                      )} onClick={() => setLeadSniperFilters(prev => ({ ...prev, availableDomains: !prev.availableDomains }))}>
                        {leadSniperFilters.availableDomains && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-xs text-nordic-text/50 group-hover:text-nordic-primary transition-colors">Ledige Domæner (.dk)</span>
                    </label>
                    <label className="flex items-center gap-3 group cursor-pointer">
                      <div className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center transition-all",
                        leadSniperFilters.highScore ? "bg-nordic-primary border-nordic-primary" : "bg-white border-nordic-border group-hover:border-nordic-primary/50"
                      )} onClick={() => setLeadSniperFilters(prev => ({ ...prev, highScore: !prev.highScore }))}>
                        {leadSniperFilters.highScore && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-xs text-nordic-text/50 group-hover:text-nordic-primary transition-colors">Høj Score (7-10)</span>
                    </label>
                  </div>
                </div>

                {/* Industry Selection */}
                <div className="space-y-2">
                  <label className="text-[10px] font-sans uppercase text-nordic-text/40 block tracking-widest font-bold">
                    Branche
                  </label>
                  <select
                    value={leadSniperIndustry}
                    onChange={(e) => setLeadSniperIndustry(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-nordic-border rounded-lg focus:outline-none focus:ring-1 focus:ring-nordic-primary/50 text-xs text-nordic-text appearance-none cursor-pointer"
                  >
                    <option value="Håndværk">Håndværk</option>
                    <option value="IT">IT</option>
                    <option value="Restauration">Restauration</option>
                    <option value="Liberale erhverv">Liberale erhverv</option>
                    <option value="Butik">Butik</option>
                    <option value="Service">Service</option>
                  </select>
                </div>

                {/* Custom Search */}
                <div className="space-y-2">
                  <label className="text-[10px] font-sans uppercase text-nordic-text/40 block tracking-widest font-bold">
                    Custom Search
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nordic-primary/50" />
                    <input
                      type="text"
                      value={leadSniperCustomSearch}
                      onChange={(e) => setLeadSniperCustomSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-white border border-nordic-border rounded-lg focus:outline-none focus:ring-1 focus:ring-nordic-primary/50 text-xs text-nordic-text placeholder:text-nordic-text/30"
                      placeholder="F.eks. 'Nye tømrer i Aarhus'..."
                    />
                  </div>
                </div>

                <button
                  onClick={handleRunLeadSniper}
                  disabled={isGeneratingLeads}
                  className="w-full py-4 bg-nordic-primary text-white font-bold uppercase tracking-widest text-xs rounded-xl hover:bg-nordic-primary/90 active:scale-95 transition-all disabled:opacity-20 disabled:grayscale flex items-center justify-center gap-3 shadow-md"
                >
                  {isGeneratingLeads ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
                  {isGeneratingLeads ? 'SNIPER AKTIV...' : 'KØR SNIPER'}
                </button>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-[10px] font-sans rounded-lg">
                    {error}
                  </div>
                )}
              </div>

              {/* Right Side: Lead Results */}
              <div className="flex-1 bg-nordic-bg flex flex-col overflow-hidden p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <Filter className="w-5 h-5 text-nordic-primary" />
                    <h3 className="font-sans text-xl font-bold text-nordic-text">Resultater</h3>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-6 px-4 py-2 bg-white border border-nordic-border rounded-2xl relative group shadow-sm">
                      <div className="flex flex-col">
                        <span className="text-[7px] font-mono text-nordic-text/40 uppercase tracking-widest">Session Trust</span>
                        <span className={cn(
                          "text-sm font-black font-mono",
                          calculateTrustScore() >= 90 ? "text-green-500" :
                          calculateTrustScore() >= 70 ? "text-yellow-500" :
                          "text-red-500"
                        )}>{calculateTrustScore()}%</span>
                      </div>
                      <div className="w-px h-6 bg-nordic-border/50" />
                      <div className="flex flex-col">
                        <span className="text-[7px] font-mono text-nordic-text/40 uppercase tracking-widest">Verified</span>
                        <span className="text-sm font-black font-mono text-nordic-text">{verifiedLeadsCount}</span>
                      </div>
                      <div className="w-px h-6 bg-nordic-border/50" />
                      <div className="flex flex-col">
                        <span className="text-[7px] font-mono text-nordic-text/40 uppercase tracking-widest">Hallucinations</span>
                        <span className="text-sm font-black font-mono text-nordic-primary">{hallucinationsCaughtCount}</span>
                      </div>
                      
                      <button 
                        onClick={resetLeadSniperSession}
                        className="absolute -top-2 -right-2 p-1 bg-nordic-card border border-nordic-border rounded-full text-nordic-text/40 hover:text-nordic-primary opacity-0 group-hover:opacity-100 transition-all"
                        title="Nulstil Session"
                      >
                        <RefreshCw className="w-2 h-2" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-full">
                      <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
                      <span className="text-[9px] font-mono text-yellow-500 uppercase tracking-widest font-bold">AI Simuleret Data - Verificér altid CVR</span>
                    </div>
                    <div className="text-[10px] font-mono text-nordic-text/40 uppercase tracking-widest">
                      {leadSniperResults.length} Leads Fundet
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-thin space-y-4">
                  {leadSniperResults.length > 0 ? (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                      {leadSniperResults.map((lead, idx) => (
                        <div key={idx} className="bg-nordic-card border border-nordic-border rounded-2xl p-5 hover:border-nordic-primary/30 transition-all group relative overflow-hidden shadow-sm">
                          {/* Confidence Indicator */}
                          <div 
                            className="absolute top-0 left-0 h-1 bg-nordic-primary/30 transition-all" 
                            style={{ width: `${lead.confidence_pct}%` }}
                            title={`Confidence: ${lead.confidence_pct}%`}
                          />

                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h4 className="text-lg font-bold text-nordic-text group-hover:text-nordic-primary transition-colors">{lead.name}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-mono text-nordic-text/40 uppercase tracking-widest">{lead.industry}</span>
                                <span className="w-1 h-1 rounded-full bg-nordic-border" />
                                <span className="text-[10px] font-mono text-nordic-text/40 uppercase tracking-widest">{lead.location}</span>
                                <span className="w-1 h-1 rounded-full bg-nordic-border" />
                                <a 
                                  href={`https://datacvr.virk.dk/enhed/virksomhed/${lead.cvr}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] font-mono text-nordic-primary hover:text-nordic-primary/80 transition-colors uppercase tracking-widest flex items-center gap-1"
                                >
                                  CVR: {lead.cvr}
                                  <ExternalLink className="w-2 h-2" />
                                </a>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <div className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                lead.score >= 8 ? "bg-green-500/10 text-green-500 border border-green-500/20" :
                                lead.score >= 6 ? "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20" :
                                "bg-nordic-text/10 text-nordic-text/50 border border-nordic-border"
                              )}>
                                Score: {lead.score}/10
                              </div>
                              <div className="text-[9px] font-mono text-nordic-text/30 uppercase tracking-tighter">
                                Confidence: {lead.confidence_pct}%
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3 mb-6">
                            <div className="p-3 bg-nordic-bg/50 rounded-xl border border-nordic-border italic text-xs text-nordic-text/70 leading-relaxed">
                              "{lead.pitch}"
                            </div>
                            
                            <div className="flex flex-wrap gap-2 mt-3">
                              <span className="px-2 py-0.5 bg-nordic-bg rounded text-[9px] text-nordic-text/40 font-mono uppercase tracking-wider border border-nordic-border">
                                {lead.domain_status}
                              </span>
                              <span className="px-2 py-0.5 bg-nordic-primary/10 border border-nordic-primary/20 rounded text-[9px] text-nordic-primary font-mono uppercase tracking-wider">
                                Trigger: {lead.action_trigger}
                              </span>
                              <a 
                                href={lead.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2 py-0.5 bg-nordic-secondary border border-nordic-border rounded text-[9px] text-nordic-primary font-mono uppercase tracking-wider hover:bg-nordic-primary hover:text-white transition-all flex items-center gap-1"
                              >
                                Kilde
                                <ExternalLink className="w-2 h-2" />
                              </a>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-4 border-t border-nordic-border relative">
                            <div className="flex items-center gap-1 mr-auto">
                              <button
                                onClick={() => handleLeadFeedback(lead, 'up')}
                                className="p-2 bg-green-500/10 border border-green-500/20 rounded-xl text-green-500 hover:bg-green-500 hover:text-white transition-all"
                                title="Verified Lead (+2)"
                              >
                                <ThumbsUp className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleLeadFeedback(lead, 'down')}
                                className="p-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 hover:bg-red-500 hover:text-white transition-all"
                                title="Hallucination Caught (-5)"
                              >
                                <ThumbsDown className="w-3 h-3" />
                              </button>

                              {activeFeedbackLead === lead.cvr && (
                                <div className="absolute bottom-full left-0 mb-2 w-48 bg-nordic-card border border-nordic-border rounded-xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-bottom-2">
                                  <p className="text-[9px] font-mono text-nordic-text/40 uppercase tracking-widest mb-2 px-2">Vælg Årsag</p>
                                  <div className="space-y-1">
                                    {['Forkert CVR', 'Lukket Firma', 'Forkert Branche', 'Hallucination', 'Andet'].map(reason => (
                                      <button
                                        key={reason}
                                        onClick={() => handleLeadFeedback(lead, 'down', reason)}
                                        className="w-full text-left px-2 py-1.5 text-[10px] text-nordic-text/60 hover:bg-nordic-bg hover:text-nordic-primary rounded-lg transition-colors"
                                      >
                                        {reason}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            <button
                              onClick={() => forwardTo(`Jeg har fundet et lead: ${lead.name}. De arbejder med ${lead.industry} i ${lead.location}. Deres behov er: ${lead.pitch}. Kan du hjælpe med at bygge noget til dem? Brug template: ${lead.action_trigger}`, 'appmaker')}
                              className="flex-[2] flex items-center justify-center gap-2 py-2 bg-nordic-primary/10 border border-nordic-primary/20 rounded-xl text-[10px] font-bold uppercase tracking-widest text-nordic-primary hover:bg-nordic-primary hover:text-white transition-all"
                            >
                              <Layout className="w-3 h-3" />
                              App Maker
                            </button>
                            <button
                              onClick={() => forwardTo(`Jeg har fundet et lead: ${lead.name}. De arbejder med ${lead.industry} i ${lead.location}. Deres behov er: ${lead.pitch}. Kan du hjælpe med at bygge noget til dem? Brug template: ${lead.action_trigger}`, 'web')}
                              className="flex-[2] flex items-center justify-center gap-2 py-2 bg-nordic-primary/10 border border-nordic-primary/20 rounded-xl text-[10px] font-bold uppercase tracking-widest text-nordic-primary hover:bg-nordic-primary hover:text-white transition-all"
                            >
                              <Globe className="w-3 h-3" />
                              Send til Web
                            </button>
                            <button
                              onClick={() => forwardTo(`Lav et social media opslag til ${lead.name}. De er i ${lead.industry} branchen. Fokusér på deres behov: ${lead.pitch}`, 'social')}
                              className="flex-[2] flex items-center justify-center gap-2 py-2 bg-nordic-primary/10 border border-nordic-primary/20 rounded-xl text-[10px] font-bold uppercase tracking-widest text-nordic-primary hover:bg-nordic-primary hover:text-white transition-all"
                            >
                              <Smartphone className="w-3 h-3" />
                              Social Post
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-12">
                      <div className="relative mb-6">
                        <div className="absolute inset-0 bg-nordic-primary blur-3xl opacity-10 animate-pulse" />
                        <Target className="w-20 h-20 text-nordic-text/10 relative" />
                      </div>
                      <h4 className="font-sans font-bold text-2xl text-nordic-text/20 mb-2">Ingen Leads Fundet</h4>
                      <p className="text-sm text-nordic-text/40 max-w-md">
                        Konfigurer dine filtre og kør Sniper Engine for at identificere nye forretningsmuligheder.
                      </p>
                    </div>
                  )}
                </div>

                {isGeneratingLeads && (
                  <div className="absolute inset-0 bg-nordic-bg/60 backdrop-blur-sm flex flex-col items-center justify-center z-30">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 bg-nordic-primary blur-3xl opacity-20 animate-pulse" />
                      <Loader2 className="w-16 h-16 text-nordic-primary animate-spin relative" />
                    </div>
                    <p className="font-sans font-bold text-2xl text-nordic-text animate-pulse">Scanner netværket...</p>
                    <p className="text-[10px] font-mono text-nordic-text/40 mt-4 uppercase tracking-[0.4em]">Analyserer CVR • Validerer Domæner • Beregner Scores</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'security' ? (
          <div className="flex-1 flex flex-col overflow-y-auto scrollbar-thin bg-nordic-bg p-6">
            <div className="max-w-4xl mx-auto w-full space-y-8">
              {/* Header */}
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-nordic-primary/10 text-nordic-primary mb-4">
                  <Shield className="w-8 h-8" strokeWidth={1.5} />
                </div>
                <h2 className="text-3xl font-black tracking-tight text-nordic-text">Security Guard</h2>
                <p className="text-nordic-text/40 max-w-lg mx-auto">
                  Defensiv sikkerhedsrådgiver drevet af Ollama AI. Analysér din web-arkitektur for sårbarheder og få en professionel audit rapport.
                </p>
              </div>

              {/* Input Section */}
              <form onSubmit={handleSecurityAudit} className="bg-nordic-card border border-nordic-border rounded-xl p-6 shadow-sm space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-nordic-text/40 ml-1 flex items-center gap-2">
                      <Search className="w-3 h-3" strokeWidth={1.5} />
                      Researcher Agent
                    </label>
                    <div className="relative">
                      <select
                        value={securityResearcherModel}
                        onChange={(e) => setSecurityResearcherModel(e.target.value)}
                        className="w-full pl-4 pr-10 py-3 bg-nordic-bg border border-nordic-border rounded-xl focus:outline-none focus:ring-2 focus:ring-nordic-primary/20 focus:border-nordic-primary transition-all text-nordic-text appearance-none text-sm font-medium"
                      >
                        {models.map((model) => (
                          <option key={model.name} value={model.name}>
                            {model.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nordic-text/20 pointer-events-none" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-nordic-text/40 ml-1 flex items-center gap-2">
                      <Shield className="w-3 h-3" strokeWidth={1.5} />
                      Auditor Agent
                    </label>
                    <div className="relative">
                      <select
                        value={securityAuditorModel}
                        onChange={(e) => setSecurityAuditorModel(e.target.value)}
                        className="w-full pl-4 pr-10 py-3 bg-nordic-bg border border-nordic-border rounded-xl focus:outline-none focus:ring-2 focus:ring-nordic-primary/20 focus:border-nordic-primary transition-all text-nordic-text appearance-none text-sm font-medium"
                      >
                        {models.map((model) => (
                          <option key={model.name} value={model.name}>
                            {model.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nordic-text/20 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-nordic-text/20" strokeWidth={1.5} />
                  <input
                    type="text"
                    placeholder="Indtast domæne til analyse (f.eks. google.com)..."
                    value={securityUrl}
                    onChange={(e) => setSecurityUrl(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-nordic-bg border border-nordic-border rounded-xl focus:outline-none focus:ring-2 focus:ring-nordic-primary/20 focus:border-nordic-primary transition-all text-nordic-text"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isScanningSecurity || !securityUrl.trim()}
                  className="w-full py-4 bg-[#1e293b] hover:bg-[#0f172a] text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-black/10"
                >
                  {isScanningSecurity ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      SCANNING ARCHITECTURE...
                    </>
                  ) : (
                    <>
                      <Shield className="w-5 h-5" />
                      START SECURITY AUDIT
                    </>
                  )}
                </button>
              </form>

              {/* Live Log & Report Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
                {/* Live Log (Terminal) */}
                <div className="bg-[#0f172a] rounded-xl border border-nordic-border overflow-hidden flex flex-col h-[400px] shadow-2xl">
                  <div className="bg-white/5 px-4 py-2 flex items-center gap-2 border-b border-white/10">
                    <Terminal className="w-4 h-4 text-white/40" />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-white/40">Live Audit Log</span>
                  </div>
                  <div className="flex-1 p-4 font-mono text-[11px] overflow-y-auto scrollbar-thin space-y-1 bg-[#0f172a]">
                    {securityLogs.length === 0 ? (
                      <p className="text-white/20 italic">Afventer scanning...</p>
                    ) : (
                      securityLogs.map((log, i) => (
                        <p key={i} className={cn(
                          log.startsWith('[ERROR]') ? "text-red-400" : 
                          log.startsWith('[SUCCESS]') ? "text-green-400" : 
                          log.startsWith('[SYSTEM]') ? "text-blue-400" : 
                          log.startsWith('[AGENT]') ? "text-purple-400" : 
                          "text-slate-300"
                        )}>
                          <span className="opacity-30 mr-2 text-white/40">[{new Date().toLocaleTimeString()}]</span>
                          {log}
                        </p>
                      ))
                    )}
                  </div>
                </div>

                {/* Audit Report Card */}
                <div className="bg-white rounded-xl border border-nordic-border p-6 flex flex-col h-[400px] shadow-sm overflow-y-auto scrollbar-thin">
                  {!securityReport ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                      <Shield className="w-12 h-12 text-nordic-text/10" />
                      <p className="text-sm text-nordic-text/40">Kør en scanning for at generere din sikkerhedsrapport.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-nordic-text text-lg">Audit Report</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-nordic-text/40">Safety Score</span>
                          <div className={cn(
                            "px-3 py-1 rounded-full text-xs font-black",
                            securityReport.safetyScore >= 80 ? "bg-green-100 text-green-700" :
                            securityReport.safetyScore >= 50 ? "bg-yellow-100 text-yellow-700" :
                            "bg-red-100 text-red-700"
                          )}>
                            {securityReport.safetyScore}/100
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-nordic-primary mb-2">Vulnerability List</h4>
                          <ul className="space-y-2">
                            {securityReport.vulnerabilities?.map((v: string, i: number) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-nordic-text/80">
                                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" strokeWidth={1.5} />
                                {v}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-nordic-primary mb-2">Action Plan</h4>
                          <div className="bg-nordic-bg/50 rounded-xl p-4 text-sm text-nordic-text/70 leading-relaxed border border-nordic-border">
                            <ReactMarkdown>{securityReport.actionPlan}</ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'seo' ? (
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
              {/* Header Section */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-nordic-primary/10 rounded-xl">
                      <Target className="w-6 h-6 text-nordic-primary" strokeWidth={1.5} />
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-nordic-text uppercase">
                      SEO & Ads <span className="text-nordic-primary font-light">Intelligence</span>
                    </h2>
                  </div>
                  <p className="text-sm text-nordic-text/60 max-w-2xl leading-relaxed">
                    Analysér din sides SEO-sundhed og generér AI-optimerede annoncekampagner til Google og Meta.
                  </p>
                </div>
              </div>

              {/* Input Sidebar & Strategy */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                  <form onSubmit={handleGenerateSeo} className="bg-white rounded-xl border border-nordic-border p-6 shadow-sm space-y-6">
                    <div className="space-y-4">
                      {/* Model Selector */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-nordic-text/40 ml-1 flex items-center gap-2">
                          <Bot className="w-3 h-3" strokeWidth={1.5} />
                          AI Intelligence Model
                        </label>
                        <div className="relative">
                          <select
                            value={seoSelectedModel}
                            onChange={(e) => setSeoSelectedModel(e.target.value)}
                            className="w-full pl-4 pr-10 py-3 bg-nordic-bg border border-nordic-border rounded-xl focus:outline-none focus:ring-2 focus:ring-nordic-primary/20 focus:border-nordic-primary transition-all text-nordic-text appearance-none text-sm font-medium"
                          >
                            {models.map((model) => (
                              <option key={model.name} value={model.name}>
                                {model.name}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nordic-text/20 pointer-events-none" />
                        </div>
                      </div>

                      {/* URL Input */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-nordic-text/40 ml-1">Project Link</label>
                        <div className="relative">
                          <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-nordic-text/20" strokeWidth={1.5} />
                          <input
                            type="text"
                            placeholder="Indtast URL til analyse..."
                            value={seoUrl}
                            onChange={(e) => setSeoUrl(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-nordic-bg border border-nordic-border rounded-xl focus:outline-none focus:ring-2 focus:ring-nordic-primary/20 focus:border-nordic-primary transition-all text-sm"
                          />
                        </div>
                      </div>

                      {/* Keywords Input */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-nordic-text/40 ml-1 flex items-center justify-between">
                          Primary Keywords
                          <span className="text-[8px] opacity-60 italic lowercase">Valgfrit: AI finder selv hvis tomt</span>
                        </label>
                        <div className="relative">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-nordic-text/20" strokeWidth={1.5} />
                          <input
                            type="text"
                            placeholder="f.eks. Billig VVS, SaaS Software"
                            value={seoKeywords}
                            onChange={(e) => setSeoKeywords(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-nordic-bg border border-nordic-border rounded-xl focus:outline-none focus:ring-2 focus:ring-nordic-primary/20 focus:border-nordic-primary transition-all text-sm"
                          />
                        </div>
                      </div>

                      {/* Platform Selector */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-nordic-text/40 ml-1">Platform Selector</label>
                        <div className="grid grid-cols-1 gap-2">
                          {[
                            { id: 'google-seo', label: 'Google SEO', icon: Search },
                            { id: 'google-ads', label: 'Google Ads', icon: Target },
                            { id: 'social-ads', label: 'Social Ads (Meta)', icon: Users }
                          ].map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => setSeoPlatform(p.id as any)}
                              className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-xs font-bold uppercase tracking-wider",
                                seoPlatform === p.id 
                                  ? "bg-nordic-primary border-nordic-primary text-white shadow-lg shadow-nordic-primary/20" 
                                  : "bg-nordic-bg border-nordic-border text-nordic-text/60 hover:border-nordic-primary/50"
                              )}
                            >
                              <p.icon className="w-4 h-4" />
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isGeneratingSeo || !seoUrl.trim()}
                      className="w-full py-4 bg-[#1e293b] hover:bg-[#0f172a] text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-black/10 uppercase tracking-widest text-xs"
                    >
                      {isGeneratingSeo ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Analyserer...
                        </>
                      ) : (
                        <>
                          <Rocket className="w-4 h-4" />
                          GENERÉR VÆKSTPLAN
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Main Workspace */}
                <div className="lg:col-span-2 space-y-6">
                  {!seoResults ? (
                    <div className="bg-white rounded-xl border border-nordic-border border-dashed p-12 flex flex-col items-center justify-center text-center space-y-4 h-full min-h-[500px]">
                      <div className="p-4 bg-nordic-bg rounded-xl">
                        <Target className="w-12 h-12 text-nordic-text/10" strokeWidth={1.5} />
                      </div>
                      <div className="max-w-xs">
                        <h3 className="font-bold text-nordic-text mb-2">Klar til vækst?</h3>
                        <p className="text-sm text-nordic-text/40 leading-relaxed">
                          Indtast din URL og søgeord for at få en komplet SEO-analyse og annonceforslag.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6 pb-12">
                      {/* SEO Health Card */}
                      <div className="bg-white rounded-2xl border border-nordic-border p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="font-bold text-nordic-text flex items-center gap-2">
                            <Shield className="w-5 h-5 text-nordic-primary" />
                            SEO Health Card
                          </h3>
                          <div className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                            seoResults.seoHealth.status === 'good' ? "bg-green-100 text-green-700" :
                            seoResults.seoHealth.status === 'warning' ? "bg-yellow-100 text-yellow-700" :
                            "bg-red-100 text-red-700"
                          )}>
                            {seoResults.seoHealth.status} status
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div>
                              <label className="text-[10px] font-bold uppercase tracking-widest text-nordic-text/40 block mb-1">Page Title</label>
                              <p className="text-sm font-medium text-nordic-text">{seoResults.seoHealth.title}</p>
                            </div>
                            <div>
                              <label className="text-[10px] font-bold uppercase tracking-widest text-nordic-text/40 block mb-1">Meta Description</label>
                              <p className="text-sm text-nordic-text/70 leading-relaxed">{seoResults.seoHealth.description}</p>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <label className="text-[10px] font-bold uppercase tracking-widest text-nordic-text/40 block mb-1">Heading Structure (H1-H3)</label>
                              <div className="space-y-2 max-h-32 overflow-y-auto scrollbar-thin pr-2">
                                {seoResults.seoHealth.h1.map((h, i) => (
                                  <div key={i} className="flex items-center gap-2 text-[11px] text-nordic-text/60">
                                    <span className="font-black text-nordic-primary">H1</span> {h}
                                  </div>
                                ))}
                                {seoResults.seoHealth.h2.map((h, i) => (
                                  <div key={i} className="flex items-center gap-2 text-[11px] text-nordic-text/60">
                                    <span className="font-black text-nordic-primary/60">H2</span> {h}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Ad Copy Preview */}
                      <div className="bg-white rounded-2xl border border-nordic-border p-6 shadow-sm">
                        <h3 className="font-bold text-nordic-text flex items-center gap-2 mb-6">
                          <Maximize2 className="w-5 h-5 text-nordic-primary" />
                          Ad Copy Preview
                        </h3>
                        
                        <div className="bg-nordic-bg/50 rounded-2xl p-8 border border-nordic-border">
                          <div className="max-w-lg mx-auto bg-white rounded-xl border border-nordic-border p-4 shadow-sm space-y-2">
                            <div className="flex items-center gap-2 text-[10px] text-nordic-text/40">
                              <span>Annonce</span>
                              <span>•</span>
                              <span className="text-blue-600">{seoResults.adCopy.displayUrl}</span>
                            </div>
                            <h4 className="text-xl text-blue-700 font-medium hover:underline cursor-pointer">
                              {seoResults.adCopy.headline}
                            </h4>
                            <p className="text-sm text-nordic-text/70 leading-relaxed">
                              {seoResults.adCopy.description}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Keyword Strategy */}
                      <div className="bg-white rounded-2xl border border-nordic-border overflow-hidden shadow-sm">
                        <div className="p-6 border-b border-nordic-border">
                          <h3 className="font-bold text-nordic-text flex items-center gap-2">
                            <Filter className="w-5 h-5 text-nordic-primary" />
                            Keyword Strategy
                          </h3>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-nordic-bg/50">
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-nordic-text/40">Keyword</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-nordic-text/40">Volume</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-nordic-text/40">Difficulty</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-nordic-text/40">Intent</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-nordic-border">
                              {seoResults.keywordStrategy.map((k, i) => (
                                <tr key={i} className="hover:bg-nordic-bg/30 transition-colors">
                                  <td className="px-6 py-4 text-sm font-bold text-nordic-text">{k.keyword}</td>
                                  <td className="px-6 py-4 text-sm text-nordic-text/60">{k.volume}</td>
                                  <td className="px-6 py-4">
                                    <span className={cn(
                                      "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                      k.difficulty === 'Low' ? "bg-green-100 text-green-700" :
                                      k.difficulty === 'Medium' ? "bg-yellow-100 text-yellow-700" :
                                      "bg-red-100 text-red-700"
                                    )}>
                                      {k.difficulty}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-sm text-nordic-text/60">{k.intent}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
