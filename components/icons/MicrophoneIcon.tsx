import React from 'react';

const MicrophoneIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5a6 6 0 00-6-6v-1.5a6 6 0 00-6 6v1.5a6 6 0 006 6zM12 12.75h.008v.008H12v-.008z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 12c0 3.105 2.484 5.625 5.625 5.625h1.75c3.14 0 5.625-2.52 5.625-5.625S18.016 6.375 14.875 6.375h-1.75C9.984 6.375 7.5 8.895 7.5 12z" />
    </svg>
);

export default MicrophoneIcon;
