import React, { useState, useEffect } from "react";
import { useAuth } from "wasp/client/auth";
import { useAction, useQuery } from "wasp/client/operations";
import { bookHotelWithAI, getAIBookingStatus, cancelAIBooking } from "wasp/client/operations";
import logger from "../utils/logger.js";

export function HotelBookingModal({ 
    isOpen, 
    onClose, 
    hotel, 
    offer, 
    guestInfo = {},
    onBookingComplete,
    autoFillEnabled = true 
}) {
    const { data: user } = useAuth();
    const [bookingStep, setBookingStep] = useState('details'); // 'details', 'ai-booking', 'confirmation'
    const [isBooking, setIsBooking] = useState(false);
    const [bookingError, setBookingError] = useState(null);
    const [useAIAgent, setUseAIAgent] = useState(false);
    
    // Wasp operations
    const bookHotelWithAIFn = useAction(bookHotelWithAI);
    const cancelAIBookingFn = useAction(cancelAIBooking);
    const { data: bookingStatus } = useQuery(getAIBookingStatus, {}, { 
        enabled: isBooking && useAIAgent,
        refetchInterval: useAIAgent && isBooking ? 1000 : false
    });

    // Get current step status for progress animation
    const getStepStatus = (stepNumber) => {
        if (!bookingStatus) return 'pending';
        
        const currentStep = bookingStatus.currentStep || 0;
        
        if (stepNumber < currentStep) return 'completed';
        if (stepNumber === currentStep) return 'active';
        return 'pending';
    };

    // Get current step message
    const getCurrentStepMessage = () => {
        if (!bookingStatus) return 'Initializing AI booking agent...';
        
        const messages = [
            '🚀 Launching AI booking agent...',
            '🌐 Connecting to optimal booking site...',
            `🔍 Searching for "${hotel?.name || 'your hotel'}"...`,
            `🎯 Locating "${hotel?.name || 'your hotel'}" specifically...`,
            '🏠 Analyzing available rooms...',
            '🏠 Auto-selecting best available room...',
            '👤 Auto-filling your personal information...',
            '💳 Preparing secure checkout...'
        ];
        
        return messages[bookingStatus.currentStep] || 'Processing your booking...';
    };
    
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        specialRequests: '',
        checkInDate: '',
        checkOutDate: '',
        // Payment info (in real implementation, use secure payment processor)
        cardNumber: '',
        expiryDate: '',
        cvv: '',
        billingAddress: ''
    });

    // Reset state when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            // Reset to initial state when opening
            setBookingStep('details');
            setIsBooking(false);
            setBookingError(null);
            setUseAIAgent(false);
            
            // Auto-fill user information and dates
            if (autoFillEnabled && user) {
                setFormData(prev => ({
                    ...prev,
                    firstName: guestInfo.firstName || user.firstName || '',
                    lastName: guestInfo.lastName || user.lastName || '',
                    email: guestInfo.email || user.email || '',
                    phone: guestInfo.phone || user.phone || ''
                }));
            }
            
            // Set initial dates from offer or reasonable defaults
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            const dayAfterTomorrow = new Date(today);
            dayAfterTomorrow.setDate(today.getDate() + 2);
            
            setFormData(prev => ({
                ...prev,
                checkInDate: offer?.checkInDate || tomorrow.toISOString().split('T')[0],
                checkOutDate: offer?.checkOutDate || dayAfterTomorrow.toISOString().split('T')[0]
            }));
        }
    }, [isOpen, autoFillEnabled, user, guestInfo]);


    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        
        // Clear error when user starts typing
        if (bookingError) {
            setBookingError(null);
        }
    };
    
    // Validate dates
    const validateDates = () => {
        const checkIn = new Date(formData.checkInDate);
        const checkOut = new Date(formData.checkOutDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (checkIn < today) {
            return 'Check-in date cannot be in the past';
        }
        
        if (checkOut <= checkIn) {
            return 'Check-out date must be after check-in date';
        }
        
        return null;
    };

    const handleAIBooking = async () => {
        // Validate dates first
        const dateError = validateDates();
        if (dateError) {
            setBookingError(dateError);
            return;
        }
        
        // Validate required fields
        if (!formData.firstName || !formData.lastName || !formData.email) {
            setBookingError('Please fill in all required fields');
            return;
        }
        
        setIsBooking(true);
        setBookingStep('ai-booking');
        setBookingError(null);

        try {
            logger.info('Starting AI-powered hotel booking for:', hotel.title);
            
            // Create updated offer with user-selected dates
            const updatedOffer = {
                ...offer,
                checkInDate: formData.checkInDate,
                checkOutDate: formData.checkOutDate
            };
            
            const bookingData = {
                hotel: hotel,
                offer: updatedOffer,
                guestInfo: {
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    email: formData.email,
                    phone: formData.phone,
                    specialRequests: formData.specialRequests,
                    address: formData.billingAddress
                },
                useAI: true,
                preferences: {
                    roomType: 'standard',
                    smoking: 'non-smoking'
                }
            };

            const bookingResult = await bookHotelWithAIFn(bookingData);
            
            if (bookingResult.success) {
                // Automation completed successfully - open the final page
                logger.info('✅ AI booking automation completed successfully!');
                logger.info('🔍 Booking result details:', bookingResult);
                
                // Handle different automation results
                if (bookingResult.browserOpen) {
                    // Browser automation completed and left browser open
                    logger.info('✅ REAL automation completed - browser left open for final checkout!');
                    // Don't open new tab, browser is already there for user to complete payment
                } else if (bookingResult.checkoutUrl || bookingResult.bookingUrl) {
                    // Open the checkout page in new tab
                    let urlToOpen = bookingResult.checkoutUrl || bookingResult.bookingUrl;
                    logger.info('🚀 Opening URL:', urlToOpen);
                    
                    try {
                        // NEVER switch screens - always stay on UI and open new tab
                        const newWindow = window.open(urlToOpen, '_blank', 'noopener,noreferrer');
                        if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
                            // Popup blocked - show user instruction instead of redirecting current page
                            setBookingError(`Please allow popups to open booking page. URL copied to clipboard.`);
                            
                            // Copy URL to clipboard for user
                            try {
                                await navigator.clipboard.writeText(urlToOpen);
                                logger.info('URL copied to clipboard:', urlToOpen);
                            } catch (clipboardError) {
                                logger.warn('Could not copy to clipboard:', clipboardError);
                                // Show URL in error message as fallback
                                setBookingError(`Please copy this URL manually: ${urlToOpen}`);
                            }
                        } else {
                            logger.info('✅ Successfully opened booking page in new tab');
                        }
                    } catch (error) {
                        logger.error('Failed to open booking page:', error);
                        setBookingError(`Failed to open booking page. Please try again.`);
                    }
                } else {
                    // Fallback - build our own URL but NEVER redirect current page
                    const fallbackUrl = buildPreFilledBookingUrl(null, formData, updatedOffer);
                    logger.info('🚀 Using fallback URL:', fallbackUrl);
                    
                    const fallbackWindow = window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
                    if (!fallbackWindow || fallbackWindow.closed || typeof fallbackWindow.closed === 'undefined') {
                        setBookingError(`Please allow popups to open booking page. URL: ${fallbackUrl}`);
                    }
                }
                
                // Show success message
                const successMsg = bookingResult.message || 
                    '🎉 AI automation completed! Check the browser window that opened.';
                
                if (onBookingComplete) {
                    onBookingComplete({
                        bookingId: bookingResult.bookingId,
                        confirmationCode: bookingResult.confirmationCode,
                        hotel: hotel,
                        checkIn: formData.checkInDate,
                        checkOut: formData.checkOutDate,
                        guestInfo: formData,
                        method: bookingResult.browserOpen ? 'real_browser_automation' : (bookingResult.fallback ? 'fallback_automation' : 'browser_automation'),
                        automationSuccess: true,
                        message: successMsg,
                        redirected: !bookingResult.browserOpen, // Only redirect if browser not left open
                        browserLeft: bookingResult.browserOpen
                    });
                }
                
                // Close modal after automation completes
                const closeDelay = bookingResult.browserOpen ? 5000 : 2000; // Longer delay for real automation
                setTimeout(() => {
                    onClose();
                }, closeDelay);
                
                // Modal will close automatically after automation completes and redirects
                
            } else {
                throw new Error(bookingResult.message || 'AI booking failed');
            }
            
        } catch (error) {
            logger.error('AI booking failed:', error);
            setBookingError(error.message || 'AI booking failed. Please try manual booking.');
            setBookingStep('details');
        } finally {
            setIsBooking(false);
        }
    };

    // Build pre-filled booking URL with guest information
    const buildPreFilledBookingUrl = (baseUrl, guestInfo, offerData) => {
        // Determine the best booking URL to use
        let bookingBaseUrl;
        
        // First try to use hotel's actual booking/external links
        if (hotel.externalLinks?.booking && !hotel.externalLinks.booking.includes('api.amadeus.com')) {
            bookingBaseUrl = hotel.externalLinks.booking;
        } else if (hotel.bookingUrl && !hotel.bookingUrl.includes('api.amadeus.com')) {
            bookingBaseUrl = hotel.bookingUrl;
        } else {
            // Use booking.com with comprehensive pre-filling
            const hotelName = encodeURIComponent(hotel.name || hotel.title || '');
            
            // Fix the location handling to avoid [object Object]
            let locationStr = '';
            if (typeof hotel.location === 'string') {
                locationStr = hotel.location;
            } else if (hotel.location?.address) {
                locationStr = hotel.location.address;
            } else if (hotel.address) {
                locationStr = hotel.address;
            } else if (hotel.subtitle) {
                locationStr = hotel.subtitle;
            } else {
                locationStr = 'Los Angeles'; // Default fallback
            }
            
            // Build simple search parameters
            const searchString = `${hotelName} ${locationStr}`.trim();
            
            // Build simple parameters - no complex additions
            const simpleParams = [
                `ss=${encodeURIComponent(searchString)}`,
                `checkin=${offerData.checkInDate}`,
                `checkout=${offerData.checkOutDate}`,
                'group_adults=1',
                'group_children=0',
                'no_rooms=1',
                'selected_currency=USD'
            ];
            
            // Simple working URL
            return `https://www.booking.com/searchresults.html?${simpleParams.join('&')}`;
        }
        
        // If using an external URL, append simple parameters
        const simpleParams = [
            `checkin=${offerData.checkInDate}`,
            `checkout=${offerData.checkOutDate}`,
            'group_adults=1',
            'group_children=0',
            'no_rooms=1'
        ];
        
        const paramString = simpleParams.join('&');
        return `${bookingBaseUrl}${bookingBaseUrl.includes('?') ? '&' : '?'}${paramString}`;
    };

    const handleManualBooking = async () => {
        // Validate dates first
        const dateError = validateDates();
        if (dateError) {
            setBookingError(dateError);
            return;
        }
        
        setIsBooking(true);
        setBookingError(null);

        try {
            // Validate required fields
            if (!formData.firstName || !formData.lastName || !formData.email) {
                throw new Error('Please fill in all required fields');
            }

            logger.info('Starting manual hotel booking for:', hotel.name);
            
            // Create updated offer with user-selected dates
            const updatedOffer = {
                ...offer,
                checkInDate: formData.checkInDate,
                checkOutDate: formData.checkOutDate
            };
            
            // Use the same URL building logic as AI booking
            const bookingUrl = buildPreFilledBookingUrl(null, formData, updatedOffer);
            
            logger.info('Opening manual booking URL:', bookingUrl);
            window.open(bookingUrl, '_blank', 'noopener,noreferrer');
            
            // Show completion message
            if (onBookingComplete) {
                onBookingComplete({
                    hotel: hotel,
                    checkIn: formData.checkInDate,
                    checkOut: formData.checkOutDate,
                    guestInfo: formData,
                    method: 'manual_redirect',
                    redirected: true
                });
            }
            
            onClose();
            
        } catch (error) {
            logger.error('Manual booking setup failed:', error);
            setBookingError(error.message);
        } finally {
            setIsBooking(false);
        }
    };

    if (!isOpen || !hotel) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content hotel-booking-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>
                        {bookingStep === 'details' && '🏨 Book Your Hotel'}
                        {bookingStep === 'ai-booking' && '🤖 AI Booking in Progress'}
                        {bookingStep === 'confirmation' && '✅ Booking Confirmed'}
                    </h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    {/* Hotel Information */}
                    <div className="hotel-booking-info">
                        <h3>{hotel.name}</h3>
                        {hotel.image && (
                            <img src={hotel.image} alt={hotel.name} className="hotel-booking-image" />
                        )}
                        <div className="booking-details">
                            <p><strong>Check-in:</strong> {formData.checkInDate || offer?.checkInDate}</p>
                            <p><strong>Check-out:</strong> {formData.checkOutDate || offer?.checkOutDate}</p>
                            <p><strong>Price:</strong> {offer?.price?.currency} {offer?.price?.total}</p>
                            {hotel.rating && <p><strong>Rating:</strong> {hotel.rating} ⭐</p>}
                        </div>
                    </div>

                    {bookingStep === 'details' && (
                        <div className="booking-form">
                            {/* AI Booking Option */}
                            <div className="ai-booking-option">
                                <label className="ai-booking-toggle">
                                    <input
                                        type="checkbox"
                                        checked={useAIAgent}
                                        onChange={(e) => setUseAIAgent(e.target.checked)}
                                    />
                                    <span className="checkmark"></span>
                                    <span className="ai-booking-text">
                                        🤖 Use AI Agent for Automatic Booking
                                        <small>Let our AI handle the entire booking process for you</small>
                                    </span>
                                </label>
                            </div>

                            {/* Date Selection */}
                            <div className="date-selection-form">
                                <h4>📅 Select Your Dates</h4>
                                <div className="form-row">
                                    <div className="date-input-group">
                                        <label>Check-in Date *</label>
                                        <input
                                            type="date"
                                            name="checkInDate"
                                            value={formData.checkInDate}
                                            onChange={handleInputChange}
                                            min={new Date().toISOString().split('T')[0]}
                                            required
                                        />
                                    </div>
                                    <div className="date-input-group">
                                        <label>Check-out Date *</label>
                                        <input
                                            type="date"
                                            name="checkOutDate"
                                            value={formData.checkOutDate}
                                            onChange={handleInputChange}
                                            min={formData.checkInDate || new Date().toISOString().split('T')[0]}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Guest Information Form */}
                            <div className="guest-info-form">
                                <h4>👤 Guest Information</h4>
                                <div className="form-row">
                                    <input
                                        type="text"
                                        name="firstName"
                                        placeholder="First Name *"
                                        value={formData.firstName}
                                        onChange={handleInputChange}
                                        required
                                    />
                                    <input
                                        type="text"
                                        name="lastName"
                                        placeholder="Last Name *"
                                        value={formData.lastName}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className="form-row">
                                    <input
                                        type="email"
                                        name="email"
                                        placeholder="Email Address *"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        required
                                    />
                                    <input
                                        type="tel"
                                        name="phone"
                                        placeholder="Phone Number"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <textarea
                                    name="specialRequests"
                                    placeholder="Special Requests (optional)"
                                    value={formData.specialRequests}
                                    onChange={handleInputChange}
                                    rows="3"
                                />
                            </div>

                            {bookingError && (
                                <div className="booking-error">
                                    {bookingError}
                                </div>
                            )}
                        </div>
                    )}

                    {bookingStep === 'ai-booking' && (
                        <div className="ai-booking-progress">
                            <div className="ai-booking-animation">
                                <div className="ai-avatar">🤖</div>
                                <div className="booking-steps">
                                    <div className={`step ${getStepStatus(1)}`}>
                                        <div className="step-content">
                                            <div className="step-icon">🚀</div>
                                            <div className="step-text">Launching AI booking agent</div>
                                        </div>
                                        <div className="step-status">
                                            {getStepStatus(1) === 'completed' && <span className="check">✓</span>}
                                            {getStepStatus(1) === 'active' && <span className="spinner">⟳</span>}
                                        </div>
                                    </div>
                                    <div className={`step ${getStepStatus(2)}`}>
                                        <div className="step-content">
                                            <div className="step-icon">🌐</div>
                                            <div className="step-text">Connecting to optimal booking site</div>
                                        </div>
                                        <div className="step-status">
                                            {getStepStatus(2) === 'completed' && <span className="check">✓</span>}
                                            {getStepStatus(2) === 'active' && <span className="spinner">⟳</span>}
                                        </div>
                                    </div>
                                    <div className={`step ${getStepStatus(3)}`}>
                                        <div className="step-content">
                                            <div className="step-icon">🔍</div>
                                            <div className="step-text">Searching for "{hotel?.name || 'your hotel'}"</div>
                                        </div>
                                        <div className="step-status">
                                            {getStepStatus(3) === 'completed' && <span className="check">✓</span>}
                                            {getStepStatus(3) === 'active' && <span className="spinner">⟳</span>}
                                        </div>
                                    </div>
                                    <div className={`step ${getStepStatus(4)}`}>
                                        <div className="step-content">
                                            <div className="step-icon">🎯</div>
                                            <div className="step-text">Locating "{hotel?.name || 'your hotel'}" specifically</div>
                                        </div>
                                        <div className="step-status">
                                            {getStepStatus(4) === 'completed' && <span className="check">✓</span>}
                                            {getStepStatus(4) === 'active' && <span className="spinner">⟳</span>}
                                        </div>
                                    </div>
                                    <div className={`step ${getStepStatus(5)}`}>
                                        <div className="step-content">
                                            <div className="step-icon">🏠</div>
                                            <div className="step-text">Analyzing available rooms</div>
                                        </div>
                                        <div className="step-status">
                                            {getStepStatus(5) === 'completed' && <span className="check">✓</span>}
                                            {getStepStatus(5) === 'active' && <span className="spinner">⟳</span>}
                                        </div>
                                    </div>
                                    <div className={`step ${getStepStatus(6)}`}>
                                        <div className="step-content">
                                            <div className="step-icon">🏠</div>
                                            <div className="step-text">Auto-selecting best room</div>
                                        </div>
                                        <div className="step-status">
                                            {getStepStatus(6) === 'completed' && <span className="check">✓</span>}
                                            {getStepStatus(6) === 'active' && <span className="spinner">⟳</span>}
                                        </div>
                                    </div>
                                    <div className={`step ${getStepStatus(7)}`}>
                                        <div className="step-content">
                                            <div className="step-icon">👤</div>
                                            <div className="step-text">Auto-filling personal information</div>
                                        </div>
                                        <div className="step-status">
                                            {getStepStatus(7) === 'completed' && <span className="check">✓</span>}
                                            {getStepStatus(7) === 'active' && <span className="spinner">⟳</span>}
                                        </div>
                                    </div>
                                    <div className={`step ${getStepStatus(8)}`}>
                                        <div className="step-content">
                                            <div className="step-icon">💳</div>
                                            <div className="step-text">Preparing secure checkout</div>
                                        </div>
                                        <div className="step-status">
                                            {getStepStatus(8) === 'completed' && <span className="check">✓</span>}
                                            {getStepStatus(8) === 'active' && <span className="spinner">⟳</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <p className="ai-booking-message">
                                {getCurrentStepMessage()}
                            </p>
                        </div>
                    )}


                    {bookingStep === 'confirmation' && (
                        <div className="booking-confirmation">
                            <div className="success-animation">
                                <div className="success-icon">🎉</div>
                                <h3>Booking Successful!</h3>
                            </div>
                            <div className="confirmation-details">
                                <p><strong>Confirmation Code:</strong> CONF-{Math.random().toString(36).substring(2, 8).toUpperCase()}</p>
                                <p><strong>Booking ID:</strong> HTL-{Date.now()}</p>
                                <p>A confirmation email has been sent to {formData.email}</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    {bookingStep === 'details' && (
                        <>
                            <button className="btn btn-secondary" onClick={onClose}>
                                Cancel
                            </button>
                            {useAIAgent ? (
                                <button 
                                    className="btn btn-primary ai-booking-btn" 
                                    onClick={handleAIBooking}
                                    disabled={isBooking}
                                >
                                    {isBooking ? 'Starting AI Booking...' : '🤖 Start AI Booking'}
                                </button>
                            ) : (
                                <button 
                                    className="btn btn-primary" 
                                    onClick={handleManualBooking}
                                    disabled={isBooking}
                                >
                                    {isBooking ? 'Preparing Booking...' : 'Continue to Booking Site'}
                                </button>
                            )}
                        </>
                    )}
                    {bookingStep === 'ai-booking' && (
                        <button className="btn btn-secondary" onClick={onClose}>
                            Cancel Booking
                        </button>
                    )}
                    {bookingStep === 'confirmation' && (
                        <button className="btn btn-primary" onClick={onClose}>
                            Close
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

                .hotel-booking-modal {
                    background: white;
                    border-radius: 12px;
                    width: 90%;
                    max-width: 600px;
                    max-height: 90vh;
                    overflow-y: auto;
                    position: relative;
                }

                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1.5rem;
                    border-bottom: 1px solid #eee;
                }

                .modal-close {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                    color: #666;
                }

                .modal-body {
                    padding: 1.5rem;
                }

                .hotel-booking-info {
                    margin-bottom: 2rem;
                    text-align: center;
                }

                .hotel-booking-image {
                    width: 100%;
                    max-width: 300px;
                    height: 200px;
                    object-fit: cover;
                    border-radius: 8px;
                    margin: 1rem 0;
                }

                .ai-booking-option {
                    margin-bottom: 2rem;
                    padding: 1rem;
                    background: #f8f9fa;
                    border-radius: 8px;
                }

                .ai-booking-toggle {
                    display: flex;
                    align-items: center;
                    cursor: pointer;
                    font-weight: 500;
                }

                .ai-booking-toggle input {
                    margin-right: 0.5rem;
                }

                .ai-booking-text small {
                    display: block;
                    color: #666;
                    font-weight: normal;
                    margin-top: 0.25rem;
                }

                .form-row {
                    display: flex;
                    gap: 1rem;
                    margin-bottom: 1rem;
                }

                .form-row input {
                    flex: 1;
                    padding: 0.75rem;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                }
                
                .date-selection-form {
                    margin-bottom: 2rem;
                    padding: 1rem;
                    background: #f8f9fa;
                    border-radius: 8px;
                    border: 1px solid #e9ecef;
                }
                
                .date-input-group {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }
                
                .date-input-group label {
                    font-weight: 500;
                    margin-bottom: 0.5rem;
                    color: #333;
                }
                
                .date-input-group input[type="date"] {
                    padding: 0.75rem;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 1rem;
                }
                
                .guest-info-form {
                    margin-bottom: 1rem;
                }

                textarea {
                    width: 100%;
                    padding: 0.75rem;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    resize: vertical;
                }

                .ai-booking-progress {
                    text-align: center;
                    padding: 2rem 0;
                }

                .ai-avatar {
                    font-size: 3rem;
                    margin-bottom: 1rem;
                    animation: bounce 2s infinite;
                }

                .booking-steps {
                    text-align: left;
                    max-width: 400px;
                    margin: 0 auto;
                }

                .step {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 0.75rem;
                    padding: 0.5rem;
                    border-radius: 6px;
                    opacity: 0.4;
                    transition: all 0.3s ease;
                    background: transparent;
                }

                .step.pending {
                    opacity: 0.4;
                    color: #999;
                }

                .step.active {
                    opacity: 1;
                    background: #e3f2fd;
                    color: #1565c0;
                    box-shadow: 0 2px 4px rgba(21, 101, 192, 0.1);
                }

                .step.completed {
                    opacity: 0.8;
                    background: #e8f5e8;
                    color: #2e7d32;
                }

                .step-content {
                    display: flex;
                    align-items: center;
                    flex: 1;
                }

                .step-icon {
                    margin-right: 0.75rem;
                    font-size: 1.2rem;
                }

                .step-status {
                    margin-left: auto;
                    font-size: 1rem;
                }

                .check {
                    color: #4caf50;
                    font-weight: bold;
                }

                .spinner {
                    color: #2196f3;
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                .booking-confirmation {
                    text-align: center;
                    padding: 2rem 0;
                }

                .success-icon {
                    font-size: 4rem;
                    margin-bottom: 1rem;
                }

                .booking-error {
                    background: #ffe6e6;
                    color: #d00;
                    padding: 1rem;
                    border-radius: 4px;
                    margin-top: 1rem;
                }

                .modal-footer {
                    display: flex;
                    justify-content: flex-end;
                    gap: 1rem;
                    padding: 1.5rem;
                    border-top: 1px solid #eee;
                }

                .btn {
                    padding: 0.75rem 1.5rem;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-weight: 500;
                }

                .btn-primary {
                    background: #007bff;
                    color: white;
                }

                .btn-secondary {
                    background: #6c757d;
                    color: white;
                }

                .ai-booking-btn {
                    background: linear-gradient(45deg, #667eea 0%, #764ba2 100%);
                }


                @keyframes bounce {
                    0%, 20%, 50%, 80%, 100% {
                        transform: translateY(0);
                    }
                    40% {
                        transform: translateY(-10px);
                    }
                    60% {
                        transform: translateY(-5px);
                    }
                }
            `}</style>
        </div>
    );
}