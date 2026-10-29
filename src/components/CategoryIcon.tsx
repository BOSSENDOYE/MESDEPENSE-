import type { Category } from '../types';

const SIZES = {
  sm: 'h-9 w-9 text-lg',
  md: 'h-11 w-11 text-xl',
} as const;

export function CategoryIcon({ category, size = 'md' }: { category: Category; size?: keyof typeof SIZES }) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full ${SIZES[size]}`}
      style={{ backgroundColor: `${category.color}2e`, boxShadow: `inset 0 0 0 2px ${category.color}` }}
    >
      {category.icon}
    </span>
  );
}
