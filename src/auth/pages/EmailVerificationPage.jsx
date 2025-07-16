import { VerifyEmailForm } from "wasp/client/auth";
import { Link } from "wasp/client/router";
import "../auth.css";

export function EmailVerificationPage() {
    return (
        <div className="auth-container">
            <div className="auth-card">
                <h1 className="auth-title">Verify Your Email</h1>
                <p className="auth-subtitle">
                    Please check your email and click the verification link to activate your
                    account.
                </p>

                <VerifyEmailForm />

                <div className="auth-links">
                    <p>
                        Need help? <Link to="/login">Back to Login</Link>
                    </p>
                </div>

                <div className="auth-info">
                    <p>Didn&apos;t receive the email? Check your spam folder or contact support.</p>
                </div>
            </div>
        </div>
    );
}
