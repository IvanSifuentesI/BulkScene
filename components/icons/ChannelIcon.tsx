
import React from 'react';

const ChannelIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5a6 6 0 00-6-6v-1.5a6 6 0 00-6 6v1.5a6 6 0 006 6z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 12.75h0" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75h0" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15.75h0" />
        <path strokeLinecap="round" strokeLinejoin="round"d="M8.25 9.75h0" />
        <path strokeLinecap="round" strokeLinejoin="round"d="M15.75 9.75h0" />
        <path strokeLinecap="round" strokeLinejoin="round"d="M12 6.75h0" />
    </svg>
);

export default ChannelIcon;
