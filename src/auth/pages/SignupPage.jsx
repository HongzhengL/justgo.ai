import { SignupForm } from "wasp/client/auth";
import { Link } from "wasp/client/router";
import "../auth.css";

export function SignupPage() {
    return (
        <div className="auth-container">
            <div className="auth-card">
                <h1 className="auth-title">Create Account</h1>
                <p className="auth-subtitle">
                    Join AI Travel Planner and start planning your next adventure
                </p>

                <SignupForm />

                <div className="auth-links">
                    <p>
                        Already have an account? <Link to="/login">Log in</Link>
                    </p>
                </div>

                <div className="auth-terms">
                    <p>
                        By creating an account, you agree to our Terms of Service and Privacy
                        Policy.
                    </p>
                </div>
            </div>
        </div>
    );
}
