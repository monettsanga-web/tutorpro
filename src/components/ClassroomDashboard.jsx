import React, { useState } from 'react';
import { CosCloudIcon } from './CosCloudIcon.jsx';
import { WhiteboardSlides } from './WhiteboardSlides.jsx';
import { Mic, Clock, MessageSquare, Monitor, Wifi, Send } from 'lucide-react';

export const ClassroomDashboard = () => {
  const [activeSharedFile, setActiveSharedFile] = useState(null);
  const [studentStars, setStudentStars] = useState(12);
  const [chatMessages, setChatMessages] = useState([
    { id: '1', sender: 'System', text: 'Classroom successfully connected. Whiteboard initialized.', timestamp: '1:51 PM' },
    { id: '2', sender: 'Student', text: 'Hello teacher! Ready to learn!', timestamp: '1:52 PM' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTeacher, setIsTeacher] = useState(true);

  const bookingId = 'BK-10492';
  const supabaseUrl = 'https://your-supabase-project.supabase.co';
  const supabaseToken = 'mock-jwt-token';

  const handleShareDocument = (file) => {
    setActiveSharedFile(file);
    
    const newMsg = {
      id: Math.random().toString(),
      sender: 'System',
      text: `Now sharing courseware: ${file.name}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChatMessages(prev => [...prev, newMsg]);
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;

    const newMsg = {
      id: Math.random().toString(),
      sender: isTeacher ? 'Teacher' : 'Student',
      text: chatInput.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, newMsg]);
    setChatInput('');

    if (isTeacher) {
      setTimeout(() => {
        const studentResponses = [
          "Wow, that is awesome, Teacher!",
          "Yes! I can see the slides on my screen now.",
          "I will practice writing that sound.",
          "Thank you for the star! ⭐️"
        ];
        const randomResp = studentResponses[Math.floor(Math.random() * studentResponses.length)];
        
        setChatMessages(prev => [...prev, {
          id: Math.random().toString(),
          sender: 'Student',
          text: randomResp,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      }, 1500);
    }
  };

  const handleGiveStar = () => {
    setStudentStars(prev => prev + 1);
    
    setChatMessages(prev => [...prev, {
      id: Math.random().toString(),
      sender: 'System',
      text: 'Teacher awarded ⭐️ 1 Star to student Leo Chen!',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      
      {/* CLASSROOM TOP BAR */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between z-20 shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-blue-600 text-white px-2.5 py-1 rounded-lg font-bold text-sm tracking-wide">
            🎓 TutorPro <span className="text-blue-100 font-medium">English</span>
          </div>
          <div className="h-4 w-px bg-slate-800"></div>
          <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Class Active • Booking #{bookingId}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsTeacher(!isTeacher)}
            className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-2.5 py-1 rounded border border-slate-700"
          >
            Role: <span className={isTeacher ? 'text-blue-400' : 'text-amber-400'}>{isTeacher ? 'Teacher' : 'Student'}</span> (Toggle)
          </button>

          <div className="flex items-center gap-1.5 bg-slate-950/60 px-3 py-1 rounded-md border border-slate-800 text-xs font-semibold text-slate-300">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            <span>Time Remaining:</span>
            <span className="text-emerald-400 font-mono text-sm">24:59</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Wifi className="w-4 h-4 text-emerald-400" />
            <span>Ping: <span className="text-emerald-400 font-mono">12ms</span></span>
          </div>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT WHITEBOARD AREA */}
        <main className="flex-1 flex flex-col p-4 gap-3 overflow-hidden bg-slate-950">
          <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative flex flex-col">
            
            {/* Whiteboard Workspace Content */}
            <div className="flex-1 relative flex items-center justify-center bg-slate-950">
              {activeSharedFile ? (
                <div className="w-full h-full flex flex-col">
                  <WhiteboardSlides
                    fileId={activeSharedFile.id}
                    fileName={activeSharedFile.name}
                    fileUrl={activeSharedFile.url}
                    isTeacher={isTeacher}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-8 max-w-md select-none">
                  <div className="w-16 h-16 bg-blue-600/10 rounded-full flex items-center justify-center border border-blue-500/20 text-blue-400 mb-4 animate-pulse">
                    <Monitor className="w-8 h-8" />
                  </div>
                  <h2 className="text-lg font-bold text-white mb-2">Welcome to your TutorPro Classroom!</h2>
                  <p className="text-xs text-slate-400 leading-relaxed mb-6">
                    Whiteboard is currently empty. Click the Cloud Icon below to browse files uploaded to your secure Tencent COS storage and share them with the student.
                  </p>
                  
                  <div className="flex flex-col items-center gap-2">
                    <CosCloudIcon
                      bookingId={bookingId}
                      supabaseToken={supabaseToken}
                      supabaseUrl={supabaseUrl}
                      onShareDocument={handleShareDocument}
                      isTeacher={isTeacher}
                    />
                    <span className="text-[10px] text-slate-500">Tencent COS private integration</span>
                  </div>
                </div>
              )}
            </div>

            {activeSharedFile && (
              <div className="px-4 py-2 border-t border-slate-800 bg-slate-900 flex justify-end shrink-0 z-30">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium">Select another file:</span>
                  <CosCloudIcon
                    bookingId={bookingId}
                    supabaseToken={supabaseToken}
                    supabaseUrl={supabaseUrl}
                    onShareDocument={handleShareDocument}
                    isTeacher={isTeacher}
                  />
                </div>
              </div>
            )}

          </div>
        </main>

        {/* RIGHT SIDEBAR */}
        <aside className="w-80 border-l border-slate-800 bg-slate-900/40 p-4 flex flex-col gap-4 overflow-hidden shrink-0">
          
          <div className="flex flex-col gap-3">
            <div className="relative bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden aspect-[4/3] shadow-md">
              <div className="absolute inset-0 bg-slate-950 flex items-center justify-center">
                <div className="text-center">
                  <span className="text-4xl block mb-2">🧑‍🏫</span>
                  <p className="text-xs font-bold text-slate-300">Teacher Sarah (You)</p>
                  <p className="text-[10px] text-blue-400 font-medium">TutorPro Certified Educator</p>
                </div>
              </div>
              <div className="absolute bottom-2 left-2 bg-slate-950/80 px-2 py-0.5 rounded flex items-center gap-1.5 text-[10px] border border-slate-800">
                <Mic className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-300">Mic Active</span>
              </div>
            </div>

            <div className="relative bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden aspect-[4/3] shadow-md">
              <div className="absolute inset-0 bg-slate-950 flex items-center justify-center">
                <div className="text-center">
                  <span className="text-4xl block mb-2">🧒</span>
                  <p className="text-xs font-bold text-slate-300">Leo Chen</p>
                  <p className="text-[10px] text-slate-400">Classroom Student</p>
                </div>
              </div>
              <div className="absolute bottom-2 left-2 bg-slate-950/80 px-2 py-0.5 rounded flex items-center gap-1.5 text-[10px] border border-slate-800">
                <Mic className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-300">Leo Chen</span>
              </div>
              <div className="absolute top-2 right-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full">
                ⭐️ {studentStars} Stars
              </div>
            </div>
          </div>

          {isTeacher && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-md flex items-center justify-between gap-2.5">
              <div>
                <h4 className="text-xs font-bold text-white">Give Star Reward</h4>
                <p className="text-[10px] text-slate-400">Acknowledge student answers</p>
              </div>
              <button 
                onClick={handleGiveStar}
                className="bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-extrabold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 shadow-lg transition-transform active:scale-95"
              >
                ⭐️ Award Star
              </button>
            </div>
          )}

          <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-md flex flex-col min-h-[150px] overflow-hidden">
            <h4 className="text-xs font-bold text-slate-300 mb-2 border-b border-slate-800 pb-1.5 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-blue-500" />
              <span>Chat Log</span>
            </h4>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-[11px]">
              {chatMessages.map((msg) => (
                <div key={msg.id} className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                  <div className="flex justify-between text-[9px] text-slate-500 mb-0.5 font-semibold">
                    <span className={
                      msg.sender === 'Teacher' ? 'text-blue-400' : 
                      msg.sender === 'Student' ? 'text-amber-400' : 'text-slate-400'
                    }>
                      {msg.sender}
                    </span>
                    <span>{msg.timestamp}</span>
                  </div>
                  <p className="text-slate-300 leading-normal">{msg.text}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 flex gap-1.5 pt-2 border-t border-slate-800">
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendChat()}
                placeholder="Type lesson notes..." 
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              />
              <button 
                onClick={handleSendChat}
                className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </aside>

      </div>

    </div>
  );
};
