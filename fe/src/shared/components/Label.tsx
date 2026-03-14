import type { LabelHTMLAttributes } from 'react'

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {}

export function Label({ className = '', children, ...props }: LabelProps) {
  return (
    <label
      {...props}
      className={['block text-xs font-medium text-gray-600', className].join(' ')}
    >
      {children}
    </label>
  )
}
