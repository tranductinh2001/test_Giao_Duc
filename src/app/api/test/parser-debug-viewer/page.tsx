"use client";

import { useState, useEffect } from "react";

interface DebugData {
  request?: {
    timestamp: number;
    hasVisionData: boolean;
    visionDataKeys: string[];
    visionDataStats: {
      sections: number;
      tables: number;
      pages: number;
      blocks: number;
      activities: number;
    };
    metadata: any;
  };
  prompt?: string;
  response?: any;
}

export default function ParserDebugViewer() {
  const [loading, setLoading] = useState(true);
  const [debugData, setDebugData] = useState<DebugData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'request' | 'prompt' | 'response'>('request');

  useEffect(() => {
    loadDebugData();
  }, []);

  const loadDebugData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/test/parser-debug-files?latest=true');
      const data = await res.json();

      if (data.success) {
        setDebugData({
          request: data.files?.request ? JSON.parse(data.files.request) : null,
          prompt: data.files?.prompt || null,
          response: data.files?.response ? JSON.parse(data.files.response) : null,
        });
      } else {
        setError('No debug data found. Run a workflow first.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load debug data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <h1 className="text-2xl font-bold mb-4">Parser Debug Viewer</h1>
        <div className="animate-pulse">Loading debug data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <h1 className="text-2xl font-bold mb-4">Parser Debug Viewer</h1>
        <div className="bg-red-900 p-4 rounded">{error}</div>
        <button
          onClick={loadDebugData}
          className="mt-4 bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!debugData) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <h1 className="text-2xl font-bold mb-4">Parser Debug Viewer</h1>
        <div className="text-gray-400">No debug data available</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Parser Debug Viewer</h1>
        <button
          onClick={loadDebugData}
          className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      {/* Request Stats */}
      {debugData.request && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-3">Request Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-gray-800 p-4 rounded">
              <div className="text-gray-400 text-sm">Sections</div>
              <div className="text-2xl font-bold">{debugData.request.visionDataStats.sections}</div>
            </div>
            <div className="bg-gray-800 p-4 rounded">
              <div className="text-gray-400 text-sm">Tables</div>
              <div className="text-2xl font-bold">{debugData.request.visionDataStats.tables}</div>
            </div>
            <div className="bg-gray-800 p-4 rounded">
              <div className="text-gray-400 text-sm">Pages</div>
              <div className="text-2xl font-bold">{debugData.request.visionDataStats.pages}</div>
            </div>
            <div className="bg-gray-800 p-4 rounded">
              <div className="text-gray-400 text-sm">Blocks</div>
              <div className="text-2xl font-bold">{debugData.request.visionDataStats.blocks}</div>
            </div>
            <div className="bg-gray-800 p-4 rounded">
              <div className="text-gray-400 text-sm">Activities</div>
              <div className="text-2xl font-bold">{debugData.request.visionDataStats.activities}</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('request')}
          className={`px-4 py-2 rounded ${activeTab === 'request' ? 'bg-blue-600' : 'bg-gray-700'}`}
        >
          Request JSON
        </button>
        <button
          onClick={() => setActiveTab('prompt')}
          className={`px-4 py-2 rounded ${activeTab === 'prompt' ? 'bg-blue-600' : 'bg-gray-700'}`}
        >
          Prompt
        </button>
        <button
          onClick={() => setActiveTab('response')}
          className={`px-4 py-2 rounded ${activeTab === 'response' ? 'bg-blue-600' : 'bg-gray-700'}`}
        >
          Response
        </button>
      </div>

      {/* Content */}
      <div className="bg-gray-800 p-4 rounded overflow-auto max-h-[600px]">
        {activeTab === 'request' && (
          <pre className="text-sm whitespace-pre-wrap">
            {JSON.stringify(debugData.request, null, 2)}
          </pre>
        )}
        {activeTab === 'prompt' && (
          <pre className="text-sm whitespace-pre-wrap">
            {debugData.prompt || 'No prompt saved'}
          </pre>
        )}
        {activeTab === 'response' && (
          <pre className="text-sm whitespace-pre-wrap">
            {debugData.response ? JSON.stringify(debugData.response, null, 2) : 'No response saved'}
          </pre>
        )}
      </div>
    </div>
  );
}
