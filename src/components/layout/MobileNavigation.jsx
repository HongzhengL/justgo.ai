import React from "react";
import { Link, useLocation } from "react-router-dom";
import { logout } from "wasp/client/auth";

export default function MobileNavigation({ user, isOpen, onClose }) {
    const location = useLocation();

    const isActive = (path) => {
        if (path === "/dashboard") {
            return location.pathname === "/dashboard";
        }
        return location.pathname.startsWith(path);
    };

    const handleLogout = () => {
        logout();
        onClose();
    };

    const handleLinkClick = () => {
        onClose();
    };

    return (
        <div className={`mobile-navigation ${isOpen ? "open" : ""}`}>
            {/* Mobile Header */}
            <div className="mobile-header">
                <h1 className="sidebar-brand">🌍 AI Travel Planner</h1>
                <button
                    className="mobile-close-btn"
                    onClick={onClose}
                    aria-label="Close navigation menu"
                >
                    ✕
                </button>
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
                    onClick={handleLinkClick}
                >
                    <span className="nav-link-icon">💬</span>
                    Chat
                </Link>

                <Link
                    to="/my-itinerary"
                    className={`nav-link ${isActive("/my-itinerary") ? "active" : ""}`}
                    onClick={handleLinkClick}
                >
                    <span className="nav-link-icon">📋</span>
                    My Itinerary
                </Link>
            </nav>

            {/* Footer with Logout */}
            <div className="sidebar-footer">
                <button onClick={handleLogout} className="logout-btn">
                    <span>🚪</span>
                    Logout
                </button>
            </div>
        </div>
    );
}
