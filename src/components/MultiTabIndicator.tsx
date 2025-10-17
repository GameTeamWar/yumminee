"use client";

import React from 'react';
import { useMultiTabAuth } from '@/contexts/AuthContext';
import { Monitor, MonitorSpeaker } from 'lucide-react';

interface MultiTabIndicatorProps {
  className?: string;
}

const MultiTabIndicator: React.FC<MultiTabIndicatorProps> = ({ className = "" }) => {
  const { activeTabs } = useMultiTabAuth();

  if (activeTabs <= 1) {
    return null; // Tek sekme varsa gösterme
  }

  return (
    <div className={`flex items-center space-x-1 text-xs text-gray-500 ${className}`}>
      <Monitor className="h-3 w-3" />
      <span>{activeTabs} sekme aktif</span>
    </div>
  );
};

export default MultiTabIndicator;