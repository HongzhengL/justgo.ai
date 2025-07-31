import { useAuth } from "wasp/client/auth";
import { Link } from "wasp/client/router";
import "./Main.css";
import "./components/landing.css";

export const MainPage = () => {
    const { data: user, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "100vh",
                    fontFamily: "Arial, sans-serif",
                }}
            >
                <div>Loading...</div>
            </div>
        );
    }

    // If user is authenticated, redirect to dashboard
    if (user) {
        return (
            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "100vh",
                    fontFamily: "Arial, sans-serif",
                    textAlign: "center",
                }}
            >
                <div>
                    <h2>Welcome back, {user.email}!</h2>
                    <p>You&apos;re already logged in.</p>
                    <Link
                        to="/dashboard"
                        style={{
                            display: "inline-block",
                            padding: "0.75rem 1.5rem",
                            backgroundColor: "#007bff",
                            color: "white",
                            textDecoration: "none",
                            borderRadius: "6px",
                            fontSize: "1rem",
                        }}
                    >
                        Go to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    // Landing page for unauthenticated users
    return (
        <div
            style={{
                minHeight: "100vh",
                fontFamily: "Arial, sans-serif",
                backgroundColor: "#f8f9fa",
            }}
        >
            {/* Navigation Header */}
            <nav className="landing-nav">
                <h1 className="landing-brand">AI Travel Planner</h1>
                <div className="landing-nav-buttons">
                    <Link
                        to="/login"
                        style={{
                            padding: "0.5rem 1rem",
                            color: "#007bff",
                            textDecoration: "none",
                            border: "1px solid #007bff",
                            borderRadius: "4px",
                            transition: "all 0.2s",
                        }}
                    >
                        Login
                    </Link>
                    <Link
                        to="/signup"
                        style={{
                            padding: "0.5rem 1rem",
                            backgroundColor: "#007bff",
                            color: "white",
                            textDecoration: "none",
                            border: "1px solid #007bff",
                            borderRadius: "4px",
                            transition: "all 0.2s",
                        }}
                    >
                        Sign Up
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="hero-section">
                <div className="hero-content">
                    <h1 className="hero-title">Plan Your Perfect Trip with AI ✈️</h1>
                    <p className="hero-subtitle">
                        Discover flights and hotels, explore places, and create personalized
                        itineraries with our intelligent travel planning assistant. Get complete
                        travel packages in one search!
                    </p>

                    <div className="hero-buttons">
                        <Link to="/signup" className="cta-button-primary">
                            Get Started Free
                        </Link>
                        <Link to="/login" className="cta-button-secondary">
                            I Have an Account
                        </Link>
                    </div>

                    {/* Features Section */}
                    <div className="feature-grid">
                        <div className="feature-card">
                            <span className="feature-icon">🛫</span>
                            <h3 className="feature-title">Smart Flight & Hotel Search</h3>
                            <p className="feature-description">
                                Find the best flight deals and hotel options automatically. Our AI
                                searches for both flights and accommodation in one request.
                            </p>
                        </div>

                        <div className="feature-card">
                            <span className="feature-icon">🏨</span>
                            <h3 className="feature-title">Smart Hotel Recommendations</h3>
                            <p className="feature-description">
                                Get personalized hotel suggestions based on your flight destination,
                                with ratings, amenities, and instant booking options.
                            </p>
                        </div>

                        <div className="feature-card">
                            <span className="feature-icon">🗺️</span>
                            <h3 className="feature-title">Place Discovery</h3>
                            <p className="feature-description">
                                Discover amazing restaurants, attractions, and hidden gems tailored
                                to your interests.
                            </p>
                        </div>

                        <div className="feature-card">
                            <span className="feature-icon">📝</span>
                            <h3 className="feature-title">Custom Itineraries</h3>
                            <p className="feature-description">
                                Create, save, and share personalized travel itineraries with all
                                your trip details.
                            </p>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="landing-footer">
                <p className="footer-text">© 2025 AI Travel Planner. Built with Wasp framework.</p>
            </footer>
        </div>
    );
};
