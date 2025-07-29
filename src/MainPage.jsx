import { useAuth } from "wasp/client/auth";
import { Link } from "wasp/client/router";
import "./Main.css";

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
            <nav
                style={{
                    backgroundColor: "white",
                    padding: "1rem 2rem",
                    borderBottom: "1px solid #dee2e6",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                <h1 style={{ margin: 0, color: "#333", fontSize: "1.5rem" }}>AI Travel Planner</h1>
                <div style={{ display: "flex", gap: "1rem" }}>
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
            <main style={{ padding: "4rem 2rem", textAlign: "center" }}>
                <div style={{ maxWidth: "800px", margin: "0 auto" }}>
                    <h1
                        style={{
                            fontSize: "3rem",
                            marginBottom: "1rem",
                            color: "#333",
                            fontWeight: "bold",
                        }}
                    >
                        Plan Your Perfect Trip with AI ✈️
                    </h1>
                    <p
                        style={{
                            fontSize: "1.25rem",
                            color: "#6c757d",
                            marginBottom: "2rem",
                            lineHeight: "1.6",
                        }}
                    >
                        Discover flights and hotels, explore places, and create personalized
                        itineraries with our intelligent travel planning assistant. Get complete
                        travel packages in one search!
                    </p>

                    <div style={{ marginBottom: "3rem" }}>
                        <Link
                            to="/signup"
                            style={{
                                display: "inline-block",
                                padding: "1rem 2rem",
                                backgroundColor: "#007bff",
                                color: "white",
                                textDecoration: "none",
                                borderRadius: "8px",
                                fontSize: "1.1rem",
                                fontWeight: "bold",
                                marginRight: "1rem",
                                transition: "all 0.2s",
                            }}
                        >
                            Get Started Free
                        </Link>
                        <Link
                            to="/login"
                            style={{
                                display: "inline-block",
                                padding: "1rem 2rem",
                                color: "#007bff",
                                textDecoration: "none",
                                border: "2px solid #007bff",
                                borderRadius: "8px",
                                fontSize: "1.1rem",
                                transition: "all 0.2s",
                            }}
                        >
                            I Have an Account
                        </Link>
                    </div>

                    {/* Features Section */}
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                            gap: "2rem",
                            marginTop: "4rem",
                        }}
                    >
                        <div
                            style={{
                                backgroundColor: "white",
                                padding: "2rem",
                                borderRadius: "12px",
                                boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                            }}
                        >
                            <div
                                style={{
                                    fontSize: "2rem",
                                    marginBottom: "1rem",
                                }}
                            >
                                🛫
                            </div>
                            <h3 style={{ color: "#333", marginBottom: "1rem" }}>
                                Smart Flight & Hotel Search
                            </h3>
                            <p style={{ color: "#6c757d", fontSize: "0.9rem" }}>
                                Find the best flight deals and hotel options automatically. Our AI
                                searches for both flights and accommodation in one request.
                            </p>
                        </div>

                        <div
                            style={{
                                backgroundColor: "white",
                                padding: "2rem",
                                borderRadius: "12px",
                                boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                            }}
                        >
                            <div
                                style={{
                                    fontSize: "2rem",
                                    marginBottom: "1rem",
                                }}
                            >
                                🏨
                            </div>
                            <h3 style={{ color: "#333", marginBottom: "1rem" }}>
                                Smart Hotel Recommendations
                            </h3>
                            <p style={{ color: "#6c757d", fontSize: "0.9rem" }}>
                                Get personalized hotel suggestions based on your flight destination,
                                with ratings, amenities, and instant booking options.
                            </p>
                        </div>

                        <div
                            style={{
                                backgroundColor: "white",
                                padding: "2rem",
                                borderRadius: "12px",
                                boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                            }}
                        >
                            <div
                                style={{
                                    fontSize: "2rem",
                                    marginBottom: "1rem",
                                }}
                            >
                                🗺️
                            </div>
                            <h3 style={{ color: "#333", marginBottom: "1rem" }}>Place Discovery</h3>
                            <p style={{ color: "#6c757d", fontSize: "0.9rem" }}>
                                Discover amazing restaurants, attractions, and hidden gems tailored
                                to your interests.
                            </p>
                        </div>

                        <div
                            style={{
                                backgroundColor: "white",
                                padding: "2rem",
                                borderRadius: "12px",
                                boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                            }}
                        >
                            <div
                                style={{
                                    fontSize: "2rem",
                                    marginBottom: "1rem",
                                }}
                            >
                                📝
                            </div>
                            <h3 style={{ color: "#333", marginBottom: "1rem" }}>
                                Custom Itineraries
                            </h3>
                            <p style={{ color: "#6c757d", fontSize: "0.9rem" }}>
                                Create, save, and share personalized travel itineraries with all
                                your trip details.
                            </p>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer
                style={{
                    backgroundColor: "#343a40",
                    color: "white",
                    padding: "2rem",
                    textAlign: "center",
                    marginTop: "4rem",
                }}
            >
                <p style={{ margin: 0, fontSize: "0.9rem" }}>
                    © 2025 AI Travel Planner. Built with Wasp framework.
                </p>
            </footer>
        </div>
    );
};
