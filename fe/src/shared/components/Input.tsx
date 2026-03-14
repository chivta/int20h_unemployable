import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export function Input({ className = '', ...props }: InputProps) {
  return (
    <input
      {...props}
      className={[
        'block w-full rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900',
        'placeholder:text-gray-400',
        'focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      ].join(' ')}
    />
  )
}
