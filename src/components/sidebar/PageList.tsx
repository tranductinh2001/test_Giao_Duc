'use client';

import { useState } from 'react';
import { Page, Section, Activity } from '@/types/document';
import { Annotation } from '@/types/annotation';
import { FileText, Layers, AlertTriangle, AlertCircle, Compass, ChevronRight } from 'lucide-react';

interface PageListProps {
  pages: Page[];
  currentPage: number;
  annotations: Annotation[];
  sections?: Section[];
  activities?: Activity[];
  onPageSelect: (page: number) => void;
  onActivitySelect?: (activity: Activity) => void;
}

export default function PageList({
  pages,
  currentPage,
  annotations,
  sections = [],
  activities = [],
  onPageSelect,
  onActivitySelect,
}: PageListProps) {
  const [activeTab, setActiveTab] = useState<'pages' | 'outline'>('pages');
  const [filterWithIssuesOnly, setFilterWithIssuesOnly] = useState(false);

  const getPageAnnotations = (pageNum: number) => {
    return annotations.filter((a) => a.page === pageNum);
  };

  const hasHighSeverityIssue = (pageNum: number) => {
    const pageAnnos = getPageAnnotations(pageNum);
    return pageAnnos.some((a) => a.color.includes('FFEB') || a.color.includes('FFCD'));
  };

  const displayedPages = filterWithIssuesOnly
    ? pages.filter((p) => getPageAnnotations(p.pageNumber).length > 0)
    : pages;

  return (
    <div className="h-full flex flex-col bg-card border-r border-border select-none">
      {/* Top Segmented Tabs */}
      <div className="p-2 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex rounded-xl bg-muted p-1 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('pages')}
            className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all text-xs ${
              activeTab === 'pages'
                ? 'bg-card text-foreground shadow-xs font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Trang ({pages.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('outline')}
            className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all text-xs ${
              activeTab === 'outline'
                ? 'bg-card text-foreground shadow-xs font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Cấu trúc</span>
          </button>
        </div>
      </div>

      {/* Pages Tab View */}
      {activeTab === 'pages' && (
        <>
          <div className="px-3 py-2 border-b border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Danh sách trang</span>
            <button
              onClick={() => setFilterWithIssuesOnly(!filterWithIssuesOnly)}
              className={`px-2 py-0.5 rounded-md font-medium transition-colors text-[10px] ${
                filterWithIssuesOnly
                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                  : 'hover:bg-accent text-muted-foreground'
              }`}
            >
              {filterWithIssuesOnly ? 'Hiện tất cả' : 'Có nhận xét'}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
            {displayedPages.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                Không có trang nào có nhận xét
              </div>
            ) : (
              displayedPages.map((page) => {
                const pageAnnos = getPageAnnotations(page.pageNumber);
                const count = pageAnnos.length;
                const isActive = page.pageNumber === currentPage;
                const hasCritical = hasHighSeverityIssue(page.pageNumber);

                return (
                  <button
                    key={page.pageNumber}
                    onClick={() => onPageSelect(page.pageNumber)}
                    className={`w-full text-left p-2.5 rounded-xl text-xs transition-all relative border ${
                      isActive
                        ? 'bg-primary/10 border-primary/40 text-foreground shadow-xs ring-1 ring-primary/20'
                        : 'bg-card hover:bg-accent/60 border-border/60 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[11px] transition-colors ${
                            isActive
                              ? 'bg-primary text-primary-foreground shadow-xs'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {page.pageNumber}
                        </span>
                        <div className="flex flex-col">
                          <span className={`text-xs font-semibold ${isActive ? 'text-primary font-bold' : 'text-foreground'}`}>
                            Trang {page.pageNumber}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {page.width} × {page.height} pt
                          </span>
                        </div>
                      </div>

                      {count > 0 && (
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                            hasCritical
                              ? 'bg-destructive/10 text-destructive border border-destructive/20'
                              : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                          }`}
                          title={`${count} nhận xét`}
                        >
                          {hasCritical ? (
                            <AlertCircle className="w-2.5 h-2.5" />
                          ) : (
                            <AlertTriangle className="w-2.5 h-2.5" />
                          )}
                          {count}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Outline Tab View */}
      {activeTab === 'outline' && (
        <div className="flex-1 overflow-y-auto p-2 space-y-3 custom-scrollbar">
          {/* Activities */}
          {activities.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Layers className="w-3 h-3 text-primary" />
                <span>Hoạt Động Dạy Học</span>
              </div>
              <div className="mt-1 space-y-1">
                {activities.map((act) => (
                  <button
                    key={act.activityId}
                    onClick={() => {
                      onPageSelect(act.startPage);
                      if (onActivitySelect) onActivitySelect(act);
                    }}
                    className={`w-full text-left p-2 rounded-xl text-xs border transition-all flex items-start justify-between gap-2 ${
                      currentPage === act.startPage
                        ? 'bg-primary/10 border-primary/30 text-foreground font-semibold'
                        : 'bg-card hover:bg-accent/60 border-border/60 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate text-xs">
                        {act.title || act.type}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Trang {act.startPage} {act.duration ? `• ${act.duration}` : ''}
                      </p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sections */}
          {sections.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Compass className="w-3 h-3 text-primary" />
                <span>Các Phần Giáo Án</span>
              </div>
              <div className="mt-1 space-y-1">
                {sections.map((sec) => (
                  <button
                    key={sec.sectionId}
                    onClick={() => onPageSelect(sec.startPage)}
                    className="w-full text-left p-2 rounded-xl text-xs bg-card hover:bg-accent/60 border border-border/60 text-muted-foreground hover:text-foreground transition-all flex items-center justify-between"
                  >
                    <span className="font-medium truncate text-foreground">{sec.title}</span>
                    <span className="text-[10px] text-muted-foreground ml-1">Trang {sec.startPage}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
