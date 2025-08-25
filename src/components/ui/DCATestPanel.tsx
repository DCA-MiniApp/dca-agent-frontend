'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';

/**
 * Test Panel for DCA Chat Integration
 * 
 * This component helps test the integration between the front-end chat
 * and the DCA backend by providing quick test scenarios.
 */

interface TestResult {
  success: boolean;
  response?: string;
  error?: string;
  action?: string;
  data?: any;
}

export function DCATestPanel() {
  const { address, isConnected } = useAccount();
  const [isVisible, setIsVisible] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const testScenarios = [
    {
      name: 'Platform Stats',
      message: 'Show me platform statistics'
    },
    {
      name: 'Help Command',
      message: 'What can you help me with?'
    },
    {
      name: 'Show Plans (No Wallet)',
      message: 'Show my DCA plans'
    },
    {
      name: 'Create Strategy',
      message: 'I want to create a DCA strategy to invest 100 USDC into ETH every week for 12 weeks'
    },
    {
      name: 'Portfolio Check',
      message: 'Check my portfolio balance'
    }
  ];

  const runTest = async (scenario: typeof testScenarios[0]) => {
    setIsRunning(true);
    
    try {
      const response = await fetch('/api/dca-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: scenario.message,
          userAddress: address,
          conversationHistory: []
        }),
      });

      const result = await response.json();
      
      setTestResults(prev => [...prev, {
        success: result.success,
        response: result.response,
        error: result.error,
        action: result.action,
        data: result.data
      }]);
    } catch (error) {
      setTestResults(prev => [...prev, {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }]);
    }
    
    setIsRunning(false);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-purple-600 text-white px-3 py-2 rounded-lg shadow-lg text-sm hover:bg-purple-700 transition-colors z-50"
      >
        🧪 Test DCA Chat
      </button>
    );
  }

  return (
    <div className="fixed top-4 right-4 w-96 max-h-[80vh] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl overflow-hidden z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-sm">DCA Chat Test Panel</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          ✕
        </button>
      </div>

      {/* Connection Status */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
        <div className="flex items-center gap-2 text-xs">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span>
            Wallet: {isConnected ? `Connected (${address?.slice(0, 6)}...${address?.slice(-4)})` : 'Not Connected'}
          </span>
        </div>
      </div>

      {/* Test Scenarios */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-sm">Test Scenarios</h4>
          <div className="flex gap-2">
            <button
              onClick={clearResults}
              className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
              disabled={testResults.length === 0}
            >
              Clear
            </button>
          </div>
        </div>
        
        <div className="space-y-2">
          {testScenarios.map((scenario, index) => (
            <button
              key={index}
              onClick={() => runTest(scenario)}
              disabled={isRunning}
              className="w-full text-left p-2 text-xs bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded border border-blue-200 dark:border-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="font-medium text-blue-800 dark:text-blue-200">{scenario.name}</div>
              <div className="text-blue-600 dark:text-blue-400 mt-1">"{scenario.message}"</div>
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {testResults.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 max-h-64 overflow-y-auto">
          <div className="p-3">
            <h4 className="font-medium text-sm mb-2">Results ({testResults.length})</h4>
            <div className="space-y-2">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-2 rounded text-xs ${
                    result.success 
                      ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                      : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                  }`}
                >
                  <div className={`font-medium ${
                    result.success 
                      ? 'text-green-800 dark:text-green-200' 
                      : 'text-red-800 dark:text-red-200'
                  }`}>
                    {result.success ? '✅ Success' : '❌ Error'}
                  </div>
                  
                  {result.response && (
                    <div className="mt-1 text-gray-700 dark:text-gray-300">
                      <strong>Response:</strong> {result.response.slice(0, 100)}
                      {result.response.length > 100 && '...'}
                    </div>
                  )}
                  
                  {result.action && (
                    <div className="mt-1 text-blue-700 dark:text-blue-300">
                      <strong>Action:</strong> {result.action}
                    </div>
                  )}
                  
                  {result.error && (
                    <div className="mt-1 text-red-700 dark:text-red-300">
                      <strong>Error:</strong> {result.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {isRunning && (
        <div className="absolute inset-0 bg-white/50 dark:bg-gray-800/50 flex items-center justify-center">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            Running test...
          </div>
        </div>
      )}
    </div>
  );
}