import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { logout } from "wasp/client/auth";
import { useAction } from "wasp/client/operations";
import { clearConversation } from "wasp/client/operations";
import { ConfirmDialog } from "../ConfirmDialog.jsx";

export default function Sidebar({ user, onMobileMenuToggle }) {
    const location = useLocation();
    const [showClearDialog, setShowClearDialog] = useState(false);
    const clearConversationFn = useAction(clearConversation);
    const [isClearing, setIsClearing] = useState(false);

    const isActive = (path) => {
        if (path === "/dashboard") {
            return location.pathname === "/dashboard";
        }
        return location.pathname.startsWith(path);
    };

    const handleLogout = () => {
        logout();
    };

    const handleClearConversation = () => {
        setShowClearDialog(true);
    };

    const handleConfirmClear = async () => {
        setIsClearing(true);
        try {
            await clearConversationFn({});
            window.location.reload();
        } catch (error) {
            console.error("Failed to clear conversation:", error);
            alert("Failed to clear conversation. Please try again.");
        } finally {
            setIsClearing(false);
            setShowClearDialog(false);
        }
    };

    const handleCancelClear = () => {
        setShowClearDialog(false);
    };

    return (
        <div className="sidebar">
            {/* Header with Brand */}
            <div className="sidebar-header">
                <button
                    className="hamburger-btn"
                    onClick={onMobileMenuToggle}
                    aria-label="Toggle navigation menu"
                >
                    ☰
                </button>
                <h1 className="sidebar-brand">JustGo.ai</h1>
            </div>

            {/* User Info */}
            <div className="user-info">
                <div>Welcome back!</div>
                <div className="user-email">{user.email}</div>
            </div>

            {/* Navigation Links */}
            <nav className="sidebar-nav">
                <Link
                    to="/dashboard"
                    className={`nav-link ${isActive("/dashboard") ? "active" : ""}`}
                >
                    <span className="nav-link-icon">Chat</span>
                </Link>

                <Link
                    to="/my-itinerary"
                    className={`nav-link ${isActive("/my-itinerary") ? "active" : ""}`}
                >
                    <span className="nav-link-icon">Itinerary</span>
                </Link>

                <button onClick={handleClearConversation} className="nav-link nav-link-button">
                    <span className="nav-link-icon">Clear</span>
                </button>
            </nav>

            {/* Footer with Logout */}
            <div className="sidebar-footer">
                <button onClick={handleLogout} className="logout-btn">
                    <span>Logout</span>
                </button>
            </div>

            <ConfirmDialog
                isOpen={showClearDialog}
                title="Clear Conversation"
                message="Are you sure you want to clear all chat history? This action cannot be undone."
                onConfirm={handleConfirmClear}
                onCancel={handleCancelClear}
                isLoading={isClearing}
                confirmText="Clear"
                cancelText="Cancel"
            />
        </div>
    );
}
