import React, { useState } from 'react';
import { createAutoFillBookmarklet, generateAutoFillInstructions } from '../utils/formAutoFill.js';

export function BookingCompletionModal({ 
    isOpen, 
    onClose, 
    bookingData,
    guestInfo,
    bookingUrl 
}) {
    const [step, setStep] = useState('summary'); // 'summary', 'autofill', 'instructions'
    const [copied, setCopied] = useState(false);

    if (!isOpen || !bookingData) return null;

    const autoFillData = generateAutoFillInstructions(guestInfo, bookingData);

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const openWithAutoFill = () => {
        // Create a new window with the booking URL
        const newWindow = window.open(bookingUrl, '_blank');
        
        // Wait a moment for the page to load, then inject the auto-fill script
        setTimeout(() => {
            if (newWindow && !newWindow.closed) {
                try {
                    const script = `
                        // Wait for page to fully load
                        if (document.readyState === 'complete') {
                            ${createBookingAutoFillScript(guestInfo, bookingData).replace('(function() {', '').replace('})();', '')}
                        } else {
                            window.addEventListener('load', function() {
                                setTimeout(function() {
                                    ${createBookingAutoFillScript(guestInfo, bookingData).replace('(function() {', '').replace('})();', '')}
                                }, 2000);
                            });
                        }
                    `;
                    
                    newWindow.eval(script);
                } catch (error) {
                    console.log('Cross-origin restrictions prevent auto-fill injection');
                    // Fall back to bookmarklet method
                    setStep('instructions');
                }
            }
        }, 3000);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content booking-completion-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>🎉 Booking Prepared Successfully!</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    {step === 'summary' && (
                        <div className="booking-summary-step">
                            <div className="success-icon">✅</div>
                            <h3>Your AI booking assistant has prepared everything!</h3>
                            
                            <div className="booking-summary-card">
                                <h4>📋 Booking Summary</h4>
                                <div className="summary-details">
                                    <div className="detail-row">
                                        <span className="label">Guest:</span>
                                        <span className="value">{guestInfo.firstName} {guestInfo.lastName}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">Email:</span>
                                        <span className="value">{guestInfo.email}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">Phone:</span>
                                        <span className="value">{guestInfo.phone}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">Check-in:</span>
                                        <span className="value">{guestInfo.checkInDate}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="label">Check-out:</span>
                                        <span className="value">{guestInfo.checkOutDate}</span>
                                    </div>
                                    {guestInfo.specialRequests && (
                                        <div className="detail-row">
                                            <span className="label">Special Requests:</span>
                                            <span className="value">{guestInfo.specialRequests}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="next-steps">
                                <h4>🚀 Choose Your Next Step:</h4>
                                <div className="action-buttons">
                                    <button 
                                        className="btn btn-primary auto-fill-btn"
                                        onClick={() => setStep('autofill')}
                                    >
                                        🤖 Use AI Auto-Fill (Recommended)
                                    </button>
                                    <button 
                                        className="btn btn-secondary"
                                        onClick={() => window.open(bookingUrl, '_blank')}
                                    >
                                        📝 Manual Fill (Traditional Way)
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'autofill' && (
                        <div className="autofill-step">
                            <div className="autofill-header">
                                <span className="robot-icon">🤖</span>
                                <h3>AI Form Auto-Fill Ready!</h3>
                                <p>Our AI will automatically fill all your information on the booking page</p>
                            </div>

                            <div className="autofill-features">
                                <div className="feature">
                                    <span className="feature-icon">⚡</span>
                                    <span>Instantly fills all your information</span>
                                </div>
                                <div className="feature">
                                    <span className="feature-icon">🎯</span>
                                    <span>Works with all major booking sites</span>
                                </div>
                                <div className="feature">
                                    <span className="feature-icon">🔒</span>
                                    <span>Secure - no data stored or transmitted</span>
                                </div>
                            </div>

                            <div className="autofill-actions">
                                <button 
                                    className="btn btn-primary auto-fill-btn"
                                    onClick={openWithAutoFill}
                                >
                                    🚀 Open Booking Page with AI Auto-Fill
                                </button>
                                <button 
                                    className="btn btn-outline"
                                    onClick={() => setStep('instructions')}
                                >
                                    📖 Show Bookmarklet Instructions
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'instructions' && (
                        <div className="instructions-step">
                            <h3>📖 Bookmarklet Auto-Fill Instructions</h3>
                            <p>For maximum compatibility, use this bookmarklet method:</p>

                            <div className="instructions-list">
                                {autoFillData.instructions.map((instruction, index) => (
                                    <div key={index} className="instruction-item">
                                        <span className="step-number">{index + 1}</span>
                                        <span className="instruction-text">{instruction}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="bookmarklet-code">
                                <h4>Bookmarklet Code:</h4>
                                <div className="code-box">
                                    <code>{autoFillData.bookmarklet}</code>
                                </div>
                                <button 
                                    className="btn btn-copy"
                                    onClick={() => copyToClipboard(autoFillData.bookmarklet)}
                                >
                                    {copied ? '✅ Copied!' : '📋 Copy Bookmarklet'}
                                </button>
                            </div>

                            <div className="quick-actions">
                                <button 
                                    className="btn btn-primary"
                                    onClick={() => window.open(bookingUrl, '_blank')}
                                >
                                    🔗 Open Booking Page
                                </button>
                                <button 
                                    className="btn btn-secondary"
                                    onClick={() => setStep('autofill')}
                                >
                                    ← Back to Auto-Fill
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>
                        Close
                    </button>
                    {step !== 'summary' && (
                        <button 
                            className="btn btn-outline" 
                            onClick={() => setStep('summary')}
                        >
                            ← Back to Summary
                        </button>
                    )}
                </div>
            </div>

            <style jsx>{`
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.7);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }

                .booking-completion-modal {
                    background: white;
                    border-radius: 16px;
                    width: 90%;
                    max-width: 600px;
                    max-height: 90vh;
                    overflow-y: auto;
                    position: relative;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                }

                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 2rem;
                    border-bottom: 1px solid #eee;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border-radius: 16px 16px 0 0;
                }

                .modal-header h2 {
                    margin: 0;
                    font-size: 1.5rem;
                }

                .modal-close {
                    background: rgba(255, 255, 255, 0.2);
                    border: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                    color: white;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .modal-body {
                    padding: 2rem;
                }

                .booking-summary-step {
                    text-align: center;
                }

                .success-icon {
                    font-size: 4rem;
                    margin-bottom: 1rem;
                }

                .booking-summary-card {
                    background: #f8f9fa;
                    border-radius: 12px;
                    padding: 1.5rem;
                    margin: 2rem 0;
                    text-align: left;
                }

                .summary-details {
                    display: grid;
                    gap: 0.75rem;
                }

                .detail-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 0.5rem 0;
                    border-bottom: 1px solid #e9ecef;
                }

                .label {
                    font-weight: 600;
                    color: #495057;
                }

                .value {
                    color: #212529;
                }

                .next-steps {
                    margin-top: 2rem;
                }

                .action-buttons {
                    display: flex;
                    gap: 1rem;
                    justify-content: center;
                    margin-top: 1rem;
                }

                .autofill-header {
                    text-align: center;
                    margin-bottom: 2rem;
                }

                .robot-icon {
                    font-size: 3rem;
                    display: block;
                    margin-bottom: 1rem;
                }

                .autofill-features {
                    background: #e8f5e8;
                    border-radius: 12px;
                    padding: 1.5rem;
                    margin: 2rem 0;
                }

                .feature {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    margin-bottom: 1rem;
                }

                .feature:last-child {
                    margin-bottom: 0;
                }

                .feature-icon {
                    font-size: 1.2rem;
                    width: 24px;
                }

                .autofill-actions {
                    text-align: center;
                    margin-top: 2rem;
                }

                .instructions-list {
                    margin: 2rem 0;
                }

                .instruction-item {
                    display: flex;
                    align-items: flex-start;
                    gap: 1rem;
                    margin-bottom: 1rem;
                    padding: 1rem;
                    background: #f8f9fa;
                    border-radius: 8px;
                }

                .step-number {
                    background: #007bff;
                    color: white;
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.875rem;
                    font-weight: bold;
                    flex-shrink: 0;
                }

                .bookmarklet-code {
                    margin: 2rem 0;
                }

                .code-box {
                    background: #f1f3f4;
                    border: 1px solid #dadce0;
                    border-radius: 8px;
                    padding: 1rem;
                    margin: 1rem 0;
                    font-family: 'Courier New', monospace;
                    font-size: 0.75rem;
                    word-break: break-all;
                    max-height: 100px;
                    overflow-y: auto;
                }

                .quick-actions {
                    display: flex;
                    gap: 1rem;
                    justify-content: center;
                    margin-top: 2rem;
                }

                .modal-footer {
                    display: flex;
                    justify-content: space-between;
                    gap: 1rem;
                    padding: 1.5rem 2rem;
                    border-top: 1px solid #eee;
                    background: #f8f9fa;
                    border-radius: 0 0 16px 16px;
                }

                .btn {
                    padding: 0.75rem 1.5rem;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 500;
                    text-decoration: none;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    transition: all 0.2s ease;
                }

                .btn-primary {
                    background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
                    color: white;
                }

                .btn-primary:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
                }

                .btn-secondary {
                    background: #6c757d;
                    color: white;
                }

                .btn-outline {
                    background: transparent;
                    border: 2px solid #007bff;
                    color: #007bff;
                }

                .btn-copy {
                    background: #17a2b8;
                    color: white;
                }

                .auto-fill-btn {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    font-size: 1.1rem;
                    padding: 1rem 2rem;
                }

                .auto-fill-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
                }
            `}</style>
        </div>
    );
}