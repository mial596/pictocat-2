import React, { useEffect, useMemo } from 'react';
import { CheckCircleIcon, ExclamationCircleIcon, InfoCircleIcon } from '../hooks/Icons.tsx';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type = 'info', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000); // Disappear after 4 seconds

    return () => {
      clearTimeout(timer);
    };
  }, [onClose]);

  const toastDetails = useMemo(() => {
    switch (type) {
      case 'success':
        return {
          icon: <CheckCircleIcon className="w-6 h-6 text-green-400" />,
          style: 'bg-green-600/80 border-green-400/50',
        };
      case 'error':
        return {
          icon: <ExclamationCircleIcon className="w-6 h-6 text-red-400" />,
          style: 'bg-red-600/80 border-red-400/50',
        };
      case 'info':
      default:
        return {
          icon: <InfoCircleIcon className="w-6 h-6 text-sky-400" />,
          style: 'bg-liver/90 border-buff/50',
        };
    }
  }, [type]);

  return (
    <div
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-4 text-seasalt font-bold py-3 px-6 max-w-[90vw] rounded-xl z-50 toast-animation border backdrop-blur-md shadow-lg ${toastDetails.style}`}
    >
      {toastDetails.icon}
      <span>{message}</span>
    </div>
  );
};

export default Toast;
