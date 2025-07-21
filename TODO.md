# AI Travel Planner - Developer-Ready PRD v0.1.0

**Version:** 0.1
**Date:** June 29, 2025
**Author:** Hongzheng Li (hongzheng@cs.wisc.edu)

---

## 1. Executive Summary

### Product Vision

Create an intelligent, conversational web-based travel planner that simplifies trip planning by integrating real-time data for flights, experiences, and local transit through natural language interaction.

### Success Metrics for v0.1.0

- Users can successfully plan a complete trip using natural language
- Users can create and manage itineraries with flight and place data

---

## 2. Technical Architecture Overview

### System Components

Frontend (React via Wasp) connects to Backend (Node.js via Wasp) which integrates with External APIs including SerpAPI, Google Maps, and OpenAI. The system uses Wasp framework for full-stack development with built-in authentication, database management (Prisma), and operations. Components include Chat UI, Card System, and Itinerary on frontend, with AI Agent, API Module, and Wasp Operations on backend.

### Sample AI Travel Agent Workflow (Using booking flights as example)

#### 1. User Input

User provides their travel needs in natural language.

#### 2. AI Intent Recognition

AI agent determines the user's intent.

- If the intent is **not** about flights → handle accordingly (e.g., places, hotels).
- If the intent **is** about **flights** → proceed to next step.

#### 3. Flight Flow

##### a. Gather Required Flight Information

The AI agent prompts the user for missing details until all **minimum requirements** are met:

- Departure and arrival airports
- Dates
- Number of passengers
- Travel class (optional)

##### b. Format JSON for SerpAPI

Once all data is collected, the AI agent:

- Constructs a **JSON request** that matches **SerpAPI's required format**.
- Ensures strict compliance with the expected schema.

##### c. Call SerpAPI

The formatted JSON is sent to SerpAPI, which returns:

- Raw flight information in JSON format.

##### d. Post-process & Filter

The AI agent:

- Parses the SerpAPI response.
- Selects the **top N best matches** (configurable, default: 5).
- Returns the filtered results in **pure JSON** format.

##### e. Render Results

Frontend receives the filtered JSON and:

- Renders **interactive flight cards** for the user to browse and select.

#### 4. Next Intent Round

After flight selection (or skipping), when there is new input, the agent:

- Loops back to detect user’s **next intent**.
- Handles other flows like **Places**, **Hotels**, or **Custom Trips**.

---

## 3. Detailed User Stories & Acceptance Criteria

### EPIC 1: Standalone API Module Architecture

#### User Story 1.1: API Module Foundation

**As a** developer
**I want** a standalone API module
**So that** I can easily integrate and swap different travel data providers

**Acceptance Criteria:**

- [x] API module is completely isolated from main application logic
- [x] Module exports a unified interface for all travel data requests
- [x] SerpAPI integration returns standardized flight data
- [ ] Google Maps API integration returns standardized place/transit data
- [ ] New API providers can be added without changing existing code
- [x] All API keys are securely managed and never exposed to frontend
- [x] Module includes error handling for API failures and rate limits

**Technical Specifications:**

TravelAPIModule class (`src/api/index.ts`) includes methods for searchFlights, searchPlaces, and getTransitInfo, all returning StandardizedCard arrays. Implemented with SerpAPIClient and GoogleMapsClient integration, plus AITranslator for response processing.

**Definition of Done:**

- Unit tests cover all API methods
- Integration tests verify external API connections
- Error scenarios are handled gracefully
- API response time is logged and monitored
- Documentation includes API provider setup instructions

#### User Story 1.2: Data Standardization

**As a** developer
**I want** all API responses converted to a consistent JSON format
**So that** the frontend can display data uniformly regardless of source

**Acceptance Criteria:**

- [ ] Standardized schema defined for flights, places, and transit
- [ ] Translation functions (AI agent) convert SerpAPI flight data to standard format
- [ ] Translation functions (AI agent) convert Google Maps data to standard format
- [ ] Missing data fields are handled with appropriate defaults
- [ ] Schema validation ensures output consistency
- [ ] Performance impact of translation is minimized

**Standardized Data Schema:**

StandardizedCard interface includes:

- id, type (flight/place/transit), title, subtitle
- price (amount, currency), duration in minutes
- location (from/to), details for "More Info" modal
- essentialDetails subset shown on card
- externalLinks (booking, maps, directions, website)
- metadata (provider, confidence, timestamp, bookingToken)

ModalState interface manages:

- searchResults (isOpen, results)
- detailModal (isOpen, selectedItem)

ItineraryState includes items, totalCost, and currency.

### EPIC 2: AI Agent Core System

#### User Story 2.1: Natural Language Processing

**As a** user
**I want** to describe my travel plans in natural language
**So that** the system understands my needs without complex forms

**Acceptance Criteria:**

- [x] Agent extracts destination, dates, budget, and preferences from text
- [x] Handles ambiguous inputs by asking clarifying questions
- [x] Provides helpful suggestions when minimal information requirement is not met
- [x] Maintains conversation context across multiple messages
- [x] Supports common travel request patterns
- [x] Validates extracted parameters before API calls

**Example Input Patterns:**

- "I want to fly from Austin to San Francisco next weekend"
- "Find me cheap flights to Paris in December, I don't want to fly in the early morning"
- "Plan a 3-day trip to New York with good restaurants"

**Technical Implementation:**

AIAgent class (`src/services/aiAgent.js`) with processUserMessage method handles natural language input using OpenAI GPT-4o. Integrates with ParameterMappingService and ValidationService. Supports intent recognition (flight_search, place_search, general_question) and extracts parameters for API calls. For example, "New York" gets mapped to "JFK" via airport code normalization.

#### User Story 2.2: Intelligent Filtering and Ranking

**As a** user
**I want** the AI to show me the most relevant options first
**So that** I don't have to scroll through irrelevant results

**Acceptance Criteria:**

- [ ] Agent filters results based on stated budget constraints
- [ ] Time preferences affect flight time rankings
- [ ] Previous selections influence future recommendations
- [ ] Results are limited to top 5 (configurable through `settings` or `chatting with agent directly`) most relevant options per request
- [ ] Ranking algorithm considers price, duration, and user preferences
- [ ] Explanation provided for why certain options are recommended

### EPIC 3: Card-Based User Interface

#### User Story 3.1: Authentication Flow & Navigation

**As a** user
**I want** clear navigation between logged-in and logged-out states
**So that** I can easily access my account and understand my current status

**Acceptance Criteria:**

- [x] Sidebar navigation shows user info and logout when logged in
- [x] Authentication pages redirect appropriately (MainPage handles login state)
- [x] Protected routes redirect to login page with return URL (Wasp authRequired)
- [x] Dashboard shows user's saved itineraries and chat interface
- [ ] Account settings page accessible from user menu (not implemented - using Wasp auth pages)
- [x] Loading states during authentication checks (useAuth hook)
- [x] Responsive design with mobile navigation (Sidebar + MobileNavigation)

**UI Components:**

AppLayout component (`src/components/layout/AppLayout.jsx`) with Sidebar and MobileNavigation. Sidebar includes navigation links, user info, and logout functionality. Authentication handled via Wasp's built-in useAuth hook and auth components.

#### User Story 3.2: Chat Interface

**As a** user
**I want** a clean chat interface
**So that** I can naturally communicate my travel plans

**Acceptance Criteria:**

- [ ] Chat interface supports text input with send button and Enter key
- [ ] Messages display in chronological order with clear sender identification
- [ ] Loading states show when AI is processing requests
- [ ] Error messages are user-friendly and actionable
- [ ] Chat history persists during the session
- [ ] Interface is responsive on desktop and mobile devices

**UI Components:**

DashboardPage (`src/pages/DashboardPage.jsx`) implements chat interface with message state management, conversation persistence via Wasp operations (getActiveConversation, processAIMessage), and real-time card display integration with CardList component.

#### User Story 3.3: Search Results Dialog & Card System

**As a** user
**I want** to see travel options as cards in a dialog box (followed by agent's response) with clear action buttons
**So that** I can review, get more details, book directly, or save options to my itinerary

**Acceptance Criteria:**

- [x] Search results display as cards inline in chat, followed by agent's response
- [ ] Cards show essential information (price, time, duration, key details)
- [ ] Each card has exactly three action buttons (`Go to Website`, `More Information`, `Add to Itinerary`)
- [ ] After clicking `More Information` button, a secondary modal will pop up, displaying the rest of information. For example, for flights, `legroom` will not be displayed in the card, but instead in this modal.
- [ ] The secondary modal can be closed via ESC key or clicking "x" in the upper right corner or clicking outside
- [ ] Different card types (flight, place, transit) have distinct visual styles
- [ ] Cards are keyboard accessible with proper tab order
- [ ] Cards load progressively as AI processes results

**Card Action Buttons:**

1. **External Link Button**: Direct link to booking/source website
2. **More Info Button**: Opens detailed modal with complete JSON data
3. **Add to Itinerary Button**: Saves item to user's itinerary
    - **NOTE**: It will change to `Added to Itinerary` after it's clicked. And the state is interchangeable.

**Card Component Implementation:**

CardList component (`src/components/CardList.jsx`) contains Card components (`src/components/Card.jsx`). Each card includes title/subtitle display, essential details, pricing, and three action buttons. InfoModal component (`src/components/InfoModal.jsx`) handles detailed information display.

**External Link Behavior by Card Type:**

Flight cards link to Google Flights booking or search, place cards link to Google Maps, transit cards link to Google Maps directions.

External button labels vary by type: "Book Flight", "View on Maps", "Get Directions".

#### User Story 3.4: Detailed Information Modal

**As a** user
**I want** to view complete details about a travel option in a modal
**So that** I can make informed decisions with all available information

**Acceptance Criteria:**

- [ ] "More Info" button opens a secondary modal over the results dialog
- [ ] Modal displays all available JSON data in an organized, readable format
- [ ] Modal has proper z-index layering (appears above results dialog)
- [ ] Modal closes when clicking "X" button or clicking outside modal area
- [ ] Modal is keyboard accessible (ESC to close, proper focus management)
- [ ] Modal content is scrollable for long data sets
- [ ] Modal includes the same three action buttons for immediate action

**Detail Modal Implementation:**

InfoModal component (`src/components/InfoModal.jsx`) with overlay backdrop, close button, scrollable content, essential and detailed information sections, and action buttons. Handles ESC key and backdrop click closing with proper z-index layering.

**Modal Close Behavior:**

Modal closes on backdrop click when target equals currentTarget, and on Escape key press.

#### User Story 3.5: Itinerary Management & My Itinerary Tab

**As a** user
**I want** to view and manage my selected travel options in a dedicated itinerary tab
**So that** I can organize my complete trip plan and make changes as needed

**Acceptance Criteria:**

- [ ] "My Itinerary" tab displays all saved items using the same card layout
- [ ] Cards maintain identical visual design as search results cards
- [ ] External link and "More Info" buttons function identically to search results
- [ ] "Add to Itinerary" button is replaced with "Remove from Itinerary" button
- [ ] Remove button includes confirmation dialog to prevent accidental deletion
- [ ] Itinerary items are organized chronologically or by trip day
- [ ] Total trip cost is calculated and displayed prominently
    - **NOTE**: User can edit the cost of each card here, which is what we call `Actual Cost`, the original cost information from the API is what we call `Estimate Cost`
- [ ] Empty state provides guidance on adding items from search results
- [ ] Drag-and-drop reordering for itinerary items (optional for v0.1.0)

**My Itinerary Page Implementation:**

MyItineraryPage (`src/pages/MyItineraryPage.jsx`) displays saved itinerary items using CardList component with "Remove from Itinerary" button. Includes confirmation dialog for removal, total cost calculation, and empty state guidance. Uses Wasp operations (getItineraries, removeFromItinerary).

**Remove Confirmation Dialog:**

ConfirmationDialog asks for confirmation before removing items from itinerary, with "Remove" and "Cancel" options.

**Button State Management:**

ItineraryButton component changes between "Add to Itinerary" and "Remove from Itinerary" based on context and item state.

### EPIC 4: User Authentication & Session Management

#### User Story 4.1: User Registration

**As a** new user
**I want** to create an account
**So that** I can save my itineraries and access them later

**Acceptance Criteria:**

- [ ] Registration form collects email, password, and optional display name
- [ ] Email validation ensures proper format and uniqueness
- [ ] Password requirements: minimum 8 characters, mix of letters and numbers
- [ ] Email verification required before account activation
- [ ] Clear error messages for validation failures
- [ ] Privacy policy and terms of service acceptance required
- [ ] Account creation triggers welcome email

**Technical Specifications:**

Wasp authentication system with email/password method configured in `main.wasp`. SignupForm component handles registration with email verification. User signup fields defined in `src/auth/signupFields.js` with email, username, firstName, and lastName.

**UI Components:**

SignupPage (`src/auth/pages/SignupPage.jsx`) uses Wasp's built-in SignupForm component with styled auth container. Includes account creation, terms notice, and navigation to login page.

#### User Story 4.2: User Login

**As a** returning user
**I want** to log into my account
**So that** I can access my saved itineraries and continue planning

**Acceptance Criteria:**

- [ ] Login form accepts email and password
- [ ] "Remember me" option for extended sessions
- [ ] "Forgot password" link triggers password reset flow
- [ ] Failed login attempts are rate-limited (max 5 attempts per 15 minutes)
- [ ] Successful login redirects to dashboard or previous page
- [ ] Account lockout after 10 failed attempts with unlock email

**Technical Specifications:**

Wasp LoginForm component with built-in authentication handling. Login state managed via useAuth hook. Successful login redirects to dashboard as configured in `main.wasp` (onAuthSucceededRedirectTo: "/dashboard").

#### User Story 4.3: User Logout & Session Management

**As a** logged-in user
**I want** to securely log out
**So that** my account remains protected on shared devices

**Acceptance Criteria:**

- [ ] Logout button available in navigation header
- [ ] Logout clears all authentication tokens and local storage
- [ ] Session timeout after 24 hours of inactivity (configurable)
- [ ] Warning before automatic logout with option to extend session
- [ ] "Log out all devices" option in account settings
- [ ] Graceful handling of expired tokens with automatic refresh

**Session Management:**

Wasp handles session management automatically with built-in JWT tokens, session storage, and auth state. Logout functionality via Wasp's logout function, accessible from Sidebar and MobileNavigation components.

#### User Story 4.4: Password Reset

**As a** user who forgot my password
**I want** to reset it securely
**So that** I can regain access to my account

**Acceptance Criteria:**

- [ ] "Forgot Password" sends reset email to registered address
- [ ] Reset link expires after 1 hour
- [ ] Reset form requires new password confirmation
- [ ] Successfully reset password invalidates all existing sessions
- [ ] Rate limiting prevents abuse (max 3 reset requests per hour)
- [ ] Clear feedback messages throughout the process

### EPIC 5: Demo Optimization & Foundation

#### User Story 5.1: Error Handling

**As a** user
**I want** the system to handle errors gracefully
**So that** I can continue planning even when issues occur

**Acceptance Criteria:**

- [ ] API failures show user-friendly error messages
- [ ] System retries failed requests automatically (max 3 attempts)
- [ ] Partial results are shown when some APIs fail
- [ ] Network errors provide offline guidance
- [ ] Invalid inputs generate helpful correction suggestions
- [ ] System logs all errors for debugging

**Error Handling Patterns:**

Handle rate limit errors with retry suggestions, API downtime with alternative suggestions, and log all errors while returning user-friendly messages.

---

## 4. API Integration Specifications

### 4.1 SerpAPI Integration

**Base Configuration:**

Configuration includes apiKey, endpoint URL for google_flights engine, timeout of 10 seconds, and 3 retries.

**Flight Search Parameters:**

Parameters include departure_id and arrival_id (IATA codes), outbound_date and optional return_date (YYYY-MM-DD), currency defaulting to USD, number of adults/children, and travel_class defaulting to economy.

**Response Processing:**

Based on SerpAPI documentation, implement translation functions to convert best_flights and other_flights data to standardized format including flight segments, layovers, carbon emissions, airline logos, and booking tokens.

### 4.2 Google Maps API Integration

**Required APIs:**

- Places API (Place Search, Place Details)
- Directions API (Transit routing)
- Geocoding API (Address conversion)

**Place Search Implementation:**

Search places using query, location coordinates, radius, place types (tourist_attraction, restaurant, lodging), and API key. Translate Google Places response to standardized format.

---

## 5. Database Schema (Prisma)

Database implemented using Prisma ORM with SQLite in development. Schema defined in `schema.prisma`.

**Note:** Wasp automatically manages authentication-related tables (Auth, AuthIdentity, Session) as defined in Wasp framework documentation.

---

## 6. Testing Requirements

### Comprehensive Testing Infrastructure

**Testing Operations** (7 Wasp operations callable from dashboard):

- [ ] `testApiModule` - Full API module test suite with validation
- [ ] `quickApiTest` - Rapid smoke testing
- [ ] `checkApiHealth` - Environment and configuration validation
- [ ] `testSpecificOperation` - Individual operation testing with custom parameters
- [ ] `testErrorHandling` - Error scenario and recovery testing
- [ ] `testPerformance` - 3-second response time validation per TODO.md
- [ ] `testWaspIntegration` - Complete Wasp framework integration testing

### API Testing (`src/api/testing/`)

- [ ] **Mock Data System** (`mockData.js`) - Real SerpAPI and Google Maps response samples
- [ ] **API Test Framework** (`apiTest.js`) - MockTravelAPIModule with console logging
- [ ] **Validation System** (`../validation/cardValidator.js`) - StandardizedCard format compliance
- [ ] **Error Handling Tests** (`errorHandling.js`) - Network, API, and validation error scenarios
- [ ] **Performance Testing** (`performanceTests.js`) - Load testing and response time monitoring
- [ ] **Wasp Integration Tests** (`waspIntegration.js`) - Authentication and operation context testing

### Frontend Component Testing

- [ ] Modal functionality (InfoModal with ESC, backdrop click, z-index layering)
- [ ] Card system (CardList, Card components with action buttons)
- [ ] Button state management (Add/Remove from itinerary with confirmation)
- [ ] External link security (`target="_blank" rel="noopener noreferrer"`)
- [ ] Mobile responsiveness (Sidebar, MobileNavigation components)
- [ ] Authentication flow integration (Wasp auth system)

### Database & Operations Testing

- [ ] Itinerary management (CRUD operations via Wasp operations)
- [ ] Conversation persistence (Message and Conversation models)
- [ ] Authentication integration (Protected routes, login state)
- [ ] Parameter validation (ValidationService, ParameterMappingService)

### Performance Compliance

- [ ] 3-second API response time validation (per TODO.md requirement)
- [ ] Performance monitoring with grading system (EXCELLENT/GOOD/ACCEPTABLE/POOR)
- [ ] Memory usage tracking and optimization
- [ ] Load testing with concurrent users

### Test Data

Create test scenarios covering:

- Valid flight searches with various parameters
- Invalid inputs requiring clarification
- API timeout and error conditions
- Edge cases (no results, single result, many results)

---

## 7. Deployment & Environment Setup

### Environment Variables

**Required Environment Variables (.env.server):**

```env
# API Keys
SERP_API_KEY=your-serpapi-key
GOOGLE_MAPS_API_KEY=your-google-maps-key
OPENAI_API_KEY=your-openai-key

# Database (Wasp managed)
DATABASE_URL="file:./dev.db"

# Email (Development - Wasp Dummy provider)
# Production: Configure real email provider in main.wasp
```

**Optional Client Variables (.env.client):**

```env
REACT_APP_ENVIRONMENT=development
```

**Note:** Wasp automatically handles JWT secrets, session management, and authentication configuration as defined in `main.wasp`. No manual JWT or session configuration required.

### Development Setup

1. **Install Wasp CLI:**

    ```bash
    curl -sSL https://get.wasp.sh/installer.sh | sh
    ```

2. **Clone repository and setup:**

    ```bash
    git clone https://github.com/HongzhengL/justgo.ai.git
    cd justgo.ai
    ```

3. **Set environment variables:**
    - Create `.env.server` with required API keys
    - Create `.env.client` (optional)

4. **Database setup:**

    ```bash
    wasp db migrate-dev  # Create and apply migrations
    wasp db studio       # View database (optional)
    ```

5. **Start development server:**
    ```bash
    wasp start
    ```
    This starts both frontend (React) and backend (Node.js) servers automatically.

### Production Considerations

- **Wasp Deployment**: Use `wasp build` and deploy to platforms like Heroku, or DigitalOcean (Free with GitHub Edu Pack)
- **Database Migration**: Switch from SQLite to PostgreSQL for production
- **Email Provider**: Configure real email provider (SendGrid, Mailgun) in `main.wasp`
- **API Rate Limiting**: SerpAPI and Google Maps quota management
- **External Link Security**: All links use `target="_blank" rel="noopener noreferrer"`
- **Performance Monitoring**: 3-second response time compliance with built-in testing
- **Error Handling**: Comprehensive error logging via testing operations
- **Authentication Security**: Wasp handles JWT, sessions, and CSRF protection

### Wasp Framework Configuration

**Main Configuration (`main.wasp`):**

```wasp
app aiTravelPlanner {
  wasp: { version: "^0.16.6" },
  title: "AI Travel Planner",
  auth: {
    userEntity: User,
    methods: { email: { /* email verification, password reset */ } },
    onAuthFailedRedirectTo: "/login",
    onAuthSucceededRedirectTo: "/dashboard"
  },
  emailSender: { provider: Dummy } // Change to real provider for production
}
```

**Key Features:**

- Automatic authentication system with email/password
- Built-in session management and JWT handling
- Database management via Prisma ORM
- Type-safe operations (queries/actions) for frontend-backend communication
- Built-in deployment and build system

### Security & External Links

Secure external link handling includes URL validation to prevent XSS, opening in new tabs with security attributes, and tracking user interactions for analytics.

---

## 8. Definition of Done

### Feature Complete Criteria

- [ ] All acceptance criteria for user stories are met
- [ ] Unit and integration tests pass with >90% coverage
- [ ] Code review completed and approved
- [ ] Performance benchmarks met
- [ ] Error handling tested and verified
- [ ] Documentation updated

### Demo Ready Criteria

- [ ] System successfully handles predefined demo scenarios
- [ ] All API integrations working with test data
- [ ] UI/UX is polished and responsive
- [ ] Error states are user-friendly
- [ ] Performance is acceptable for demo load
- [ ] Monitoring and logging are in place

### Code Quality Standards

- TypeScript interfaces defined for all data structures
- ESLint/Prettier configuration applied
- Component prop validation implemented
- API response validation included
- Security best practices followed
- Accessibility guidelines met (WCAG 2.1 AA)

---

## 9. Future Considerations (Post v0.1.0)

### Scalability Preparation

- Message queuing for high-volume API requests
- Caching layer for common searches
- Database optimization for user data
- CDN setup for static assets

### Feature Expansion Points

- Additional API provider integrations
- User authentication and persistent accounts
- Advanced itinerary features (sharing, collaboration)
- Payment integration for bookings
- Real-time price tracking and alerts

### Technical Debt Management

- API abstraction improvements
- Frontend state management optimization
- Test coverage expansion
- Performance monitoring enhancement
