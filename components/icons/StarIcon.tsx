// Fix: Implementing the StarIcon component.
import React from 'react';

const StarIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.324h5.385a.563.563 0 01.328.959l-4.184 3.033a.563.563 0 00-.178.643l1.558 4.596a.563.563 0 01-.816.62l-4.224-2.477a.563.563 0 00-.59 0l-4.224 2.477a.563.563 0 01-.816-.62l1.558-4.596a.563.563 0 00-.178-.643L2.43 9.893a.563.563 0 01.328-.959h5.385a.563.563 0 00.475-.324L11.48 3.5z" />
    </svg>
);

export default StarIcon;
