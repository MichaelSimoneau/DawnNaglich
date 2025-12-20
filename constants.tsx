
import { Service } from './types';

export const ADMIN_EMAILS = [
  'dawn.naglich@gmail.com',
  'michael@brainycouch.com',
  'don.negligent@gmail.com'
];

export const SERVICES: Service[] = [
  {
    id: 'ma-1',
    title: 'Muscle Activation',
    description: 'Targeted sessions to identify and reactivate dormant muscles, reducing pain and improving mobility.',
    duration: 60,
    price: '$120',
    icon: 'fa-bolt-lightning'
  },
  {
    id: 'st-1',
    title: 'Functional Stretching',
    description: 'Guided stretching focused on realigning the body and loosening long-term muscle tension.',
    duration: 45,
    price: '$90',
    icon: 'fa-child-reaching'
  },
  {
    id: 'hr-1',
    title: 'Healing Realignment',
    description: 'Combined physical therapy principles and massage techniques for total body recovery.',
    duration: 90,
    price: '$165',
    icon: 'fa-leaf'
  }
];
