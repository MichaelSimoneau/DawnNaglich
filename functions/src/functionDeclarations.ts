import { Type, FunctionDeclaration } from '@google/genai';

export const getEventsDeclaration: FunctionDeclaration = {
  name: 'getCalendarEvents',
  parameters: {
    type: Type.OBJECT,
    description:
      'Fetch current schedule. Essential for context before booking or cancelling.',
    properties: {
      timeMin: { type: Type.STRING },
      timeMax: { type: Type.STRING },
    },
    required: ['timeMin', 'timeMax'],
  },
};

export const createEventDeclaration: FunctionDeclaration = {
  name: 'createCalendarEvent',
  parameters: {
    type: Type.OBJECT,
    description:
      'Pre-schedule a session. This triggers a confirmation request to Dawn.',
    properties: {
      clientName: { type: Type.STRING },
      service: { type: Type.STRING },
      startTime: { type: Type.STRING },
      endTime: { type: Type.STRING },
      summary: {
        type: Type.STRING,
        description: 'A brief summary of what you are doing.',
      },
    },
    required: ['clientName', 'service', 'startTime', 'endTime', 'summary'],
  },
};

export const cancelEventDeclaration: FunctionDeclaration = {
  name: 'cancelCalendarEvent',
  parameters: {
    type: Type.OBJECT,
    description:
      'Remove a session. This triggers a confirmation request to Dawn.',
    properties: {
      eventId: { type: Type.STRING },
      summary: {
        type: Type.STRING,
        description: 'Briefly state which event is being removed.',
      },
    },
    required: ['eventId', 'summary'],
  },
};

export const confirmActionDeclaration: FunctionDeclaration = {
  name: 'confirmPendingAction',
  parameters: {
    type: Type.OBJECT,
    description:
      'Call this ONLY when Dawn explicitly confirms the previous request (e.g. says "Yes", "Do it", "Confirm").',
    properties: {},
    required: [],
  },
};

export const allToolDeclarations = [
  getEventsDeclaration,
  createEventDeclaration,
  cancelEventDeclaration,
  confirmActionDeclaration,
];

