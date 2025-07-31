import React from "react";

export function ConfirmationModal({
    isOpen,
    title,
    message,
    confirmText,
    cancelText = "Cancel",
    onConfirm,
    onCancel,
    confirmButtonColor,
    icon,
}) {
    if (!isOpen) return null;

    return (
        <div
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
        >
            <div
                style={{
                    backgroundColor: "white",
                    padding: "2rem",
                    borderRadius: "8px",
                    maxWidth: "400px",
                    margin: "1rem",
                }}
            >
                <h3
                    style={{
                        marginBottom: "1rem",
                        color: confirmButtonColor,
                    }}
                >
                    {icon} {title}
                </h3>
                <p
                    style={{
                        marginBottom: "1.5rem",
                        color: "#495057",
                    }}
                >
                    {message}
                </p>
                <div
                    style={{
                        display: "flex",
                        gap: "1rem",
                        justifyContent: "flex-end",
                    }}
                >
                    <button
                        onClick={onCancel}
                        style={{
                            padding: "0.5rem 1rem",
                            backgroundColor: "#6c757d",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                        }}
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        style={{
                            padding: "0.5rem 1rem",
                            backgroundColor: confirmButtonColor,
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                        }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
