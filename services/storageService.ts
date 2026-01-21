import { Note, User } from '../types';

const STORAGE_KEY_USERS = 'gemini_notes_users';
const STORAGE_KEY_NOTES = 'gemini_notes_data';

export const storageService = {
  // User Management
  getUsers: (): User[] => {
    const data = localStorage.getItem(STORAGE_KEY_USERS);
    return data ? JSON.parse(data) : [];
  },

  saveUser: (user: User): void => {
    const users = storageService.getUsers();
    users.push(user);
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
  },

  findUser: (username: string): User | undefined => {
    const users = storageService.getUsers();
    return users.find((u) => u.username === username);
  },

  // Note Management
  getNotes: (userId: string): Note[] => {
    const data = localStorage.getItem(STORAGE_KEY_NOTES);
    const allNotes: Note[] = data ? JSON.parse(data) : [];
    return allNotes.filter((note) => note.userId === userId);
  },

  saveNote: (note: Note): void => {
    const data = localStorage.getItem(STORAGE_KEY_NOTES);
    const allNotes: Note[] = data ? JSON.parse(data) : [];
    const existingIndex = allNotes.findIndex((n) => n.id === note.id);

    if (existingIndex >= 0) {
      allNotes[existingIndex] = note;
    } else {
      allNotes.push(note);
    }
    localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(allNotes));
  },

  deleteNote: (noteId: string): void => {
    const data = localStorage.getItem(STORAGE_KEY_NOTES);
    if (!data) return;
    const allNotes: Note[] = JSON.parse(data);
    const filteredNotes = allNotes.filter((n) => n.id !== noteId);
    localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(filteredNotes));
  },
};
