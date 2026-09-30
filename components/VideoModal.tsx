import React, { memo } from 'react';

interface VideoModalProps {
    videoUrl: string;
    onClose: () => void;
}

const VideoModal: React.FC<VideoModalProps> = ({ videoUrl, onClose }) => {
    
    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4 animate-fade-in" 
            onClick={onClose}
        >
            <div className="relative w-full max-w-md aspect-[9/16]" onClick={(e) => e.stopPropagation()}>
                <video 
                    src={videoUrl} 
                    controls
                    autoPlay
                    className="w-full h-full object-contain rounded-lg shadow-2xl bg-black"
                />
                <button 
                    onClick={onClose} 
                    className="absolute -top-3 -right-3 bg-slate-700 rounded-full p-2 text-white hover:bg-red-500 transition-colors"
                    aria-label="Cerrar vista de video"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default memo(VideoModal);
