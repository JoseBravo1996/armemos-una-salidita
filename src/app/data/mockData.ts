export interface User {
  id: string;
  name: string;
  avatar: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  latitude: number;
  longitude: number;
  image?: string;
  participants: User[];
  createdBy: string;
  category: 'bar' | 'restaurant' | 'park' | 'cafe' | 'activity' | 'other';
}

export interface VotingOption {
  id: string;
  name: string;
  location: string;
  image: string;
  votes: string[]; // user IDs
}

export interface Notification {
  id: string;
  type: 'join' | 'vote' | 'reminder' | 'update';
  message: string;
  eventId: string;
  timestamp: string;
  read: boolean;
}

export const currentUser: User = {
  id: '1',
  name: 'Vos',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop'
};

export const users: User[] = [
  currentUser,
  {
    id: '2',
    name: 'Juan',
    avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop'
  },
  {
    id: '3',
    name: 'María',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop'
  },
  {
    id: '4',
    name: 'Lucas',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop'
  },
  {
    id: '5',
    name: 'Sofía',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop'
  },
  {
    id: '6',
    name: 'Diego',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop'
  }
];

export const events: Event[] = [
  {
    id: '1',
    title: 'After Office en Palermo',
    description: 'Juntada después del laburo para tomar algo y relajar',
    date: '2026-03-25',
    time: '21:00',
    location: 'The Temple Bar, Palermo',
    latitude: -34.5875,
    longitude: -58.4200,
    image: 'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=800&h=400&fit=crop',
    participants: [users[0], users[1], users[2], users[3]],
    createdBy: '2',
    category: 'bar'
  },
  {
    id: '2',
    title: 'Picnic en los Bosques',
    description: 'Día de parque con mates, música y buena onda',
    date: '2026-03-29',
    time: '16:00',
    location: 'Bosques de Palermo',
    latitude: -34.5639,
    longitude: -58.4172,
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=400&fit=crop',
    participants: [users[0], users[2], users[4], users[5]],
    createdBy: '1',
    category: 'park'
  },
  {
    id: '3',
    title: 'Cena en San Telmo',
    description: 'Probemos ese restaurante nuevo que recomendó Sofi',
    date: '2026-04-02',
    time: '20:30',
    location: 'La Brigada, San Telmo',
    latitude: -34.6211,
    longitude: -58.3731,
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=400&fit=crop',
    participants: [users[0], users[1], users[4]],
    createdBy: '4',
    category: 'restaurant'
  },
  {
    id: '4',
    title: 'Café y trabajo',
    description: 'Sesión de estudio/trabajo en café tranqui',
    date: '2026-03-27',
    time: '10:00',
    location: 'Lattente, Recoleta',
    latitude: -34.5875,
    longitude: -58.3942,
    image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&h=400&fit=crop',
    participants: [users[0], users[2]],
    createdBy: '3',
    category: 'cafe'
  },
  {
    id: '5',
    title: 'Fútbol 5',
    description: 'Partido de fútbol - necesitamos 2 personas más!',
    date: '2026-03-26',
    time: '19:00',
    location: 'Cancha Premium, Villa Crespo',
    latitude: -34.5989,
    longitude: -58.4394,
    participants: [users[0], users[1], users[3], users[5]],
    createdBy: '5',
    category: 'activity'
  }
];

export const votingOptions: VotingOption[] = [
  {
    id: 'v1',
    name: 'The Temple Bar',
    location: 'Palermo Soho',
    image: 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=400&h=300&fit=crop',
    votes: ['1', '2', '3']
  },
  {
    id: 'v2',
    name: 'Cervecería Antares',
    location: 'Palermo Hollywood',
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&h=300&fit=crop',
    votes: ['4']
  },
  {
    id: 'v3',
    name: 'Nicky Harrison',
    location: 'Palermo',
    image: 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=400&h=300&fit=crop',
    votes: ['5', '6']
  }
];

export const notifications: Notification[] = [
  {
    id: 'n1',
    type: 'join',
    message: 'Juan se unió al evento "After Office en Palermo"',
    eventId: '1',
    timestamp: '2026-03-24T14:30:00',
    read: false
  },
  {
    id: 'n2',
    type: 'reminder',
    message: 'Evento mañana a las 21hs: After Office en Palermo',
    eventId: '1',
    timestamp: '2026-03-24T09:00:00',
    read: false
  },
  {
    id: 'n3',
    type: 'vote',
    message: 'María votó por The Temple Bar',
    eventId: '1',
    timestamp: '2026-03-23T18:45:00',
    read: true
  },
  {
    id: 'n4',
    type: 'update',
    message: 'Diego actualizó el evento "Fútbol 5"',
    eventId: '5',
    timestamp: '2026-03-23T16:20:00',
    read: true
  },
  {
    id: 'n5',
    type: 'join',
    message: 'Sofía se unió al evento "Picnic en los Bosques"',
    eventId: '2',
    timestamp: '2026-03-23T12:15:00',
    read: true
  }
];

export const discoverEvents: Event[] = [
  {
    id: 'd1',
    title: 'Yoga en el Rosedal',
    description: 'Clase de yoga al aire libre, todos los niveles',
    date: '2026-03-28',
    time: '08:00',
    location: 'Rosedal de Palermo',
    latitude: -34.5656,
    longitude: -58.4156,
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=400&fit=crop',
    participants: [users[2], users[4]],
    createdBy: '7',
    category: 'activity'
  },
  {
    id: 'd2',
    title: 'Noche de juegos de mesa',
    description: 'Juegos de mesa, cerveza artesanal y pizza',
    date: '2026-03-30',
    time: '20:00',
    location: 'Gameon Café, Villa Urquiza',
    latitude: -34.5717,
    longitude: -58.4828,
    image: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=800&h=400&fit=crop',
    participants: [users[3]],
    createdBy: '8',
    category: 'cafe'
  },
  {
    id: 'd3',
    title: 'Tour gastronómico Chinatown',
    description: 'Recorrido probando comidas de diferentes lugares',
    date: '2026-04-05',
    time: '19:00',
    location: 'Barrio Chino, Belgrano',
    latitude: -34.5653,
    longitude: -58.4536,
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&h=400&fit=crop',
    participants: [users[1], users[5]],
    createdBy: '9',
    category: 'restaurant'
  }
];
