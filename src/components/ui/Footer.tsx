import React from "react";
import { Tab } from "~/components/App";

interface FooterProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  showWallet?: boolean;
}

export const Footer: React.FC<FooterProps> = ({ activeTab, setActiveTab, showWallet = false }) => (
  <div className="fixed bottom-0 left-0 right-0 mx-4 mb-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border border-gray-200 dark:border-gray-700 px-3 py-3 rounded-2xl z-50">
    <div className="flex justify-around items-center h-16">
      <button
        onClick={() => setActiveTab(Tab.Home)}
        className={`flex flex-col items-center justify-center w-full h-full rounded-xl transition-all duration-200 ${
          activeTab === Tab.Home 
            ? 'bg-gradient-to-br from-blue-500/20 to-purple-600/20 text-blue-600 dark:text-blue-400' 
            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
        }`}
      >
        <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
          activeTab === Tab.Home 
            ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white' 
            : 'bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30'
        }`}>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
          </svg>
        </div>
        <span className="text-xs mt-1 font-medium">Home</span>
      </button>
      
      <button
        onClick={() => setActiveTab(Tab.Actions)}
        className={`flex flex-col items-center justify-center w-full h-full rounded-xl transition-all duration-200 ${
          activeTab === Tab.Actions 
            ? 'bg-gradient-to-br from-green-500/20 to-teal-600/20 text-green-600 dark:text-green-400' 
            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
        }`}
      >
        <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
          activeTab === Tab.Actions 
            ? 'bg-gradient-to-br from-green-500 to-teal-600 text-white shadow-sm' 
            : 'bg-gradient-to-br from-green-100 to-teal-100 dark:from-green-900/30 dark:to-teal-900/30'
        }`}>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
          </svg>
        </div>
        <span className="text-xs mt-1 font-medium">Chat</span>
      </button>
      
      <button
        onClick={() => setActiveTab(Tab.Context)}
        className={`flex flex-col items-center justify-center w-full h-full rounded-xl transition-all duration-200 ${
          activeTab === Tab.Context 
            ? 'bg-gradient-to-br from-orange-500/20 to-red-600/20 text-orange-600 dark:text-orange-400' 
            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
        }`}
      >
        <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
          activeTab === Tab.Context 
            ? 'bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-sm' 
            : 'bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30'
        }`}>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
          </svg>
        </div>
        <span className="text-xs mt-1 font-medium">History</span>
      </button>
      
      {showWallet && (
        <button
          onClick={() => setActiveTab(Tab.Wallet)}
          className={`flex flex-col items-center justify-center w-full h-full rounded-xl transition-all duration-200 ${
            activeTab === Tab.Wallet 
              ? 'bg-gradient-to-br from-purple-500/20 to-pink-600/20 text-purple-600 dark:text-purple-400' 
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
            activeTab === Tab.Wallet 
              ? 'bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-sm' 
              : 'bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30'
          }`}>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
          <span className="text-xs mt-1 font-medium">Profile</span>
        </button>
      )}
    </div>
  </div>
);
