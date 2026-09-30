import React from 'react';

const CloudIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        {/* Fix: Replaced multiple incorrect SVG paths with the correct path for a cloud icon. */}
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-2.087-5.421 3.75 3.75 0 00-6.65-2.25H6.75a4.5 4.5 0 00-4.5 4.5v.75z" />
    </svg>
);

export default CloudIcon;