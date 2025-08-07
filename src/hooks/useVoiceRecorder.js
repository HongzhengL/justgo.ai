import { useState, useCallback } from "react";
import { startRecording } from "../utils/audioRecorder";

export const useVoiceRecorder = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [recorder, setRecorder] = useState(null);

    const startVoiceRecording = useCallback(async () => {
        console.log("Starting voice recording...");
        try {
            const newRecorder = await startRecording();
            console.log("Recording started successfully");
            setRecorder(newRecorder);
            setIsRecording(true);
        } catch (error) {
            console.error("Failed to start recording:", error);
            alert("Could not access microphone. Please check permissions.");
        }
    }, []);

    const stopVoiceRecording = useCallback(async () => {
        console.log("Stopping voice recording...");
        if (recorder) {
            try {
                const audioBlob = await recorder.stop();
                console.log("Recording stopped, blob size:", audioBlob.size);
                setIsRecording(false);
                setRecorder(null);
                return audioBlob;
            } catch (error) {
                console.error("Failed to stop recording:", error);
                setIsRecording(false);
                setRecorder(null);
            }
        }
    }, [recorder]);

    return {
        isRecording,
        startVoiceRecording,
        stopVoiceRecording,
    };
};
