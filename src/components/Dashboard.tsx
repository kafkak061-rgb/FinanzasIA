import React from 'react';
import { FinancialSummary, Transaction } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { ArrowUpCircle, ArrowDownCircle, Wallet } from 'lucide-react';

interface DashboardProps {
  summary: FinancialSummary;
  transactions: Transaction[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

export default function Dashboard({ summary, transactions }: DashboardProps) {
  const chartData = Object.entries(summary.expensesByCategory).map(([name, value]) => ({
    name,
    value
  }));

  const recentTransactions = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-green-100 text-green-600 rounded-full">
            <ArrowUpCircle size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Ingresos Totales</p>
            <p className="text-2xl font-bold text-gray-900">${summary.totalIncome.toFixed(2)}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-red-100 text-red-600 rounded-full">
            <ArrowDownCircle size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Egresos Totales</p>
            <p className="text-2xl font-bold text-gray-900">${summary.totalExpense.toFixed(2)}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
            <Wallet size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Balance Actual</p>
            <p className={`text-2xl font-bold ${summary.balance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
              ${summary.balance.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Gastos por Categoría</h2>
          {chartData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              No hay gastos registrados
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Transacciones Recientes</h2>
          {recentTransactions.length > 0 ? (
            <div className="space-y-4">
              {recentTransactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${tx.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {tx.type === 'income' ? <ArrowUpCircle size={16} /> : <ArrowDownCircle size={16} />}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{tx.description}</p>
                      <p className="text-xs text-gray-500">{tx.category} • {tx.date}</p>
                    </div>
                  </div>
                  <p className={`font-bold ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.type === 'income' ? '+' : '-'}${tx.amount.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 pb-10">
              No hay transacciones recientes
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
