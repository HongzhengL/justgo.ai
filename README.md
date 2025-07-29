# JustGo.ai - AI Travel Planning Application

## 🚀 Overview

JustGo.ai is an intelligent travel planning application that combines flight search with automatic hotel recommendations. The system uses AI to understand user queries and provides comprehensive travel options including flights and accommodations.

## ✨ Features

### 🛫 Flight Search

- Real-time flight search using SerpAPI
- Multiple airline options with pricing
- Flexible date and route search

### 🏨 Hotel Integration

- **Automatic hotel search** in destination cities
- **Minimum 3 hotels** always displayed
- **Booking links** for available offers
- **Fallback display** for hotels without offers

### 🎤 Voice Integration (Whisper)

- Voice-to-text functionality using OpenAI Whisper
- Real-time audio recording and transcription
- Seamless integration with chat interface

## 🏃‍♂️ Quick Start

### Prerequisites

- Node.js (v18+)
- npm or yarn
- Wasp CLI

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd justgo.ai

# Install dependencies
npm install

# Start the application
wasp start
```

### Access URLs

- **Client**: `http://localhost:3002/` (or `http://localhost:3000/`)
- **Server**: `http://localhost:3001/`

## 📚 Documentation

### For Team Members

- **[Hotel Feature Guide](./HOTEL_FEATURE_GUIDE.md)** - Complete guide for testing hotel functionality
- **[Pre-commit Setup](./README-precommit.md)** - Code quality and formatting setup

### For Developers

- **API Documentation**: See `src/api/` directory
- **Component Documentation**: See `src/components/` directory
- **Service Documentation**: See `src/services/` directory

## 🧪 Testing the Hotel Feature

The hotel feature is **automatically integrated** with flight searches. To test:

1. **Start the application**: `wasp start`
2. **Sign up/Login** to access the dashboard
3. **Search for flights** (e.g., "Find flights from Chicago to Mumbai")
4. **View results** - both flights and hotels will appear

For detailed testing instructions, see **[HOTEL_FEATURE_GUIDE.md](./HOTEL_FEATURE_GUIDE.md)**

## 🔧 Technical Stack

- **Frontend**: React + Vite
- **Backend**: Node.js + Express
- **Framework**: Wasp
- **Database**: Prisma + SQLite
- **APIs**:
    - SerpAPI (Flight Search)
    - Amadeus API (Hotel Search)
    - OpenAI Whisper (Voice Processing)

## 📁 Project Structure

```
src/
├── api/                    # API integrations
│   ├── amadeus/           # Hotel search API
│   ├── serpapi/           # Flight search API
│   └── types.ts           # Type definitions
├── components/            # React components
│   ├── Card.jsx           # Individual card display
│   ├── CardList.jsx       # Results list
│   └── layout/            # Layout components
├── services/              # Business logic
│   ├── aiAgent.js         # Main AI orchestration
│   └── validation.js      # Data validation
├── hooks/                 # React hooks
│   └── useVoiceRecorder.js # Voice recording
├── operations/            # Server operations
│   └── voice.js           # Voice processing
└── utils/                 # Utility functions
```

## 🚨 Troubleshooting

### Port Conflicts

```bash
# Kill all processes
pkill -f "wasp\|node\|npm"
lsof -ti:3000,3001,3002,4000 | xargs kill -9 2>/dev/null || true

# Restart
wasp start
```

### Database Issues

```bash
# Reset database
wasp db migrate-dev
```

### Authentication Issues

- Clear browser cache/cookies
- Try signing up with a new email
- Check server logs for errors

## 🤝 Contributing

1. **Create a feature branch**: `git checkout -b feature/your-feature`
2. **Make changes** and test thoroughly
3. **Commit with pre-commit hooks**: `git commit -m "feat: your feature"`
4. **Push and create PR**: `git push origin feature/your-feature`

## 📞 Support

For issues or questions:

1. Check the troubleshooting section above
2. Review the [Hotel Feature Guide](./HOTEL_FEATURE_GUIDE.md)
3. Check server logs for error messages
4. Contact the team lead for API credential issues

---

**Last Updated**: July 29, 2025
**Version**: 1.0
**Status**: ✅ Production Ready
