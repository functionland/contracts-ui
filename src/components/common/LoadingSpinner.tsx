import CircularProgress from '@mui/material/CircularProgress'
import type { FC } from 'react'

interface LoadingSpinnerProps {
  readonly size?: 'small' | 'medium' | 'large'
  readonly color?: 'primary' | 'secondary' | 'inherit'
  readonly className?: string
}

export const LoadingSpinner: FC<LoadingSpinnerProps> = ({
  size = 'medium',
  color = 'primary',
  className = '',
}) => {
  const sizeMap = {
    small: 24,
    medium: 40,
    large: 56,
  } as const // Make the object immutable

  return (
    <div className={`flex justify-center items-center ${className}`}>
      <CircularProgress
        size={sizeMap[size]}
        color={color}
        thickness={4}
        aria-label="Loading"
      />
    </div>
  )
}
