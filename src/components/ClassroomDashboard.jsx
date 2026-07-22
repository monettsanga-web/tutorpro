import React, { useState } from 'react';
import { CosCloudIcon } from './CosCloudIcon.jsx';
import { WhiteboardSlides } from './WhiteboardSlides.jsx';
import { SafeSlidesErrorBoundary } from './WhiteboardSlides.jsx';
import { Mic, Clock, MessageSquare, Monitor, Wifi, Send, Award, Video, VideoOff, Users, ArrowLeft, Shield } from 'lucide-react';

export const ClassroomDashboard = ({ onExit }) => {
  const [activeSharedFile, setActiveSharedFile] = useState(null);
  const [studentStars, setStudentStars] = useState(12);
  const [chatMessages, setChatMessages] = useState([
    { id: '1', sender: 'System', text: 'Classroom successfully connected. Whiteboard initialized.', timestamp: '1:51 PM' },
    { id: '2', sender: 'Student', text: 'Hello teacher! Ready to learn!', timestamp: '1:52 PM' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTeacher, setIsTeacher] = useState(true);

  const bookingId = 'BK-10492';
  const supabaseUrl = 'https://losmkvvwzijipqrlelyt.supabase.co';
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
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      background: '#090510',
      color: '#fff',
      overflow: 'hidden',
      fontFamily: 'sans-serif',
      boxSizing: 'border-box'
    }}>
      
      {/* CLASSROOM TOP BAR */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        background: '#130a25',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        zIndex: 20,
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button 
            onClick={onExit}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255,255,255,0.05)',
              color: '#b9adc7',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '0.72rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <ArrowLeft style={{ width: '13px', height: '13px' }} />
            Exit Mode
          </button>
          <div style={{ height: '16px', width: '1px', background: 'rgba(255,255,255,0.15)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(188,233,78,0.1)', color: '#dafa8d', border: '1px solid rgba(188,233,78,0.2)', padding: '4px 12px', borderRadius: '16px', fontSize: '0.7rem', fontWeight: '800' }}>
            <span style={{ display: 'inline-block', width: '6px', height: '6px', background: '#bce94e', borderRadius: '50%' }} />
            TutorPro Google Classroom • Booking #{bookingId}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Simulation Toggle */}
          <button 
            onClick={() => setIsTeacher(!isTeacher)}
            style={{
              fontSize: '0.7rem',
              background: '#1c0e2d',
              color: '#b9adc7',
              fontWeight: 'bold',
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)',
              cursor: 'pointer'
            }}
          >
            Active View: <span style={{ color: isTeacher ? '#3b82f6' : '#f59e0b' }}>{isTeacher ? 'Teacher' : 'Student'}</span> (Toggle)
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '6px 14px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 'bold' }}>
            <Clock style={{ width: '14px', height: '14px', color: '#bce94e' }} />
            <span style={{ color: '#b9adc7' }}>Timer:</span>
            <span style={{ color: '#10b981', fontFamily: 'monospace', fontSize: '0.8rem' }}>24:59</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: '#b9adc7' }}>
            <Wifi style={{ width: '15px', height: '15px', color: '#10b981' }} />
            <span>Ping: <span style={{ color: '#10b981', fontFamily: 'monospace' }}>12ms</span></span>
          </div>
        </div>
      </header>

      {/* MAIN VIEWPORT LAYOUT */}
      <div style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}>
        
        {/* LEFT WORKSPACE (Whiteboard Slides Presenter) */}
        <main style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '16px',
          gap: '12px',
          overflow: 'hidden',
          boxSizing: 'border-box'
        }}>
          <div style={{
            flex: 1,
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '16px',
            overflow: 'hidden',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box'
          }}>
            
            <div style={{ flex: 1, position: 'relative', display: 'flex', background: '#07030e' }}>
              {activeSharedFile ? (
                <div style={{ width: '100%', height: '100%' }}>
                  <SafeSlidesErrorBoundary>
                    <WhiteboardSlides
                      fileId={activeSharedFile.id}
                      fileName={activeSharedFile.name}
                      fileUrl={activeSharedFile.url}
                      isTeacher={isTeacher}
                    />
                  </SafeSlidesErrorBoundary>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '32px', textAlign: 'center', boxSizing: 'border-box' }}>
                  <div style={{ width: '64px', height: '64px', background: 'rgba(188,233,78,0.1)', color: '#bce94e', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(188,233,78,0.2)', marginBottom: '16px' }}>
                    <Monitor style={{ width: '28px', height: '28px' }} />
                  </div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff', margin: '0 0 8px 0' }}>Welcome to your Google Classroom!</h2>
                  <p style={{ fontSize: '0.78rem', color: '#b9adc7', maxWidth: '380px', lineHeight: '1.4', margin: '0 0 24px 0' }}>
                    whiteboard workspace is currently empty. Open the COS cloud files browser below to select courseware, slides, or workbook PDFs to present on screen!
                  </p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%' }}>
                    <CosCloudIcon
                      bookingId={bookingId}
                      supabaseToken={supabaseToken}
                      supabaseUrl={supabaseUrl}
                      onShareDocument={handleShareDocument}
                      isTeacher={isTeacher}
                    />
                    <span style={{ fontSize: '0.62rem', color: '#b9adc7' }}>Tencent COS Cloud integration</span>
                  </div>
                </div>
              )}
            </div>

            {/* Whiteboard Footer Actions */}
            {activeSharedFile && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 16px',
                background: '#130a25',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                boxSizing: 'border-box',
                zIndex: 30
              }}>
                <span style={{ fontSize: '0.68rem', color: '#b9adc7', fontWeight: 'bold' }}>Active Courseware: {activeSharedFile.name}</span>
                <CosCloudIcon
                  bookingId={bookingId}
                  supabaseToken={supabaseToken}
                  supabaseUrl={supabaseUrl}
                  onShareDocument={handleShareDocument}
                  isTeacher={isTeacher}
                />
              </div>
            )}

          </div>
        </main>

        {/* RIGHT SIDEBAR (Camera, star, chat panel) */}
        <aside style={{
          width: '320px',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(19, 10, 37, 0.4)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          overflow: 'hidden',
          shrink: '0',
          boxSizing: 'border-box'
        }}>
          
          {/* CAMERA FEED WINDOWS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* TEACHER CAMERA */}
            <div style={{
              position: 'relative',
              background: '#07030e',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
              overflow: 'hidden',
              aspectRatio: '4/3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }}>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '6px' }}>🧑‍🏫</span>
                <strong style={{ fontSize: '0.75rem', color: '#fff', display: 'block' }}>Teacher Sarah (You)</strong>
                <span style={{ fontSize: '0.58rem', color: '#bce94e', fontWeight: 'bold' }}>TutorPro Educator</span>
              </div>
              <div style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(0,0,0,0.6)', padding: '3px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.58rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                <Mic style={{ width: '10px', height: '10px', color: '#10b981' }} />
                <span>Mic Active</span>
              </div>
            </div>

            {/* STUDENT CAMERA */}
            <div style={{
              position: 'relative',
              background: '#07030e',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
              overflow: 'hidden',
              aspectRatio: '4/3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }}>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '6px' }}>🧒</span>
                <strong style={{ fontSize: '0.75rem', color: '#fff', display: 'block' }}>Leo Chen</strong>
                <span style={{ fontSize: '0.58rem', color: '#b9adc7' }}>Beijing Student</span>
              </div>
              <div style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(0,0,0,0.6)', padding: '3px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.58rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                <Mic style={{ width: '10px', height: '10px', color: '#10b981' }} />
                <span>Leo Chen</span>
              </div>
              <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(188,233,78,0.1)', color: '#bce94e', border: '1px solid rgba(188,233,78,0.2)', padding: '2px 8px', borderRadius: '10px', fontSize: '0.58rem', fontWeight: 'bold' }}>
                ⭐️ {studentStars} Stars
              </div>
            </div>
          </div>

          {/* REWARDS MODULE */}
          {isTeacher && (
            <div style={{
              background: '#130a25',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              boxSizing: 'border-box'
            }}>
              <div>
                <h4 style={{ fontSize: '0.72rem', fontWeight: 'bold', margin: '0 0 2px 0', color: '#fff' }}>Reward Leo Chen</h4>
                <p style={{ fontSize: '0.58rem', color: '#b9adc7', margin: '0' }}>Award stars for good responses</p>
              </div>
              <button 
                onClick={handleGiveStar}
                style={{
                  background: 'linear-gradient(to right, #dafa8d, #bce94e)',
                  color: '#090510',
                  fontWeight: '850',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '6px 12px',
                  fontSize: '0.65rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  boxShadow: '0 4px 12px rgba(188,233,78,0.15)'
                }}
              >
                ⭐️ Award
              </button>
            </div>
          )}

          {/* CLASSROOM CHAT */}
          <div style={{
            flex: 1,
            background: '#130a25',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxSizing: 'border-box'
          }}>
            <h4 style={{ fontSize: '0.72rem', fontWeight: 'bold', margin: '0 0 10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MessageSquare style={{ width: '13px', height: '13px', color: '#bce94e' }} />
              <span>Chat & Logs</span>
            </h4>

            {/* Messages container */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
              {chatMessages.map((msg) => (
                <div key={msg.id} style={{ background: 'rgba(0,0,0,0.18)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.58rem', fontWeight: 'bold', marginBottom: '3px' }}>
                    <span style={{ color: msg.sender === 'Teacher' ? '#3b82f6' : msg.sender === 'Student' ? '#f59e0b' : '#b9adc7' }}>
                      {msg.sender}
                    </span>
                    <span style={{ color: '#b9adc7' }}>{msg.timestamp}</span>
                  </div>
                  <p style={{ fontSize: '0.68rem', color: '#cbd5e1', margin: '0', lineHeight: '1.3' }}>{msg.text}</p>
                </div>
              ))}
            </div>

            {/* Input Form */}
            <div style={{ display: 'flex', gap: '6px', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendChat()}
                placeholder="Type lesson notes..." 
                style={{
                  flex: 1,
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  fontSize: '0.68rem',
                  color: '#fff',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <button 
                onClick={handleSendChat}
                style={{
                  background: 'rgba(188,233,78,0.1)',
                  color: '#bce94e',
                  border: '1px solid rgba(188,233,78,0.3)',
                  borderRadius: '8px',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <Send style={{ width: '12px', height: '12px' }} />
              </button>
            </div>
          </div>

        </aside>

      </div>

    </div>
  );
};
export default ClassroomDashboard;
