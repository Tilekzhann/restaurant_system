// components/Button.tsx
"use client";

import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Основной текст кнопки */
  children: React.ReactNode;
  /** Дополнительные классы Tailwind или любые другие */
  className?: string;
}

/**
 * Универсальный компонент кнопки.
 * Принимает все стандартные props для <button>,
 * а также children и опциональный className.
 */
const Button: React.FC<ButtonProps> = ({
  children,
  className = "",
  ...rest
}) => {
  return (
    <button
      {...rest}
      className={`px-4 py-2 rounded focus:outline-none focus:ring ${
        rest.disabled
          ? "bg-gray-400 cursor-not-allowed"
          : "bg-blue-500 hover:bg-blue-600"
      } text-white ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;
