import React from 'react';
import { motion } from 'motion/react';
import { BarChart3, TrendingUp, DollarSign, Users, Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function AdminAnalytics() {
  const analyticsData = [
    { day: 'Mon', received: 45000, sent: 12000 },
    { day: 'Tue', received: 52000, sent: 18000 },
    { day: 'Wed', received: 38000, sent: 15000 },
    { day: 'Thu', received: 65000, sent: 22000 },
    { day: 'Fri', received: 89000, sent: 30000 },
    { day: 'Sat', received: 74000, sent: 25000 },
    { day: 'Sun', received: 95000, sent: 35000 },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Platform Analytics</h1>
        <p className="text-neutral-400 text-sm mt-1">Deep dive into financial inflows, outflows, and user activity metrics.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-xl">
          <h2 className="text-xl font-bold text-white mb-2">Weekly Cash Flow Analysis</h2>
          <p className="text-neutral-400 text-sm mb-6">Comparison of money received vs money sent</p>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analyticsData}>
                <defs>
                  <linearGradient id="colorRec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#737373" />
                <YAxis stroke="#737373" tickFormatter={(v) => `₹${v/1000}k`} />
                <Tooltip contentStyle={{ backgroundColor: '#121212', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '1rem', color: '#fff' }} />
                <Area type="monotone" dataKey="received" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRec)" name="Received" />
                <Area type="monotone" dataKey="sent" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorSent)" name="Sent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-xl">
          <h2 className="text-xl font-bold text-white mb-2">Daily Transaction Volume</h2>
          <p className="text-neutral-400 text-sm mb-6">Total volume processed across days</p>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analyticsData}>
                <XAxis dataKey="day" stroke="#737373" />
                <YAxis stroke="#737373" tickFormatter={(v) => `₹${v/1000}k`} />
                <Tooltip contentStyle={{ backgroundColor: '#121212', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '1rem', color: '#fff' }} />
                <Bar dataKey="received" fill="#10b981" radius={[8, 8, 0, 0]} name="Received" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
