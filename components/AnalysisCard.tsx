
import React, { ReactNode } from 'react';

interface AnalysisCardProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}

const AnalysisCard: React.FC<AnalysisCardProps> = ({ title, icon, children, className = '' }) => {
  return (
    <div className={`bg-slate-900/40 border border-slate-800 rounded-[2rem] p-8 hover:border-slate-700/50 transition-all duration-300 shadow-sm relative overflow-hidden group ${className}`}>
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-slate-800/80 rounded-2xl group-hover:scale-110 transition-transform duration-500">
          {icon}
        </div>
        <h3 className="font-black text-xl text-white tracking-tight uppercase">{title}</h3>
      </div>
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default AnalysisCard;
