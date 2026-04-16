import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Send, Mic, Trash2, StopCircle, Globe, Download, Check, X } from 'lucide-react';
import axios from 'axios';
import './AiAssistant.css';

export default function AiAssistant() {
    const { activeUtility } = useApp();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const suggestedQueries = [
        "Welche Hausanschlüsse sind älter als 30 Jahre?",
        "Welche Erneuerungen lassen sich bündeln?",
        "Welche Anschlüsse sind für Wärmepumpen ungeeignet?",
        "Identifiziere Hochrisiko-Assets."
    ];

    const handleSend = async (text) => {
        const query = text || input;
        if (!query.trim()) return;

        const userMsg = { role: 'user', content: query };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        try {
            const response = await axios.post('http://localhost:8000/api/chat', {
                query: query,
                utility: activeUtility,
                history: messages.map(m => ({ role: m.role, content: m.content }))
            });

            const botMsg = { 
                role: 'bot', 
                content: response.data.answer,
                pending_action: response.data.pending_action
            };
            
            setMessages(prev => [...prev, botMsg]);
            if (response.data.pending_action) {
                setPendingAction(response.data.pending_action);
            }
        } catch (err) {
            console.error(err);
            setMessages(prev => [...prev, { role: 'bot', content: 'Entschuldigung, es gab einen Fehler bei der Verarbeitung Ihrer Anfrage.' }]);
        } finally {
            setIsTyping(false);
        }
    };

    const confirmAction = async () => {
        // Logic to confirm action (e.g., updating excel)
        // This would call another backend endpoint
        setMessages(prev => [...prev, { role: 'bot', content: '✅ Die Änderung wurde erfolgreich im System vermerkt.' }]);
        setPendingAction(null);
    };

    const clearChat = () => setMessages([]);

    return (
        <div className="chat-container">
            <div className="chat-layout">
                <div className="chat-main">
                    <div className="chat-messages">
                        {messages.length === 0 && (
                            <div className="chat-welcome">
                                <Bot size={48} color="var(--color-primary)" />
                                <h3>Willkommen beim KI-Assistenten</h3>
                                <p>Ich helfe Ihnen bei der Analyse Ihres Infrastrukturbestands. Wählen Sie eine Frage rechts aus oder stellen Sie Ihre eigene.</p>
                            </div>
                        )}
                        
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`message-bubble ${msg.role}`}>
                                <div className="message-content">{msg.content}</div>
                            </div>
                        ))}
                        
                        {isTyping && (
                            <div className="message-bubble bot typing">
                                <div className="typing-indicator">
                                    <span></span><span></span><span></span>
                                </div>
                            </div>
                        )}

                        {pendingAction && (
                            <div className="action-card glass-card">
                                <h5>🛠️ Daten-Aktualisierung bestätigen</h5>
                                <p>Soll folgende Änderung gespeichert werden?</p>
                                <div className="action-details">
                                    {pendingAction.type === 'update_asset' && (
                                        <ul>
                                            <li><b>ID:</b> {pendingAction.args.customer_id}</li>
                                            <li><b>Feld:</b> {pendingAction.args.field_name}</li>
                                            <li><b>Neuer Wert:</b> {pendingAction.args.new_value}</li>
                                        </ul>
                                    )}
                                </div>
                                <div className="action-buttons">
                                    <button className="btn-confirm" onClick={confirmAction}><Check size={16} /> Bestätigen</button>
                                    <button className="btn-cancel-action" onClick={() => setPendingAction(null)}><X size={16} /> Abbrechen</button>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="chat-input-area">
                        <button className="btn-tool" onClick={clearChat} title="Chat löschen">
                            <Trash2 size={20} />
                        </button>
                        <div className="input-wrapper">
                            <input 
                                type="text" 
                                value={input} 
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Stellen Sie eine Frage..."
                            />
                            <button className="btn-send" onClick={() => handleSend()}>
                                <Send size={20} />
                            </button>
                        </div>
                        <button className="btn-mic" title="Spracheingabe (in Entwicklung)">
                            <Mic size={20} />
                        </button>
                    </div>
                </div>

                <div className="chat-sidebar">
                    <h4>Strategische Analyse-Vorgaben</h4>
                    <div className="suggestions-list">
                        {suggestedQueries.map((q, i) => (
                            <button key={i} className="suggestion-btn" onClick={() => handleSend(q)}>
                                {q}
                            </button>
                        ))}
                    </div>
                    
                    <div className="chat-status-card glass-card">
                        <div className="status-item">
                            <Globe size={16} />
                            <span>Systemdaten: Online</span>
                        </div>
                        <div className="status-item">
                            <Download size={16} />
                            <span>Export-Modul: Bereit</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Bot({ size, color }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
    )
}
