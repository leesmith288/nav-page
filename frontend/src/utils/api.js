// API configuration
const API_BASE_URL = import.meta.env.DEV 
  ? 'http://localhost:8787/api' 
  : 'https://nav-page-worker.baidu2.workers.dev/api';

export const api = {
  async loadTiles() {
    const response = await fetch(`${API_BASE_URL}/tiles`);
    if (!response.ok) throw new Error('Failed to load tiles');
    const data = await response.json();
    return data.tiles || [];
  },

  async saveTiles(tiles) {
    const response = await fetch(`${API_BASE_URL}/tiles`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tiles })
    });
    if (!response.ok) throw new Error('Failed to save tiles');
    return response.json();
  },

  async loadColorMeanings() {
    const response = await fetch(`${API_BASE_URL}/colorMeanings`);
    if (!response.ok) throw new Error('Failed to load color meanings');
    const data = await response.json();
    return data.colorMeanings || {};
  },

  async saveColorMeanings(colorMeanings) {
    const response = await fetch(`${API_BASE_URL}/colorMeanings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ colorMeanings })
    });
    if (!response.ok) throw new Error('Failed to save color meanings');
    return response.json();
  }
};
