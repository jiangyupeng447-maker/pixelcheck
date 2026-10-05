import type { Review, Screen } from '../types'

export const mockReviews: Review[] = [
  {
    id: 'checkout',
    title: 'Checkout Page',
    status: 'issues',
    issues: 8,
    updatedAt: '2h ago',
    author: 'You',
  },
  {
    id: 'login',
    title: 'Login Page',
    status: 'passed',
    issues: 0,
    updatedAt: 'Yesterday',
    author: 'You',
  },
  {
    id: 'home-dashboard',
    title: 'Home Dashboard',
    status: 'in-review',
    issues: 3,
    updatedAt: '2d ago',
    author: 'You',
  },
  {
    id: 'product-detail',
    title: 'Product Detail',
    status: 'issues',
    issues: 6,
    updatedAt: '4d ago',
    author: 'You',
  },
]

export const mockScreens: Screen[] = [
  { id: 's1', index: '01', name: 'Checkout - Summary', issues: 8 },
  { id: 's2', index: '02', name: 'Checkout - Payment', issues: 2 },
  { id: 's3', index: '03', name: 'Checkout - Confirmation', issues: 0 },
]

