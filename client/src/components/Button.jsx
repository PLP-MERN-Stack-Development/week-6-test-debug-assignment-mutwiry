import React from 'react';
import clsx from 'clsx';

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  className = '',
  type = 'button',
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
    warning: 'bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500'
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };
  
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed btn-disabled' : 'cursor-pointer';
  
  const buttonClasses = clsx(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    disabledClasses,
    className
  );

  return (
    <button
      type={type}
      className={buttonClasses}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button; 