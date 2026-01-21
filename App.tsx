import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { storageService } from './services/storageService';
import { geminiService } from './services/geminiService';
import { Note, User, ViewState } from './types';
import { 
  Plus, 
  Trash2, 
  Search, 
  LogOut, 
  Sparkles, 
  X, 
  Save, 
  ChevronLeft,
  FileText,
  Tag,
  Loader2
} from './components/Icons';
import { Button, Input, Badge } from './components/UIComponents';

export default function App() {
  // --- State ---
  const [user, setUser] = useState<User | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [view, setView] = useState<ViewState>('LIST');
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  
  // Auth Form State
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [authUsername, setAuthUsername] = useState('');
  const [authError, setAuthError] = useState('');

  // Editor State
  const [editorTitle, setEditorTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [editorLabels, setEditorLabels] = useState<string[]>([]);
  const [editorLabelInput, setEditorLabelInput] = useState('');
  const [editorSummary, setEditorSummary] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);

  // --- Effects ---

  // Check for logged in user on mount (simulated session)
  useEffect(() => {
    const savedUserId = localStorage.getItem('gemini_notes_current_user_id');
    if (savedUserId) {
      const users = storageService.getUsers();
      const foundUser = users.find(u => u.id === savedUserId);
      if (foundUser) {
        setUser(foundUser);
        loadNotes(foundUser.id);
      }
    }
  }, []);

  const loadNotes = (userId: string) => {
    const loadedNotes = storageService.getNotes(userId);
    // Sort by updated recently
    loadedNotes.sort((a, b) => b.updatedAt - a.updatedAt);
    setNotes(loadedNotes);
  };

  // --- Auth Handlers ---

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (!authUsername.trim()) {
      setAuthError('Username is required');
      return;
    }

    if (authMode === 'LOGIN') {
      const existingUser = storageService.findUser(authUsername);
      if (existingUser) {
        loginUser(existingUser);
      } else {
        setAuthError('User not found. Please register.');
      }
    } else {
      if (storageService.findUser(authUsername)) {
        setAuthError('Username taken.');
        return;
      }
      const newUser: User = {
        id: crypto.randomUUID(),
        username: authUsername,
        createdAt: Date.now(),
      };
      storageService.saveUser(newUser);
      loginUser(newUser);
    }
  };

  const loginUser = (userData: User) => {
    setUser(userData);
    localStorage.setItem('gemini_notes_current_user_id', userData.id);
    loadNotes(userData.id);
    setAuthUsername('');
    setAuthError('');
  };

  const logout = () => {
    setUser(null);
    setNotes([]);
    setActiveNote(null);
    setView('LIST');
    localStorage.removeItem('gemini_notes_current_user_id');
  };

  // --- Note Logic ---

  const handleCreateNote = () => {
    resetEditor();
    setView('CREATE');
  };

  const handleEditNote = (note: Note) => {
    setActiveNote(note);
    setEditorTitle(note.title);
    setEditorContent(note.content);
    setEditorLabels(note.labels || []);
    setEditorSummary(note.aiSummary || '');
    setView('EDIT');
  };

  const resetEditor = () => {
    setActiveNote(null);
    setEditorTitle('');
    setEditorContent('');
    setEditorLabels([]);
    setEditorLabelInput('');
    setEditorSummary('');
  };

  const handleSaveNote = () => {
    if (!user) return;
    if (!editorTitle.trim() && !editorContent.trim()) {
      alert("Note must have a title or content");
      return;
    }

    const timestamp = Date.now();
    const noteToSave: Note = {
      id: activeNote ? activeNote.id : crypto.randomUUID(),
      userId: user.id,
      title: editorTitle || 'Untitled Note',
      content: editorContent,
      labels: editorLabels,
      aiSummary: editorSummary,
      createdAt: activeNote ? activeNote.createdAt : timestamp,
      updatedAt: timestamp,
    };

    storageService.saveNote(noteToSave);
    loadNotes(user.id);
    setView('LIST');
  };

  const handleDeleteNote = (noteId: string) => {
    if (window.confirm("Are you sure you want to delete this note permanently?")) {
      storageService.deleteNote(noteId);
      if (user) loadNotes(user.id);
      if (activeNote?.id === noteId) setView('LIST');
    }
  };

  const handleAddLabel = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && editorLabelInput.trim()) {
      e.preventDefault();
      if (!editorLabels.includes(editorLabelInput.trim())) {
        setEditorLabels([...editorLabels, editorLabelInput.trim()]);
      }
      setEditorLabelInput('');
    }
  };

  const removeLabel = (label: string) => {
    setEditorLabels(editorLabels.filter(l => l !== label));
  };

  // --- AI Summarization ---

  const handleSummarize = async () => {
    if (!editorContent.trim()) return;
    setIsSummarizing(true);
    const summary = await geminiService.summarizeNote(editorContent);
    setEditorSummary(summary);
    setIsSummarizing(false);
  };

  // --- Filtering ---
  
  const filteredNotes = useMemo(() => {
    return notes.filter(note => {
      const matchesSearch = (note.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             note.content.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesLabel = selectedLabel ? note.labels.includes(selectedLabel) : true;
      return matchesSearch && matchesLabel;
    });
  }, [notes, searchQuery, selectedLabel]);

  const allLabels = useMemo(() => {
    const labels = new Set<string>();
    notes.forEach(note => note.labels.forEach(l => labels.add(l)));
    return Array.from(labels);
  }, [notes]);


  // --- Render Functions ---

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Gemini Notes</h2>
            <p className="mt-2 text-sm text-gray-600">
              {authMode === 'LOGIN' ? 'Sign in to access your notes' : 'Create an account to get started'}
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleAuth}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="username" className="sr-only">Username</label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  required
                  placeholder="Username"
                  value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value)}
                />
              </div>
            </div>
            {authError && <p className="text-red-500 text-sm">{authError}</p>}
            <div>
              <Button type="submit" className="w-full">
                {authMode === 'LOGIN' ? 'Sign in' : 'Create account'}
              </Button>
            </div>
          </form>
          <div className="text-center">
            <button 
              onClick={() => {
                setAuthMode(authMode === 'LOGIN' ? 'REGISTER' : 'LOGIN');
                setAuthError('');
              }}
              className="text-indigo-600 hover:text-indigo-500 font-medium text-sm"
            >
              {authMode === 'LOGIN' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
           <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
             <Sparkles className="h-5 w-5 text-indigo-500" />
             Gemini Notes
           </h1>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4">
          <div className="px-4 mb-6">
            <Button onClick={handleCreateNote} className="w-full shadow-sm">
              <Plus className="mr-2 h-4 w-4" /> New Note
            </Button>
          </div>

          <nav className="px-2 space-y-1">
            <button
              onClick={() => setSelectedLabel(null)}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${!selectedLabel ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              <FileText className="mr-3 h-4 w-4" />
              All Notes
            </button>
            
            <div className="mt-8 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Labels
            </div>
            {allLabels.map(label => (
              <button
                key={label}
                onClick={() => setSelectedLabel(label === selectedLabel ? null : label)}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${selectedLabel === label ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                <Tag className="mr-3 h-4 w-4" />
                {label}
              </button>
            ))}
            {allLabels.length === 0 && (
              <div className="px-3 py-2 text-sm text-gray-400 italic">No labels yet</div>
            )}
          </nav>
        </div>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center mb-4">
             <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
               {user.username.charAt(0).toUpperCase()}
             </div>
             <span className="ml-3 text-sm font-medium text-gray-700 truncate">{user.username}</span>
          </div>
          <Button variant="ghost" onClick={logout} className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50">
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Mobile Header */}
        <div className="md:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between">
           <h1 className="text-lg font-bold text-gray-800">Gemini Notes</h1>
           <div className="flex gap-2">
             <Button variant="ghost" onClick={handleCreateNote} className="p-2">
               <Plus className="h-5 w-5" />
             </Button>
             <Button variant="ghost" onClick={logout} className="p-2 text-red-600">
               <LogOut className="h-5 w-5" />
             </Button>
           </div>
        </div>

        {/* Editor View */}
        {(view === 'EDIT' || view === 'CREATE') && (
          <div className="absolute inset-0 bg-white z-20 flex flex-col animate-in slide-in-from-bottom-4 duration-200">
            <header className="border-b border-gray-200 px-6 py-4 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0">
              <div className="flex items-center gap-3">
                <Button variant="ghost" onClick={() => setView('LIST')}>
                  <ChevronLeft className="h-5 w-5 mr-1" /> Back
                </Button>
              </div>
              <div className="flex items-center gap-2">
                {view === 'EDIT' && activeNote && (
                  <Button variant="ghost" onClick={() => handleDeleteNote(activeNote.id)} className="text-red-600 hover:bg-red-50">
                    <Trash2 className="h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Delete</span>
                  </Button>
                )}
                <Button onClick={handleSaveNote}>
                  <Save className="h-4 w-4 mr-2" /> Save
                </Button>
              </div>
            </header>
            
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-4xl mx-auto px-6 py-8">
                <input
                  type="text"
                  value={editorTitle}
                  onChange={(e) => setEditorTitle(e.target.value)}
                  placeholder="Note Title"
                  className="w-full text-4xl font-bold text-gray-900 placeholder-gray-300 border-none focus:ring-0 p-0 mb-6 bg-transparent"
                />
                
                {/* Labels Input */}
                <div className="flex flex-wrap items-center gap-2 mb-6">
                   {editorLabels.map(label => (
                     <Badge key={label} onRemove={() => removeLabel(label)}>{label}</Badge>
                   ))}
                   <div className="relative">
                     <Tag className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
                     <input
                       type="text"
                       value={editorLabelInput}
                       onChange={(e) => setEditorLabelInput(e.target.value)}
                       onKeyDown={handleAddLabel}
                       placeholder="Add label..."
                       className="pl-7 pr-3 py-1 text-sm border border-gray-200 rounded-full focus:outline-none focus:border-indigo-500 w-32 focus:w-48 transition-all"
                     />
                   </div>
                </div>

                {/* AI Summary Section */}
                <div className="mb-6 bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-indigo-900 flex items-center">
                      <Sparkles className="h-4 w-4 mr-2 text-indigo-600" />
                      AI Summary
                    </h3>
                    <Button 
                      variant="ghost" 
                      onClick={handleSummarize} 
                      isLoading={isSummarizing}
                      className="text-indigo-600 hover:bg-indigo-100 h-8 text-xs"
                    >
                      {editorSummary ? 'Regenerate' : 'Generate'}
                    </Button>
                  </div>
                  {isSummarizing ? (
                    <div className="text-sm text-indigo-400 flex items-center animate-pulse">
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Thinking...
                    </div>
                  ) : editorSummary ? (
                    <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {editorSummary}
                    </div>
                  ) : (
                    <div className="text-sm text-indigo-300 italic">
                      Click generate to summarize this note.
                    </div>
                  )}
                </div>

                <textarea
                  value={editorContent}
                  onChange={(e) => setEditorContent(e.target.value)}
                  placeholder="Start typing your note here..."
                  className="w-full h-[calc(100vh-400px)] resize-none text-lg text-gray-700 placeholder-gray-300 border-none focus:ring-0 p-0 bg-transparent leading-relaxed"
                />
              </div>
            </div>
          </div>
        )}

        {/* List View */}
        <div className="flex flex-col h-full">
          {/* Top Bar */}
          <header className="bg-white border-b border-gray-200 px-6 py-4">
             <div className="flex items-center max-w-5xl mx-auto">
               <div className="relative flex-1">
                 <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                 <input
                   type="text"
                   placeholder="Search notes..."
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50"
                 />
               </div>
               <div className="md:hidden ml-4">
                 <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-sm font-bold">
                   {user.username.charAt(0).toUpperCase()}
                 </div>
               </div>
             </div>
          </header>

          {/* Notes Grid */}
          <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
             <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredNotes.length === 0 ? (
                  <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
                    <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                      <FileText className="h-8 w-8 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">No notes found</h3>
                    <p className="mt-1 text-gray-500">
                      {searchQuery ? 'Try adjusting your search terms.' : 'Create your first note to get started!'}
                    </p>
                    {!searchQuery && (
                      <Button onClick={handleCreateNote} className="mt-6">
                        Create Note
                      </Button>
                    )}
                  </div>
                ) : (
                  filteredNotes.map(note => (
                    <div 
                      key={note.id} 
                      onClick={() => handleEditNote(note)}
                      className="group bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer flex flex-col h-64 overflow-hidden"
                    >
                      <div className="p-5 flex-1">
                        <h3 className="text-lg font-bold text-gray-900 mb-2 truncate group-hover:text-indigo-600 transition-colors">
                          {note.title}
                        </h3>
                        {note.labels.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {note.labels.slice(0, 3).map(label => (
                              <span key={label} className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                {label}
                              </span>
                            ))}
                            {note.labels.length > 3 && (
                              <span className="text-xs text-gray-400">+{note.labels.length - 3}</span>
                            )}
                          </div>
                        )}
                        <p className="text-sm text-gray-600 line-clamp-4">
                          {note.content || <span className="italic text-gray-400">No content</span>}
                        </p>
                      </div>
                      <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                         <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                         {note.aiSummary && (
                           <span className="flex items-center text-indigo-600" title="Has AI Summary">
                             <Sparkles className="h-3 w-3 mr-1" /> AI
                           </span>
                         )}
                      </div>
                    </div>
                  ))
                )}
             </div>
          </div>
        </div>
      </main>
    </div>
  );
}
