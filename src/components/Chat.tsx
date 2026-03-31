import React, { useState, useRef, useEffect } from 'react';
import { Content } from '@google/genai';
import { Send, Mic, User, Bot, Loader2, Lightbulb } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ChatProps {
  history: Content[];
  onSendMessage: (text: string) => void;
  isTyping: boolean;
}

export default function Chat({ history, onSendMessage, isTyping }: ChatProps) {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [history, isTyping]);

  useEffect(() => {
    const lowerInput = input.trim().toLowerCase();
    // Check if input ends with "ok" (allowing punctuation like . ! ? at the end)
    if (/(^|\s)ok[.,!?]*$/.test(lowerInput) && !isTyping) {
      if (isListening && recognitionRef.current) {
        recognitionRef.current.stop();
        setIsListening(false);
      }

      // Remove the "ok" from the end to send a cleaner message, 
      // but if the user just typed "ok", send "ok"
      const textToSend = input.replace(/(^|\s)[oO][kK][.,!?]*$/, '').trim();
      
      // We use a small timeout to avoid state update conflicts
      setTimeout(() => {
        onSendMessage(textToSend || input.trim());
        setInput('');
      }, 50);
    }
  }, [input, isTyping, isListening, onSendMessage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isTyping) {
      if (isListening && recognitionRef.current) {
        recognitionRef.current.stop();
        setIsListening(false);
      }
      onSendMessage(input);
      setInput('');
    }
  };

  const toggleListen = () => {
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = 'es-ES';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => prev ? `${prev} ${transcript}` : transcript);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } else {
      alert("El reconocimiento de voz no está soportado en este navegador.");
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 border-b bg-gray-50 flex items-center gap-3 shrink-0">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
          <Bot size={24} />
        </div>
        <div>
          <h2 className="font-bold text-gray-800">Asesor Financiero</h2>
          <p className="text-xs text-gray-500">Impulsado por Gemini</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {history.length === 0 && (
          <div className="text-center text-gray-400 mt-10">
            <Bot size={48} className="mx-auto mb-4 opacity-20" />
            <p>¡Hola! Soy tu asesor financiero.</p>
            <p className="text-sm mt-2">Dime qué gastos o ingresos tuviste hoy, o pregúntame sobre tu balance.</p>
          </div>
        )}

        {history.map((msg, idx) => {
          if (msg.role === 'user' && msg.parts.some(p => p.functionResponse)) {
            // Hide function responses from UI
            return null;
          }
          if (msg.role === 'model' && msg.parts.some(p => p.functionCall)) {
            // Hide function calls from UI
            return null;
          }

          const text = msg.parts.map(p => p.text).join('');
          if (!text) return null;

          return (
            <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === 'user' ? 'bg-gray-200 text-gray-600' : 'bg-blue-100 text-blue-600'
              }`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-gray-100 text-gray-800 rounded-tl-none'
              }`}>
                {msg.role === 'user' ? (
                  <p>{text}</p>
                ) : (
                  <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-gray-800 prose-pre:text-gray-100">
                    <ReactMarkdown>{text}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0">
              <Bot size={16} />
            </div>
            <div className="bg-gray-100 text-gray-800 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-2">
              <Loader2 size={16} className="animate-spin text-blue-600" />
              <span className="text-sm text-gray-500">Pensando...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white border-t shrink-0 flex flex-col">
        <div className="p-2 bg-gray-50 flex gap-2 overflow-x-auto whitespace-nowrap items-center border-b border-gray-100">
          <div className="flex items-center gap-1 text-xs font-bold text-amber-600 px-2 shrink-0">
            <Lightbulb size={14} /> Consultas Inteligentes:
          </div>
          {[
            "¿Cuál es mi balance actual?",
            "¿Cuánto gasté esta semana?",
            "Muéstrame mis gastos en comida",
            "Resumen de mis finanzas"
          ].map((q, i) => (
            <button
              key={i}
              onClick={() => onSendMessage(q)}
              disabled={isTyping}
              className="text-xs bg-white border border-gray-200 rounded-full px-3 py-1.5 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors disabled:opacity-50 shrink-0"
            >
              {q}
            </button>
          ))}
        </div>
        <div className="p-4">
          <form onSubmit={handleSubmit} className="flex items-center gap-2 bg-gray-100 rounded-full p-1 border border-gray-200 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400 transition-all">
            <button
              type="button"
              onClick={toggleListen}
              className={`p-2 rounded-full transition-colors ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'text-gray-500 hover:bg-gray-200'}`}
              title="Hablar"
            >
              <Mic size={20} />
            </button>
            
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isListening ? "Escuchando..." : "Escribe un gasto o consulta..."}
              className="flex-1 bg-transparent border-none focus:ring-0 px-2 py-2 text-sm text-gray-800 outline-none"
              disabled={isTyping}
            />
            
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
