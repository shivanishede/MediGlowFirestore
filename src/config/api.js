import axios from 'axios';

// This grabs the base URL from your environment variables in Vite (.env file)
// Fallback to current host on port 5000 for local network testing (Mobile/Tablet)
const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000/api`;

const api = axios.create({
    baseURL: API_URL,
});

export default api;
