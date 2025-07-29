import React, { useEffect } from "react";

export function ConfirmDialog({
    isOpen,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    onConfirm,
    onCancel,
    isLoading = false,
}) {
    // Handle escape key
    useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (event) => {
            if (event.key === "Escape" && !isLoading) {
                onCancel();
            }
        };

        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [isOpen, isLoading, onCancel]);

    if (!isOpen) return null;

    return (
        <div
            className="confirm-dialog-overlay"
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1000,
            }}
            onClick={!isLoading ? onCancel : undefined}
        >
            <div
                className="confirm-dialog-content"
                style={{
                    backgroundColor: "white",
                    borderRadius: "8px",
                    padding: "2rem",
                    maxWidth: "400px",
                    width: "90%",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.25rem", fontWeight: "600" }}>
                    {title}
                </h3>
                <p style={{ margin: "0 0 2rem 0", color: "#666", lineHeight: "1.5" }}>{message}</p>

                {isLoading && (
                    <div style={{ textAlign: "center", margin: "1rem 0" }}>
                        <div
                            className="loading-spinner"
                            style={{
                                display: "inline-block",
                                width: "20px",
                                height: "20px",
                                border: "2px solid #f3f3f3",
                                borderTop: "2px solid #007bff",
                                borderRadius: "50%",
                                animation: "spin 1s linear infinite",
                            }}
                        />
                    </div>
                )}

                <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                    <button
                        onClick={onCancel}
                        disabled={isLoading}
                        style={{
                            padding: "0.75rem 1.5rem",
                            border: "1px solid #dee2e6",
                            borderRadius: "6px",
                            backgroundColor: "white",
                            color: "#333",
                            cursor: isLoading ? "not-allowed" : "pointer",
                            opacity: isLoading ? 0.6 : 1,
                        }}
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        style={{
                            padding: "0.75rem 1.5rem",
                            border: "none",
                            borderRadius: "6px",
                            backgroundColor: "#dc3545",
                            color: "white",
                            cursor: isLoading ? "not-allowed" : "pointer",
                            opacity: isLoading ? 0.6 : 1,
                        }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
