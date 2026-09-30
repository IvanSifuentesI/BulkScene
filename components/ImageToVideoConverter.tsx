import React, { useState, useEffect, useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";

// --- Helper Functions ---

/**
 * Converts a File object to a base64 encoded string, without the data URI prefix.
 * @param file The image file to convert.
 * @returns A promise that resolves with the base64 string.
 */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // The API expects just the base64 data, not the full data URI
      const base64Data = result.split(',')[1];
      if (base64Data) {
        resolve(base64Data);
      } else {
        reject(new Error("Failed to extract base64 data from file."));
      }
    };
    reader.onerror = (error) => reject(error);
  });
};


// --- UI Components ---

const Spinner: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);


// --- Main Component ---

interface ImageToVideoConverterProps {
    apiKey: string | null;
}

/**
 * A self-contained component to convert an image to a video using the Gemini API.
 * It manages its own state for the image file, prompt, loading status, and video result.
 */
const ImageToVideoConverter: React.FC<ImageToVideoConverterProps> = ({ apiKey }) => {
    // State for the component
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [prompt, setPrompt] = useState<string>('Subtle animation of this image, gentle movement.');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [progressMessage, setProgressMessage] = useState<string>('');
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    // Clean up object URLs on component unmount or when the file changes
    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            if (generatedVideoUrl) URL.revokeObjectURL(generatedVideoUrl);
        };
    }, [previewUrl, generatedVideoUrl]);

    /**
     * Handles the user selecting a file.
     */
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // Clean up old URLs
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            if (generatedVideoUrl) URL.revokeObjectURL(generatedVideoUrl);
            
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setGeneratedVideoUrl(null);
            setError(null);
        }
    };

    /**
     * The core logic for generating the video.
     */
    const handleGenerateVideo = useCallback(async () => {
        if (!imageFile) {
            setError("Please select an image first.");
            return;
        }
        
        // Ensure API Key is available from props
        if (!apiKey) {
            setError("API_KEY not set. Please configure it in the app settings.");
            return;
        }

        // 1. Set loading state and reset previous results
        setIsLoading(true);
        setError(null);
        setGeneratedVideoUrl(null);
        setProgressMessage('Preparing image...');

        try {
            // 2. Initialize the Gemini AI Client
            const ai = new GoogleGenAI({ apiKey });
            
            // 3. Convert the image file to a base64 string for the API
            const base64Image = await fileToBase64(imageFile);
            setProgressMessage('Image prepared. Sending request to generate video...');
            
            // 4. Call the `generateVideos` endpoint
            // This starts the long-running video generation operation.
            let operation = await ai.models.generateVideos({
                model: 'veo-3.1-fast-generate-preview', // A good default model
                prompt: prompt || 'Animate this image.',
                image: {
                    imageBytes: base64Image,
                    mimeType: imageFile.type,
                },
                config: {
                    numberOfVideos: 1,
                    aspectRatio: '16:9', // Or derive from image dimensions
                }
            });

            // 5. Poll for the result of the operation
            setProgressMessage('Video generation started. Waiting for completion (this can take a few minutes)...');
            while (!operation.done) {
                // Wait for 10 seconds before checking the status again
                await new Promise(resolve => setTimeout(resolve, 10000));
                setProgressMessage('Checking video status...');
                operation = await ai.operations.getVideosOperation({ operation: operation });
            }

            // 6. Check for errors in the completed operation
            if (operation.error) {
                throw new Error(`Video generation failed: ${operation.error.message}`);
            }

            // 7. Get the download link for the generated video
            const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
            if (!downloadLink) {
                throw new Error('Operation finished but no video link was found.');
            }
            
            // 8. Download the video file
            setProgressMessage('Video generated! Downloading...');
            // IMPORTANT: The API key must be appended to the download URL
            const videoResponse = await fetch(`${downloadLink}&key=${apiKey}`);
            if (!videoResponse.ok) {
                throw new Error(`Failed to download video: ${videoResponse.statusText}`);
            }

            // 9. Create a local URL for the video to display it
            const videoBlob = await videoResponse.blob();
            const videoObjectUrl = URL.createObjectURL(videoBlob);
            
            setGeneratedVideoUrl(videoObjectUrl);
            setProgressMessage('Video successfully generated and downloaded.');

        } catch (e) {
            const err = e as Error;
            console.error("Video generation process failed:", err);
            setError(err.message);
        } finally {
            // 10. Reset loading state
            setIsLoading(false);
        }
    }, [imageFile, prompt, apiKey]);

    return (
        <div className="max-w-4xl mx-auto p-8 bg-slate-900 text-white font-sans rounded-xl">
            <h1 className="text-3xl font-bold text-center mb-6">Image to Video Converter (Veo)</h1>
            
            <div className="space-y-6">
                {/* --- Input Section --- */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">1. Upload Image</label>
                    <input
                        type="file"
                        accept="image/png, image/jpeg"
                        onChange={handleFileChange}
                        disabled={isLoading}
                        className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100"
                    />
                </div>
                
                {previewUrl && (
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Image Preview</label>
                        <img src={previewUrl} alt="Image preview" className="max-w-xs rounded-lg border-2 border-slate-700" />
                    </div>
                )}

                <div>
                    <label htmlFor="prompt-input" className="block text-sm font-medium text-slate-300 mb-2">2. Animation Prompt</label>
                    <textarea
                        id="prompt-input"
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        placeholder="e.g., A gentle zoom in, snowing lightly"
                        disabled={isLoading}
                        className="w-full h-24 bg-slate-800 rounded-lg p-3 text-slate-200 outline-none ring-1 ring-slate-700 focus:ring-rose-500 transition-all"
                    />
                </div>

                {/* --- Action Button --- */}
                <button
                    onClick={handleGenerateVideo}
                    disabled={isLoading || !imageFile}
                    className="w-full px-6 py-3 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 font-semibold transition-all flex items-center justify-center gap-2 text-lg"
                >
                    {isLoading ? <Spinner /> : '✨ Generate Video'}
                </button>

                {/* --- Status & Result Section --- */}
                {isLoading && (
                    <div className="text-center p-4 bg-slate-800 rounded-lg">
                        <p className="text-slate-300">{progressMessage}</p>
                    </div>
                )}
                
                {error && (
                    <div className="text-center p-4 bg-red-900/50 border border-red-500 rounded-lg">
                        <p className="font-semibold text-red-300">Error:</p>
                        <p className="text-red-400 text-sm mt-1">{error}</p>
                    </div>
                )}

                {generatedVideoUrl && (
                    <div className="space-y-3">
                         <h2 className="text-xl font-semibold text-center text-green-400">Video Generated!</h2>
                         <video src={generatedVideoUrl} controls autoPlay loop className="w-full rounded-lg border-2 border-green-500" />
                         <a 
                            href={generatedVideoUrl} 
                            download={`video_${imageFile?.name.split('.')[0] || 'generated'}.mp4`}
                            className="block w-full text-center px-6 py-3 rounded-lg bg-slate-700 hover:bg-slate-600 font-semibold transition-colors"
                         >
                            Download Video
                         </a>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImageToVideoConverter;