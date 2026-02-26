import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Send, Menu, X, Sparkles, Heart, CloudRain, Sun, Zap, BookOpen, Music, Wind } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for Tailwind class merging
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

type Mood = 'neutral' | 'happy' | 'stressed' | 'anxious' | 'sad';

// --- Components ---

const FloatingParticle = ({ mood }: { mood: Mood }) => {
  const colors = {
    neutral: 'bg-blue-200',
    happy: 'bg-yellow-200',
    stressed: 'bg-red-200',
    anxious: 'bg-purple-200',
    sad: 'bg-indigo-200',
  };

  const randomX = Math.random() * 100;
  const randomY = Math.random() * 100;
  const duration = 10 + Math.random() * 20;

  return (
    <motion.div
      className={cn("absolute rounded-full opacity-20 blur-xl", colors[mood])}
      style={{
        width: Math.random() * 200 + 50,
        height: Math.random() * 200 + 50,
        left: `${randomX}%`,
        top: `${randomY}%`,
      }}
      animate={{
        x: [0, Math.random() * 100 - 50, 0],
        y: [0, Math.random() * 100 - 50, 0],
        scale: [1, 1.2, 1],
      }}
      transition={{
        duration: duration,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
};

const ChatMessage = ({ message }: { message: Message }) => {
  const isUser = message.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex w-full mb-4",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 text-sm md:text-base shadow-sm",
          isUser
            ? "bg-indigo-600 text-white rounded-br-none"
            : "bg-white/80 backdrop-blur-md text-slate-800 border border-white/20 rounded-bl-none"
        )}
      >
        <ReactMarkdown>{message.content}</ReactMarkdown>
        <div className={cn("text-[10px] mt-1 opacity-70", isUser ? "text-indigo-100" : "text-slate-400")}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </motion.div>
  );
};

const MoodBadge = ({ mood }: { mood: Mood }) => {
  const config = {
    neutral: { icon: Sparkles, label: 'Calm', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    happy: { icon: Sun, label: 'Happy', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    stressed: { icon: Zap, label: 'Stressed', color: 'bg-red-100 text-red-700 border-red-200' },
    anxious: { icon: Wind, label: 'Anxious', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    sad: { icon: CloudRain, label: 'Down', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  };

  const { icon: Icon, label, color } = config[mood];

  return (
    <motion.div
      key={mood}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm", color)}
    >
      <Icon className="w-4 h-4" />
      <span className="text-xs font-medium">{label}</span>
    </motion.div>
  );
};

// --- Main App ---

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hi there. I'm your wellness companion. How are you feeling today?",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mood, setMood] = useState<Mood>('neutral');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const analyzeMood = async (text: string) => {
    if (!process.env.GEMINI_API_KEY) return;
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash-lite-latest',
        contents: [{
            role: 'user',
            parts: [{ text: `Analyze the sentiment of this text and categorize it into exactly one of these labels: neutral, happy, stressed, anxious, sad. Return ONLY the label. Text: "${text}"` }]
        }]
      });
      
      const detectedMood = result.text?.trim().toLowerCase() as Mood;
      if (['neutral', 'happy', 'stressed', 'anxious', 'sad'].includes(detectedMood)) {
        setMood(detectedMood);
      }
    } catch (e) {
      console.error("Mood detection failed", e);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Parallel mood analysis
    analyzeMood(input);

    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("API Key missing");
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      // Use a model capable of chat
      const chat = ai.chats.create({
        model: 'gemini-2.5-flash-lite-latest',
        config: {
            systemInstruction: "You are a compassionate, empathetic mental health chatbot for students. Your goal is to listen, validate feelings, and offer gentle, practical advice for stress management, study habits, and emotional well-being. Keep responses concise (under 3 sentences usually) and conversational. Use a warm, supportive tone. Do not diagnose medical conditions. If someone seems in crisis, gently suggest professional help."
        },
        history: messages.map(m => ({
            role: m.role,
            parts: [{ text: m.content }]
        }))
      });

      const result = await chat.sendMessage({ message: input });
      const responseText = result.text;

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseText || "I'm here to listen.",
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please check your internet or API key.",
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-slate-50 font-sans text-slate-900">
      {/* Dynamic Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-indigo-50/50" />
        <FloatingParticle mood={mood} />
        <FloatingParticle mood={mood} />
        <FloatingParticle mood={mood} />
      </div>

      {/* Sidebar (Desktop: always visible, Mobile: toggle) */}
      <AnimatePresence>
        {(isSidebarOpen || window.innerWidth >= 768) && (
          <motion.aside
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className={cn(
                "fixed inset-y-0 left-0 z-20 w-72 bg-white/80 backdrop-blur-xl border-r border-slate-200 p-6 shadow-xl md:relative md:shadow-none md:translate-x-0",
                !isSidebarOpen && "hidden md:block"
            )}
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-indigo-600 rounded-xl text-white">
                <Heart className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">MindfulAI</h1>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Current Vibe</h3>
                <MoodBadge mood={mood} />
              </div>

              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Quick Tools</h3>
                <div className="grid gap-2">
                  <button className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-100 hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700 shadow-sm">
                    <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg"><Wind className="w-4 h-4"/></div>
                    Breathing Exercise
                  </button>
                  <button className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-100 hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700 shadow-sm">
                    <div className="p-1.5 bg-purple-100 text-purple-600 rounded-lg"><Music className="w-4 h-4"/></div>
                    Calming Lo-Fi
                  </button>
                  <button className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-100 hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700 shadow-sm">
                    <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg"><BookOpen className="w-4 h-4"/></div>
                    Journal Entry
                  </button>
                </div>
              </div>

              <div className="mt-auto pt-6 border-t border-slate-100">
                 <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
                    <h4 className="text-sm font-semibold text-indigo-900 mb-1">Daily Quote</h4>
                    <p className="text-xs text-indigo-700 italic">"You don't have to control your thoughts. You just have to stop letting them control you."</p>
                 </div>
              </div>
            </div>
            
            {/* Mobile Close Button */}
            <button 
                onClick={() => setIsSidebarOpen(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 md:hidden"
            >
                <X className="w-5 h-5" />
            </button>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col h-full relative z-10">
        {/* Header */}
        <header className="h-16 px-6 flex items-center justify-between border-b border-slate-200/50 bg-white/50 backdrop-blur-sm">
          <div className="flex items-center gap-3 md:hidden">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                <Menu className="w-5 h-5" />
            </button>
            <span className="font-semibold text-slate-800">MindfulAI</span>
          </div>
          <div className="hidden md:block text-sm text-slate-500">
            Student Wellness Companion
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-medium text-slate-500">Online</span>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          {isLoading && (
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex justify-start"
            >
                <div className="bg-white/80 backdrop-blur-md px-4 py-3 rounded-2xl rounded-bl-none border border-white/20 shadow-sm flex gap-1 items-center">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-6 bg-white/50 backdrop-blur-md border-t border-slate-200/50">
          <div className="max-w-3xl mx-auto relative flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type how you're feeling..."
              className="w-full pl-4 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 text-slate-700"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="absolute right-2 p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md shadow-indigo-200"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-center text-[10px] text-slate-400 mt-2">
            AI can make mistakes. For medical emergencies, please call 911.
          </p>
        </div>
      </main>
    </div>
  );
}
