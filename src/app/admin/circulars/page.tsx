"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Layers,
  FileText,
  Settings,
  Plus,
  Search,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Download,
} from "lucide-react";
import Button from "@/components/ui/button";
import toast from "react-hot-toast";

interface Circular {
  id: string;
  code: string;
  title: string;
  type: string;
  isActive: boolean;
  applicableLevel: string[];
  applicableSubjects: string[];
  _count?: {
    sectionRequirements: number;
    lessonPlans: number;
  };
}

export default function CircularsPage() {
  const [circulars, setCirculars] = useState<Circular[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchCirculars();
  }, []);

  const fetchCirculars = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/circulars");
      const data = await res.json();
      if (data.success) {
        setCirculars(data.data);
      }
    } catch (error) {
      console.error("Error fetching circulars:", error);
      toast.error("Loi khi tai danh sach cong van");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = async (circularId: string, circularCode: string) => {
    try {
      const res = await fetch(`/api/admin/templates/download?id=${circularId}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Download failed');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `template-${circularCode}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Tai template thanh cong');
    } catch (error) {
      console.error('Error downloading template:', error);
      toast.error(error instanceof Error ? error.message : 'Loi khi tai template');
    }
  };

  const filteredCirculars = circulars.filter(
    (c) =>
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTypeColor = (type: string) => {
    switch (type) {
      case "CURRICULUM":
        return "bg-primary/10 text-primary";
      case "REGULATION":
        return "bg-destructive/10 text-destructive";
      case "GUIDELINE":
        return "bg-success/10 text-success";
      case "STANDARD":
        return "bg-warning/10 text-warning";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Quan ly Cong van</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Cau hinh rules theo tung cong van
            </p>
          </div>
          <Link href="/admin/circulars/new">
            <Button variant="primary">
              <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              <span className="hidden sm:inline">Them Cong van</span>
              <span className="sm:hidden">Them</span>
            </Button>
          </Link>
        </div>

        {/* Search */}
        <div className="bg-card border border-border rounded-xl p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Tim kiem theo ma, tieu de..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-lg border border-border bg-background"
            />
          </div>
        </div>

        {/* List */}
        <div className="space-y-3">
          {filteredCirculars.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-8 sm:p-12 text-center">
              <Layers className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-base sm:text-lg font-semibold mb-2">
                {searchTerm ? "Khong tim thay cong van" : "Chua co cong van nao"}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchTerm
                  ? "Thu lai tu khoa khac"
                  : "Bat dau bang cach them cong van moi"}
              </p>
              <Link href="/admin/circulars/new">
                <Button variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Them Cong van
                </Button>
              </Link>
            </div>
          ) : (
            filteredCirculars.map((circular) => (
              <div
                key={circular.id}
                className="bg-card border border-border rounded-xl p-4 sm:p-6 hover:border-primary/50 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      circular.isActive ? "bg-primary/10" : "bg-muted"
                    }`}>
                      {circular.isActive ? (
                        <Layers className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                      ) : (
                        <Layers className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className={`text-base sm:text-lg font-semibold truncate ${
                          !circular.isActive ? "text-muted-foreground" : ""
                        }`}>
                          {circular.code}
                        </h3>
                        <span className={`text-xs px-2 py-0.5 rounded ${getTypeColor(circular.type)}`}>
                          {circular.type}
                        </span>
                        {circular.isActive ? (
                          <span className="flex items-center gap-1 text-xs text-success">
                            <CheckCircle className="w-3 h-3" />
                            Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <XCircle className="w-3 h-3" />
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className={`text-sm text-muted-foreground line-clamp-2 ${
                        !circular.isActive ? "text-muted-foreground/70" : ""
                      }`}>
                        {circular.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs text-muted-foreground">
                        {circular.applicableLevel.length > 0 && (
                          <span>Lop: {circular.applicableLevel.join(", ")}</span>
                        )}
                        {circular.applicableSubjects.length > 0 && (
                          <span>Mon: {circular.applicableSubjects.join(", ")}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 ml-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadTemplate(circular.id, circular.code)}
                    >
                      <Download className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Tai Mẫu</span>
                    </Button>
                    <Link href={`/admin/circulars/${circular.id}/rules`}>
                      <Button variant="outline" size="sm">
                        <Settings className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline">Cau hinh Rules</span>
                      </Button>
                    </Link>
                    <Link href={`/admin/circulars/${circular.id}`}>
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
