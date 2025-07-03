import { ForgotPasswordForm, ResetPasswordForm } from "wasp/client/auth";
import { Link } from "wasp/client/router";
import { useLocation } from "react-router-dom";
import "../auth.css";

export function PasswordResetPage() {
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const token = searchParams.get("token");

    return (
        <div className="auth-container">
            <div className="auth-card">
                {token ? (
                    // Reset password form (when user clicks email link with token)
                    <>
                        <h1 className="auth-title">Reset Your Password</h1>
                        <p className="auth-subtitle">Enter your new password below</p>

                        <ResetPasswordForm />

                        <div className="auth-links">
                            <p>
                                Remember your password? <Link to="/login">Back to Login</Link>
                            </p>
                        </div>
                    </>
                ) : (
                    // Forgot password form (initial form)
                    <>
                        <h1 className="auth-title">Forgot Password?</h1>
                        <p className="auth-subtitle">
                            Enter your email address and we'll send you a link to reset your
                            password.
                        </p>

                        <ForgotPasswordForm />

                        <div className="auth-links">
                            <p>
                                Remember your password? <Link to="/login">Back to Login</Link>
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
