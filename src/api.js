import { API_URL } from './config';
async function get(path) {
  const r = await fetch(API_URL + path);
  if (!r.ok) throw new Error('API ' + r.status);
  return r.json();
}
// Expected backend responses are described in README.md
export const getLeaderboard = (type = 'traders') => get(`/leaderboard?type=${type}`);
export const getLaunches = () => get('/launches');
export const getCandles = (mint, range) => get(`/launches/${mint}/candles?range=${range}`);
