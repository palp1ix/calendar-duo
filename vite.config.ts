import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],base:process.env.VITE_BASE_PATH || '/calendar-duo/',build:{rollupOptions:{input:{main:'index.html',devHome:'dev-home.html'}}}});
