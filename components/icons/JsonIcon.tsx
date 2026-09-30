import React from 'react';

const JsonIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.03 1.121 0 1.131.094 1.976 1.057 1.976 2.192V7.5M8.25 7.5h7.5M8.25 7.5v9c0 1.135.845 2.098 1.976 2.192.373.03.748.03 1.121 0 1.131-.094 1.976-1.057 1.976-2.192V7.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5h.01M3 12h.01M3 16.5h.01M21 7.5h-.01M21 12h-.01M21 16.5h-.01" />
    </svg>
);

export default JsonIcon;
