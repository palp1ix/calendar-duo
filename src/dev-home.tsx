import React from 'react';
import {createRoot} from 'react-dom/client';
import DevHome from './components/dev/DevHome';
import './style.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><DevHome/></React.StrictMode>);
