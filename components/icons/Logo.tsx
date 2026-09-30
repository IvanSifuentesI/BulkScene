import React from 'react';

const Logo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1.22 14.67L9.5 15.11l1.22-1.22 1.28 1.28V7.5h-1v4.64l-1.28-1.28-1.22 1.22 2.78 2.78 1.44-1.44-.01.01.01-.01 1.44-1.44L17.28 12l-2.78-2.78-1.22 1.22 1.28 1.28V12.5h1v-4.64l1.28 1.28 1.22-1.22L14.72 5.33l-2.72 2.72v.01l.01-.01-2.72 2.72 2.78 2.78.01.01zM14.5 15.11l-1.28-1.28v2.64l1.28-1.28z" />
    </svg>
);

export default Logo;
