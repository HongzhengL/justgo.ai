# 🏨 Hotel Feature Guide for Team

## Overview
The hotel feature is now fully integrated with the flight search functionality. When users search for flights, the system automatically searches for hotels in the destination city and displays both flight and hotel options.

## 🚀 How to Access the Hotel Feature

### 1. Start the Application
```bash
# Navigate to the project directory
cd /path/to/justgo.ai

# Clear any existing processes (if needed)
pkill -f "wasp\|node\|npm"
lsof -ti:3000,3001,3002,4000 | xargs kill -9 2>/dev/null || true

# Start the application
wasp start
```

### 2. Access the Application
- **Client URL**: `http://localhost:3002/` (or `http://localhost:3000/` if 3002 is busy)
- **Server URL**: `http://localhost:3001/`

### 3. Authentication
- **Sign up** with a new account or **log in** with existing credentials
- You must be authenticated to access the dashboard with the hotel feature

## 🎯 How to Test the Hotel Feature

### Step 1: Navigate to Dashboard
1. After logging in, you'll be redirected to the dashboard
2. Look for the chat interface with the message input at the bottom

### Step 2: Search for Flights (Hotels will be included automatically)
Type a flight search query like:
```
"Find flights from Chicago to Mumbai for August 8-11, 2025"
```
or
```
"I need flights from New York to London for next month"
```

### Step 3: View Results
The system will automatically:
1. **Search for flights** using SerpAPI
2. **Search for hotels** in the destination city using Amadeus API
3. **Display both** flight and hotel cards in the results

## 📊 Expected Results

### Flight Cards
- **Type**: `flight`
- **Content**: Airline, route, price, departure/arrival times
- **Count**: Usually 10-15 flight options

### Hotel Cards
- **Type**: `place` (with `additionalInfo.hotelId`)
- **Content**: Hotel name, location, price (if available), booking link
- **Count**: Minimum 3 hotels (even if no offers available)

### Example Response Structure
```javascript
{
  cards: [
    // Flight cards (type: 'flight')
    { type: 'flight', title: 'ORD → BOM', ... },
    { type: 'flight', title: 'ORD → BOM', ... },
    // ... more flights
    
    // Hotel cards (type: 'place')
    { 
      type: 'place', 
      title: 'Hotel Name',
      additionalInfo: { hotelId: 'ABC123', hasOffers: true },
      price: '$150/night',
      booking: 'https://booking-link.com'
    },
    // ... more hotels
  ]
}
```

## 🔍 Testing Scenarios

### Scenario 1: Hotels with Offers
- **Query**: "Flights from Chicago to Mumbai"
- **Expected**: 3+ hotels with pricing and booking links
- **Look for**: "Book Now" buttons on hotel cards

### Scenario 2: Hotels without Offers
- **Query**: "Flights to a smaller city"
- **Expected**: 3+ hotels with "No Offers Available" status
- **Look for**: Disabled booking buttons

### Scenario 3: Mixed Results
- **Query**: "Flights from NYC to London"
- **Expected**: Mix of hotels with and without offers
- **Look for**: Both bookable and non-bookable hotels

## 🐛 Troubleshooting

### Issue: No Hotels Appearing
**Check:**
1. Server logs for hotel search messages
2. Look for: "Hotel search completed: X results found"
3. Verify Amadeus API credentials in `server.env`

### Issue: Port Conflicts
**Solution:**
```bash
# Kill all processes
pkill -f "wasp\|node\|npm"
lsof -ti:3000,3001,3002,4000 | xargs kill -9 2>/dev/null || true

# Restart
wasp start
```

### Issue: Authentication Problems
**Solution:**
1. Clear browser cache/cookies
2. Try signing up with a new email
3. Check server logs for auth errors

## 📝 Key Features to Test

### ✅ Hotel Display
- [ ] Hotel cards appear alongside flight cards
- [ ] Hotel names are clearly displayed
- [ ] Location information is shown
- [ ] At least 3 hotels are always displayed

### ✅ Pricing Information
- [ ] Hotels with offers show prices
- [ ] Hotels without offers show "No Offers Available"
- [ ] Price formatting is consistent

### ✅ Booking Functionality
- [ ] Hotels with offers have "Book Now" buttons
- [ ] Hotels without offers have disabled buttons
- [ ] Booking links open in new tabs

### ✅ Integration
- [ ] Hotel search happens automatically with flight search
- [ ] Both flight and hotel results load together
- [ ] No errors in browser console

## 🔧 Technical Details

### API Integration
- **Flight Search**: SerpAPI
- **Hotel Search**: Amadeus API
- **Authentication**: Email/password via Wasp

### Data Flow
1. User submits flight query
2. AI Agent processes request
3. Flight search via SerpAPI
4. Automatic hotel search via Amadeus
5. Data transformation to standardized cards
6. Display in CardList component

### File Structure
```
src/
├── services/aiAgent.js          # Main orchestration
├── api/amadeus/hotelService.js  # Hotel API calls
├── components/CardList.jsx      # Results display
├── components/Card.jsx          # Individual card rendering
└── api/types.ts                # Data structure definitions
```

## 📞 Support

If you encounter issues:
1. Check the server logs for error messages
2. Verify all environment variables are set
3. Ensure you're on the correct branch (`main` or `feature/whisper-integration`)
4. Contact the team lead for API credential issues

---

**Last Updated**: July 29, 2025
**Version**: 1.0
**Status**: ✅ Production Ready 