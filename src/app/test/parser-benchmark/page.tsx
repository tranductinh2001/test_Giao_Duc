"use client";

import { useState, useEffect } from "react";

interface BenchmarkResult {
  lessonPlanId: string;
  title: string;
  filename: string;
  mimeType: string;
  status: string;
  sectionsCount: number;
  activitiesCount: number;
  teacherActionsCount: number;
  studentActionsCount: number;
  productsCount: number;
  assessmentsCount: number;
  questionsCount: number;
  hasData: boolean;
  error?: string;
}

interface BenchmarkSummary {
  total: number;
  withData: number;
  totalSections: number;
  totalActivities: number;
  totalTeacherActions: number;
  totalStudentActions: number;
  totalProducts: number;
  totalAssessments: number;
  totalQuestions: number;
}

export default function ParserBenchmarkPage() {
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<BenchmarkResult[]>([]);
  const [summary, setSummary] = useState<BenchmarkSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pdf' | 'docx' | 'image'>('all');

  useEffect(() => {
    loadBenchmark();
  }, [filter]);

  const loadBenchmark = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/test/parser-benchmark?limit=50&mimeType=${filter}`);
      const data = await res.json();

      if (data.success) {
        setResults(data.results);
        setSummary(data.summary);
      } else {
        setError(data.message || 'Benchmark failed');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <h1 className="text-2xl font-bold mb-4">Parser Benchmark</h1>
        <div className="animate-pulse">Loading benchmark data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <h1 className="text-2xl font-bold mb-4">Parser Benchmark</h1>
        <div className="bg-red-900 p-4 rounded">{error}</div>
        <button
          onClick={loadBenchmark}
          className="mt-4 bg-blue-600 px-4 py-2 rounded"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Parser Benchmark</h1>
        <button
          onClick={loadBenchmark}
          className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6">
        {(['all', 'pdf', 'docx', 'image'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded ${filter === f ? 'bg-blue-600' : 'bg-gray-700'}`}
          >
            {f.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Summary */}
      {summary && (
        <div className="bg-gray-800 p-6 rounded mb-6">
          <h2 className="text-xl font-semibold mb-4">Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-gray-700 p-4 rounded">
              <div className="text-gray-400 text-sm">Total Files</div>
              <div className="text-2xl font-bold">{summary.total}</div>
            </div>
            <div className="bg-gray-700 p-4 rounded">
              <div className="text-gray-400 text-sm">With Data</div>
              <div className="text-2xl font-bold">{summary.withData}</div>
            </div>
            <div className="bg-gray-700 p-4 rounded">
              <div className="text-gray-400 text-sm">Total Sections</div>
              <div className="text-2xl font-bold">{summary.totalSections}</div>
            </div>
            <div className="bg-gray-700 p-4 rounded">
              <div className="text-gray-400 text-sm">Total Activities</div>
              <div className="text-2xl font-bold">{summary.totalActivities}</div>
            </div>
            <div className="bg-gray-700 p-4 rounded">
              <div className="text-gray-400 text-sm">Teacher Actions</div>
              <div className="text-2xl font-bold">{summary.totalTeacherActions}</div>
            </div>
            <div className="bg-gray-700 p-4 rounded">
              <div className="text-gray-400 text-sm">Student Actions</div>
              <div className="text-2xl font-bold">{summary.totalStudentActions}</div>
            </div>
            <div className="bg-gray-700 p-4 rounded">
              <div className="text-gray-400 text-sm">Products</div>
              <div className="text-2xl font-bold">{summary.totalProducts}</div>
            </div>
            <div className="bg-gray-700 p-4 rounded">
              <div className="text-gray-400 text-sm">Assessments</div>
              <div className="text-2xl font-bold">{summary.totalAssessments}</div>
            </div>
            <div className="bg-gray-700 p-4 rounded">
              <div className="text-gray-400 text-sm">Questions</div>
              <div className="text-2xl font-bold">{summary.totalQuestions}</div>
            </div>
          </div>
        </div>
      )}

      {/* Results Table */}
      <div className="bg-gray-800 rounded overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-4 py-2 text-left">File</th>
              <th className="px-4 py-2 text-left">Type</th>
              <th className="px-4 py-2 text-center">Sections</th>
              <th className="px-4 py-2 text-center">Activities</th>
              <th className="px-4 py-2 text-center">TA</th>
              <th className="px-4 py-2 text-center">SA</th>
              <th className="px-4 py-2 text-center">Products</th>
              <th className="px-4 py-2 text-center">Assess</th>
              <th className="px-4 py-2 text-center">Questions</th>
              <th className="px-4 py-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result) => (
              <tr key={result.lessonPlanId} className="border-t border-gray-700">
                <td className="px-4 py-2">
                  <div className="truncate max-w-xs" title={result.title}>
                    {result.title}
                  </div>
                </td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-1 rounded text-xs ${
                    result.mimeType?.includes('pdf') ? 'bg-red-900' :
                    result.mimeType?.includes('word') ? 'bg-blue-900' :
                    result.mimeType?.startsWith('image') ? 'bg-green-900' :
                    'bg-gray-600'
                  }`}>
                    {result.mimeType?.split('/').pop()?.substring(0, 8)}
                  </span>
                </td>
                <td className="px-4 py-2 text-center">{result.sectionsCount}</td>
                <td className="px-4 py-2 text-center">{result.activitiesCount}</td>
                <td className={`px-4 py-2 text-center ${result.teacherActionsCount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {result.teacherActionsCount}
                </td>
                <td className={`px-4 py-2 text-center ${result.studentActionsCount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {result.studentActionsCount}
                </td>
                <td className="px-4 py-2 text-center">{result.productsCount}</td>
                <td className="px-4 py-2 text-center">{result.assessmentsCount}</td>
                <td className="px-4 py-2 text-center">{result.questionsCount}</td>
                <td className="px-4 py-2 text-center">
                  {result.hasData ? (
                    <span className="text-green-400">✓</span>
                  ) : (
                    <span className="text-red-400">✗</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
