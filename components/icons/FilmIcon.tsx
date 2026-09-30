import React from 'react';

const FilmIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 20.25h12m-7.5-3.75v3.75m-3.75-3.75v3.75m0-3.75H18v-1.5a3 3 0 00-3-3h-3a3 3 0 00-3 3v1.5H6m0-3.75v-1.5a3 3 0 013-3h3a3 3 0 013 3v1.5m-12 0v-1.5a3 3 0 013-3h3a3 3 0 013 3v1.5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 3.75H4.5v16.5H6v-16.5zM18 3.75h1.5v16.5H18v-16.5z" />
  </svg>
);

export default FilmIcon;