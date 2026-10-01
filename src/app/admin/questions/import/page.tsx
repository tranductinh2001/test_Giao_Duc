"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Upload, FileText, ArrowLeft, CheckCircle, AlertCircle, X } from "lucide-react";
import Button from "@/components/ui/button";

interface Choice {
  content: string;
  isCorrect: boolean;
}

interface ParsedQuestion {
  content: string;
  explanation: string | null;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  categoryId: string;
  choices: Choice[];
}

export default function ImportPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [syntaxErrors, setSyntaxErrors] = useState<string[]>([]);
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/admin/categories?flat=true");
        const data = await res.json();
        if (data.success) {
          setCategories(data.data);
          if (data.data.length > 0) {
            setCategoryId(data.data[0].id);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchCategories();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError(null);
      setParsedQuestions([]);
      setSyntaxErrors([]);
      setSuccessMsg(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Vui lòng chọn tệp tin cần tải lên.");
      return;
    }
    if (!categoryId) {
      setError("Vui lòng chọn chuyên mục câu hỏi.");
      return;
    }

    setLoading(true);
    setError(null);
    setParsedQuestions([]);
    setSyntaxErrors([]);
    setSuccessMsg(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("categoryId", categoryId);

    try {
      const res = await fetch("/api/admin/questions/import", { method: "POST", body: formData });
      const data = await res.json();

      if (data.success) {
        setParsedQuestions(data.data.questions);
        setSyntaxErrors(data.data.errors);
        if (data.data.questions.length > 0 && data.data.errors.length === 0) {
          setSuccessMsg(`Bóc tách thành công ${data.data.questions.length} câu hỏi.`);
        }
      } else {
        setError(data.message || "Lỗi bóc tách file.");
      }
    } catch {
      setError("Không thể gửi dữ liệu đến máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditQuestionField = (qIdx: number, field: keyof ParsedQuestion, val: any) => {
    const updated = [...parsedQuestions];
    (updated[qIdx] as any)[field] = val;
    setParsedQuestions(updated);
  };

  const handleEditChoiceField = (qIdx: number, cIdx: number, field: keyof Choice, val: any) => {
    const updated = [...parsedQuestions];
    if (field === "isCorrect") {
      updated[qIdx].choices.forEach((c, idx) => {
        c.isCorrect = idx === cIdx;
      });
    } else {
      updated[qIdx].choices[cIdx].content = val;
    }
    setParsedQuestions(updated);
  };

  const handleConfirmSave = async () => {
    if (parsedQuestions.length === 0) return;

    setSaveLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/admin/questions/import/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: parsedQuestions }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccessMsg(data.message);
        setParsedQuestions([]);
        setFile(null);
        setTimeout(() => {
          router.push("/admin/questions");
        }, 2000);
      } else {
        setError(data.message || "Lỗi lưu dữ liệu.");
      }
    } catch {
      setError("Không thể gửi yêu cầu lưu.");
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/questions"
          className="flex items-center justify-center w-10 h-10 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Nhập Câu Hỏi
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Bóc tách từ file Word (.docx) hoặc Excel (.xlsx)
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Upload Form */}
        <div className="lg:col-span-1">
          <form onSubmit={handleUpload} className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
              Cấu hình nhập file
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Chuyên mục nhập vào
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Tệp tin dữ liệu
                </label>
                <div className="relative border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-blue-500 dark:hover:border-blue-600 rounded-xl p-6 transition-colors cursor-pointer">
                  <input
                    type="file"
                    required
                    accept=".docx,.xlsx,.xls,.json"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="text-center space-y-2">
                    <Upload className="w-8 h-8 mx-auto text-zinc-400" />
                    <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                      {file ? file.name : "Kéo thả hoặc nhấp để chọn file"}
                    </p>
                    <p className="text-xs text-zinc-500">
                      .docx, .xlsx, .json
                    </p>
                  </div>
                </div>
              </div>

              <Button type="submit" disabled={loading || !file} isLoading={loading} className="w-full">
                {loading ? "Đang phân tích..." : "Phân tích cú pháp"}
              </Button>
            </div>
          </form>

          {/* Instructions */}
          <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
              Hướng dẫn định dạng
            </h3>
            <div className="space-y-3 text-xs text-zinc-600 dark:text-zinc-400">
              <div>
                <p className="font-medium mb-1">File Word (.docx):</p>
                <ul className="space-y-0.5 pl-3 list-disc">
                  <li><code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">Câu [Số]: [Nội dung]</code></li>
                  <li><code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">A.</code> <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">B.</code> <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">C.</code> <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">D.</code></li>
                  <li><code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">Đáp án đúng: A</code></li>
                </ul>
              </div>
              <div>
                <p className="font-medium mb-1">File Excel (.xlsx):</p>
                <p>Các cột: No, QuestionContent, ChoiceA, ChoiceB, ChoiceC, ChoiceD, CorrectAnswer, Explanation, Difficulty</p>
              </div>
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-4">
          {error && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 dark:hover:bg-red-900/50 rounded">
                <X className="w-4 h-4 text-red-400" />
              </button>
            </div>
          )}

          {successMsg && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{successMsg}</p>
            </div>
          )}

          {syntaxErrors.length > 0 && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 p-4">
              <h3 className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-2">
                Cảnh báo ({syntaxErrors.length})
              </h3>
              <ul className="text-xs text-amber-700 dark:text-amber-500 space-y-1 list-disc list-inside">
                {syntaxErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Preview Table */}
          {parsedQuestions.length > 0 && (
            <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                    Bảng xem trước ({parsedQuestions.length} câu)
                  </h3>
                  <p className="text-xs text-zinc-500">Nhấp để chỉnh sửa nội dung</p>
                </div>
                <Button onClick={handleConfirmSave} disabled={saveLoading} isLoading={saveLoading}>
                  Xác nhận lưu {parsedQuestions.length} câu
                </Button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
                {parsedQuestions.map((q, qIdx) => (
                  <div key={qIdx} className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                        CÂU {qIdx + 1}
                      </span>
                      <select
                        value={q.difficulty}
                        onChange={(e) => handleEditQuestionField(qIdx, "difficulty", e.target.value)}
                        className="px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 text-xs"
                      >
                        <option value="EASY">Dễ</option>
                        <option value="MEDIUM">Trung bình</option>
                        <option value="HARD">Khó</option>
                      </select>
                    </div>

                    <textarea
                      rows={2}
                      value={q.content.replace(/<br\s*\/?>/gi, "\n")}
                      onChange={(e) => handleEditQuestionField(qIdx, "content", e.target.value.replace(/\n/g, "<br/>"))}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:border-blue-500"
                    />

                    <div className="grid grid-cols-2 gap-2">
                      {q.choices.map((c, cIdx) => (
                        <div key={cIdx} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct-import-${qIdx}`}
                            checked={c.isCorrect}
                            onChange={() => handleEditChoiceField(qIdx, cIdx, "isCorrect", true)}
                            className="w-4 h-4"
                          />
                          <span className="text-xs font-mono text-zinc-500">{String.fromCharCode(65 + cIdx)}.</span>
                          <input
                            type="text"
                            value={c.content}
                            onChange={(e) => handleEditChoiceField(qIdx, cIdx, "content", e.target.value)}
                            className="flex-1 px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 text-xs bg-white dark:bg-zinc-900"
                          />
                        </div>
                      ))}
                    </div>

                    <input
                      type="text"
                      value={q.explanation || ""}
                      onChange={(e) => handleEditQuestionField(qIdx, "explanation", e.target.value || null)}
                      placeholder="Giải thích..."
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {parsedQuestions.length === 0 && !loading && !error && !successMsg && (
            <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 mb-4">
                <FileText className="h-8 w-8 text-zinc-400" />
              </div>
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Chọn file để bắt đầu
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
