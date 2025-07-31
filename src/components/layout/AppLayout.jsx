import React, { useState } from "react";
import { useAuth } from "wasp/client/auth";
import Sidebar from "./Sidebar.jsx";
import MobileNavigation from "./MobileNavigation.jsx";
import "./layout.css";
import "../card.css";
import "../cardlist.css";

export default function AppLayout({ children }) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { data: user } = useAuth();

    if (!user) {
        return children; // No layout for unauthenticated users
    }

    return (
        <div className="app-layout">
            <Sidebar
                user={user}
                onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            />

            <MobileNavigation
                user={user}
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
            />

            <main className="main-content">{children}</main>

            {isMobileMenuOpen && (
                <div className="mobile-overlay" onClick={() => setIsMobileMenuOpen(false)} />
            )}
        </div>
    );
}
