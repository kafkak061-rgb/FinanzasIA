import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type, Content, Part } from '@google/genai';
import { Transaction, FinancialSummary } from './types';
import Dashboard from './components/Dashboard';
import Chat from './components/Chat';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const transactionsRef = useRef(transactions);
  
  useEffect(() => {
    transactionsRef.current = transactions;
  }, [transactions]);

  const [chatHistory, setChatHistory] = useState<Content[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const calculateSummary = (txs: Transaction[]): FinancialSummary => {
    let totalIncome = 0;
    let totalExpense = 0;
    const expensesByCategory: Record<string, number> = {};

    txs.forEach(tx => {
      if (tx.type === 'income') {
        totalIncome += tx.amount;
      } else {
        totalExpense += tx.amount;
        expensesByCategory[tx.category] = (expensesByCategory[tx.category] || 0) + tx.amount;
      }
    });

    return { totalIncome, totalExpense, balance: totalIncome - totalExpense, expensesByCategory };
  };

  const handleSendMessage = async (text: string) => {
    const newUserContent: Content = { role: 'user', parts: [{ text }] };
    const currentHistory = [...chatHistory, newUserContent];
    setChatHistory(currentHistory);
    setIsTyping(true);

    try {
      await processChatTurn(currentHistory);
    } catch (error) {
      console.error("Error calling Gemini:", error);
      setChatHistory(prev => [...prev, { role: 'model', parts: [{ text: "Lo siento, hubo un error al procesar tu solicitud." }] }]);
    } finally {
      setIsTyping(false);
    }
  };

  const processChatTurn = async (history: Content[]) => {
    const addTransactionDecl = {
      name: 'addTransaction',
      description: 'Registra un nuevo ingreso o gasto. Clasifica automáticamente la categoría si no se especifica.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, description: '"income" para ingresos, "expense" para gastos' },
          amount: { type: Type.NUMBER, description: 'El monto de la transacción' },
          category: { type: Type.STRING, description: 'La categoría (ej: comida, transporte, salario, ocio)' },
          date: { type: Type.STRING, description: 'Fecha en formato YYYY-MM-DD. Usa la fecha actual si no se especifica.' },
          description: { type: Type.STRING, description: 'Descripción breve de la transacción' }
        },
        required: ['type', 'amount', 'category', 'date', 'description']
      }
    };

    const getFinancialSummaryDecl = {
      name: 'getFinancialSummary',
      description: 'Obtiene un resumen de las finanzas actuales (ingresos, egresos, balance, gastos por categoría). Úsalo para responder preguntas sobre el estado financiero o para generar el dashboard.',
      parameters: {
        type: Type.OBJECT,
        properties: {},
      }
    };

    const getTransactionsDecl = {
      name: 'getTransactions',
      description: 'Obtiene la lista de transacciones. Puedes filtrar por categoría o fechas.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING, description: 'Filtrar por categoría (opcional)' },
          startDate: { type: Type.STRING, description: 'Fecha de inicio YYYY-MM-DD (opcional)' },
          endDate: { type: Type.STRING, description: 'Fecha de fin YYYY-MM-DD (opcional)' }
        }
      }
    };

    const systemInstruction = `Actúa como un experto en finanzas personales, contabilidad básica y análisis de ingresos y gastos.
Tu función es ayudar al usuario a registrar, clasificar y analizar sus ingresos y egresos.

Objetivos principales:
1. Registrar cada ingreso o gasto con monto, categoría, fecha y descripción.
2. Clasificar automáticamente los movimientos si el usuario no especifica categoría.
3. Generar un dashboard claro y actualizado cuando se te pida.
4. Responder consultas sobre gastos, balances, etc.
5. Responder de forma clara, breve y útil, como un asesor financiero profesional.

Reglas importantes:
- Si la información es ambigua, pide aclaración.
- Usa formato estructurado para mostrar resúmenes (tablas o listas claras).
- Prioriza la simplicidad visual y comprensión rápida.
- Sugiere mejoras financieras si detectas patrones negativos (ej: exceso de gastos en una categoría).
- Mantén un tono profesional pero amigable.
- Tienes acceso a herramientas para registrar transacciones y consultar datos. Úsalas siempre que sea necesario.
- La fecha actual es ${new Date().toISOString().split('T')[0]}.`;

    let currentHistory = [...history];
    let isDone = false;

    while (!isDone) {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: currentHistory,
        config: { 
          systemInstruction,
          tools: [{ functionDeclarations: [addTransactionDecl, getFinancialSummaryDecl, getTransactionsDecl] }]
        }
      });

      const messageContent = response.candidates?.[0]?.content;
      if (!messageContent) break;

      currentHistory.push(messageContent);

      if (response.functionCalls && response.functionCalls.length > 0) {
        const functionResponses: Part[] = [];
        
        for (const call of response.functionCalls) {
          if (call.name === 'addTransaction') {
            const args = call.args as any;
            const newTx: Transaction = {
              id: crypto.randomUUID(),
              type: args.type,
              amount: args.amount,
              category: args.category,
              date: args.date,
              description: args.description
            };
            setTransactions(prev => [...prev, newTx]);
            functionResponses.push({
              functionResponse: {
                name: call.name,
                response: { success: true, transaction: newTx }
              }
            });
          } else if (call.name === 'getFinancialSummary') {
            const summary = calculateSummary(transactionsRef.current);
            functionResponses.push({
              functionResponse: {
                name: call.name,
                response: summary as unknown as Record<string, unknown>
              }
            });
          } else if (call.name === 'getTransactions') {
            const args = call.args as any;
            let filtered = transactionsRef.current;
            if (args.category) {
              filtered = filtered.filter(t => t.category.toLowerCase() === args.category.toLowerCase());
            }
            if (args.startDate) {
              filtered = filtered.filter(t => t.date >= args.startDate);
            }
            if (args.endDate) {
              filtered = filtered.filter(t => t.date <= args.endDate);
            }
            functionResponses.push({
              functionResponse: {
                name: call.name,
                response: { transactions: filtered } as unknown as Record<string, unknown>
              }
            });
          }
        }

        const toolResponseContent: Content = { role: 'user', parts: functionResponses };
        currentHistory.push(toolResponseContent);
      } else {
        isDone = true;
      }
    }

    setChatHistory(currentHistory);
  };

  const summary = calculateSummary(transactions);

  const [currentDate, setCurrentDate] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b px-6 py-4 flex items-center justify-between shrink-0">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <span className="text-blue-600">Finanzas</span>IA
          </h1>
          <div className="text-sm font-medium text-gray-500 capitalize">
            {currentDate.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Dashboard summary={summary} transactions={transactions} />
        </main>
      </div>
      <aside className="w-96 bg-white border-l flex flex-col shrink-0">
        <Chat 
          history={chatHistory} 
          onSendMessage={handleSendMessage} 
          isTyping={isTyping} 
        />
      </aside>
    </div>
  );
}
