import React, { createContext, useContext, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

const MobileNavContext = createContext();

export function MobileNavProvider({ children }) {
  const [tabStacks, setTabStacks] = useState({
    home: ['/'],
    feed: ['/Feed'],
    statuset: ['/Statuset'],
    messages: ['/Messages'],
    profile: ['/Profile']
  });
  const [activeTab, setActiveTab] = useState('home');
  const location = useLocation();

  const pushToTab = useCallback((tab, path) => {
    setTabStacks(prev => ({
      ...prev,
      [tab]: [...prev[tab], path]
    }));
    setActiveTab(tab);
  }, []);

  const popFromTab = useCallback((tab) => {
    setTabStacks(prev => ({
      ...prev,
      [tab]: prev[tab].length > 1 ? prev[tab].slice(0, -1) : prev[tab]
    }));
  }, []);

  const resetTab = useCallback((tab) => {
    const rootPaths = { home: '/', feed: '/Feed', statuset: '/Statuset', messages: '/Messages', profile: '/Profile' };
    setTabStacks(prev => ({
      ...prev,
      [tab]: [rootPaths[tab]]
    }));
    setActiveTab(tab);
  }, []);

  const switchTab = useCallback((tab) => {
    setActiveTab(tab);
  }, []);

  const value = {
    tabStacks,
    activeTab,
    pushToTab,
    popFromTab,
    resetTab,
    switchTab,
    currentStack: tabStacks[activeTab] || []
  };

  return (
    <MobileNavContext.Provider value={value}>
      {children}
    </MobileNavContext.Provider>
  );
}

export function useMobileNav() {
  const context = useContext(MobileNavContext);
  if (!context) {
    throw new Error('useMobileNav must be used within MobileNavProvider');
  }
  return context;
}