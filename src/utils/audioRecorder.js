/**
 * Audio Recording Utilities for Voice Input
 * Handles browser audio recording with Web Audio API
 */

export const startRecording = async () => {
    console.log("Requesting microphone access...");
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                sampleRate: 16000,
                channelCount: 1,
                echoCancellation: true,
                noiseSuppression: true,
            },
        });
        console.log("Microphone access granted");

        // Check supported MIME types
        let mimeType = "audio/webm";
        if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = "audio/ogg";
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = "audio/mp4";
            }
        }
        console.log("Using MIME type:", mimeType);

        const mediaRecorder = new MediaRecorder(stream, {
            mimeType: mimeType,
            audioBitsPerSecond: 16000,
        });
        const audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
            console.log("Received audio chunk:", event.data.size, "bytes");
            audioChunks.push(event.data);
        };

        // Request data every 1 second
        mediaRecorder.start(1000);
        console.log("MediaRecorder started");

        return {
            stop: () => {
                return new Promise((resolve) => {
                    mediaRecorder.onstop = async () => {
                        console.log("MediaRecorder stopped");

                        // Create audio blob
                        const audioBlob = new Blob(audioChunks, { type: mimeType });
                        console.log(
                            "Audio blob created, size:",
                            audioBlob.size,
                            "type:",
                            audioBlob.type,
                        );

                        // Convert to base64 for sending
                        const reader = new FileReader();
                        reader.readAsDataURL(audioBlob);
                        reader.onloadend = () => {
                            const base64Audio = reader.result.split(",")[1];
                            resolve(base64Audio);
                        };

                        stream.getTracks().forEach((track) => track.stop());
                    };
                    mediaRecorder.stop();
                });
            },
        };
    } catch (error) {
        console.error("Error starting recording:", error);
        throw error;
    }
};
