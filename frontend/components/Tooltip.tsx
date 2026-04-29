import { useState } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

export default function Tooltip({ content, children, placement = 'top' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const placementStyles = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowStyles = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-accent-blue border-r-transparent border-b-transparent border-l-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-accent-blue border-r-transparent border-t-transparent border-l-transparent',
    left: 'right-full top-1/2 -translate-y-1/2 border-l-accent-blue border-t-transparent border-b-transparent border-r-transparent',
    right: 'left-full top-1/2 -translate-y-1/2 border-r-accent-blue border-t-transparent border-b-transparent border-l-transparent',
  };

  return (
    <div className="relative inline-flex items-center">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="cursor-help"
      >
        {children}
      </div>
      
      {isVisible && (
        <>
          <div
            className={`absolute z-50 px-4 py-3 bg-accent-blue text-white text-sm rounded-lg shadow-xl max-w-xs whitespace-pre-line ${placementStyles[placement]}`}
          >
            {content}
          </div>
          <div
            className={`absolute z-50 w-0 h-0 border-4 ${arrowStyles[placement]}`}
          />
        </>
      )}
    </div>
  );
}