import { useState, useRef } from 'react';
import { Upload, FileText, Play, Loader2, X, Download, Search } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { runFormuLensAnalysis } from './lib/gemini';
import { cn } from './lib/utils';

type AppState = 'input' | 'confirm' | 'running' | 'results';

const markdownComponents = {
  table: ({node, ...props}: any) => (
    <div className="table-wrapper">
      <table {...props} />
    </div>
  )
};

export default function App() {
  const [appState, setAppState] = useState<AppState>('input');
  const [topic, setTopic] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadClick = () => {
    if (!topic.trim()) {
      setError('Please enter a research topic first.');
      return;
    }
    if (files.length === 0) {
      setError('Please upload at least one paper.');
      return;
    }
    setError('');
    setAppState('confirm');
  };

  const handleRun = async () => {
    setAppState('running');
    setResults('');
    setError('');
    
    try {
      await runFormuLensAnalysis(topic, files, (chunk) => {
        setResults((prev) => prev + chunk);
      });
      setAppState('results');
    } catch (err: any) {
      setError(err.message || 'An error occurred during analysis.');
      setAppState('confirm');
    }
  };

  const reset = () => {
    setAppState('input');
    setTopic('');
    setFiles([]);
    setResults('');
    setError('');
  };

  const handleDownload = () => {
    const blob = new Blob([results], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeTopic = topic.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'report';
    a.download = `FormuLens_Analysis_${safeTopic}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-zinc-800">
      {/* Header */}
      <header className="border-b border-zinc-800/50 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-100 font-bold tracking-tight">
            {appState !== 'input' && <span>FORMULENS</span>}
          </div>
          {appState === 'results' && (
            <div className="flex items-center gap-6">
              <button 
                onClick={handleDownload}
                className="text-sm flex items-center gap-2 text-zinc-400 hover:text-zinc-100 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download .md
              </button>
              <button 
                onClick={reset}
                className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
              >
                New Analysis
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {appState === 'input' && (
          <div className="max-w-3xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-4 text-center mb-12 mt-8">
              <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-zinc-50">
                FORMULENS
              </h1>
              <p className="text-xs md:text-sm tracking-[0.3em] text-zinc-400 uppercase font-medium">
                Research Analysis Engine
              </p>
            </div>

            <div className="space-y-8 bg-zinc-900/20 border border-zinc-800/40 backdrop-blur-xl rounded-3xl p-8 md:p-10 shadow-2xl">
              <div className="space-y-3">
                <label className="text-xs font-bold tracking-widest text-zinc-500 uppercase ml-1">Research Topic</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="w-5 h-5 text-zinc-600 group-focus-within:text-zinc-400 transition-colors" />
                  </div>
                  <input
                    type="text"
                    placeholder="e.g., Solid lipid nanoparticles for dermal delivery..."
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full bg-zinc-950/50 border border-zinc-800/60 rounded-xl pl-12 pr-4 py-4 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all text-lg shadow-inner"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-xs font-bold tracking-widest text-zinc-500 uppercase">Source Papers</label>
                  <span className="text-xs text-zinc-600 font-mono">PDF, TXT</span>
                </div>
                
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border border-dashed border-zinc-700/50 bg-zinc-950/20 hover:bg-zinc-900/50 hover:border-zinc-600 transition-all duration-300 rounded-2xl p-10 text-center cursor-pointer group flex flex-col items-center justify-center gap-4"
                >
                  <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:scale-110 group-hover:border-zinc-700 transition-all duration-300 shadow-lg">
                    <Upload className="w-6 h-6 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-base font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors">Click to upload or drag and drop</p>
                    <p className="text-sm text-zinc-600">Multiple files supported</p>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    multiple 
                    accept=".pdf,.txt"
                    className="hidden" 
                  />
                </div>
                
                {files.length > 0 && (
                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {files.map((file, i) => (
                      <div key={i} className="flex items-center justify-between bg-zinc-900/50 border border-zinc-800/60 rounded-xl px-4 py-3 group hover:border-zinc-700 transition-colors">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="p-2 bg-zinc-800/50 rounded-lg shrink-0">
                            <FileText className="w-4 h-4 text-zinc-400" />
                          </div>
                          <div className="flex flex-col overflow-hidden">
                            <span className="text-sm font-medium text-zinc-200 truncate">{file.name}</span>
                            <span className="text-xs text-zinc-500 font-mono">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                          </div>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(i);
                          }}
                          className="text-zinc-500 hover:text-red-400 p-2 hover:bg-red-400/10 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  <p className="text-red-400 text-sm font-medium">{error}</p>
                </div>
              )}

              <div className="pt-4">
                <button
                  onClick={handleUploadClick}
                  className="w-full bg-zinc-100 text-zinc-950 font-bold text-lg rounded-xl px-4 py-4 hover:bg-white hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all duration-300 flex items-center justify-center gap-2"
                >
                  Initialize Analysis
                </button>
              </div>
            </div>
          </div>
        )}

        {appState === 'confirm' && (
          <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-8 space-y-8">
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-zinc-100 border-b border-zinc-800 pb-4">
                  Confirm Analysis
                </h2>
                
                <div className="space-y-1">
                  <p className="text-sm text-zinc-500 uppercase tracking-wider font-medium">Topic</p>
                  <p className="text-zinc-200 text-lg">{topic}</p>
                </div>

                <div className="space-y-3">
                  <p className="text-sm text-zinc-500 uppercase tracking-wider font-medium">Detected Papers ({files.length})</p>
                  <ul className="space-y-2">
                    {files.map((file, i) => (
                      <li key={i} className="flex items-center gap-3 text-zinc-300">
                        <FileText className="w-4 h-4 text-zinc-500" />
                        {file.name}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <div className="flex gap-4 pt-4 border-t border-zinc-800">
                <button
                  onClick={() => setAppState('input')}
                  className="px-6 py-3 rounded-lg font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleRun}
                  className="flex-1 bg-zinc-100 text-zinc-950 font-medium rounded-lg px-6 py-3 hover:bg-white transition-colors flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Run Analysis
                </button>
              </div>
            </div>
          </div>
        )}

        {(appState === 'running' || appState === 'results') && (
          <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
            {appState === 'running' && !results && (
              <div className="flex flex-col items-center justify-center py-24 space-y-4">
                <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
                <p className="text-zinc-400 font-medium animate-pulse">FormuLens is analyzing papers...</p>
              </div>
            )}

            {results && (
              <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-8 md:p-12 shadow-2xl">
                <div className="markdown-body">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={markdownComponents}
                  >
                    {results}
                  </ReactMarkdown>
                </div>
                {appState === 'running' && (
                  <div className="mt-8 flex items-center gap-3 text-zinc-500 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating insights...
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
