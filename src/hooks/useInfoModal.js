import { useState } from "react";

export default function useInfoModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedCard, setSelectedCard] = useState(null);

    const openModal = (cardData) => {
        setSelectedCard(cardData);
        setIsOpen(true);
    };

    const closeModal = () => {
        setIsOpen(false);
        setSelectedCard(null);
    };

    const modalProps = {
        isOpen,
        onClose: closeModal,
        cardData: selectedCard
    };

    return {
        isOpen,
        selectedCard,
        openModal,
        closeModal,
        modalProps
    };
}