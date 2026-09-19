import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface WelcomeState {
  /** El usuario ya eligió (iniciar sesión u omitir): no se vuelve a preguntar. */
  dismissed: boolean;
  dismiss: () => void;
}

// Solo local: es una decisión de este dispositivo, no se sincroniza.
export const useWelcomeStore = create<WelcomeState>()(
  persist(
    (set) => ({
      dismissed: false,
      dismiss: () => set({ dismissed: true }),
    }),
    {
      name: 'bilbo-welcome',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
