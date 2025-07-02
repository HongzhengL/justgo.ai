import { LoginForm } from "wasp/client/auth";
import { Link } from "wasp/client/router";

export function LoginPage() {
    return (
        <div className="auth-container">
            <div className="auth-card">
                <h1 className="auth-title">Welcome Back</h1>
                <p className="auth-subtitle">Sign in to your AI Travel Planner account</p>

                <LoginForm />

                <div className="auth-links">
                    <p>
                        Don't have an account? <Link to="/signup">Sign up</Link>
                    </p>
                    <p>
                        <Link to="/password-reset">Forgot your password?</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
