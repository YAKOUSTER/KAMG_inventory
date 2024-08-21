import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

export const addReturn = async (returnInfo) => {
  const response = await axios.post(`${API_URL}/returns`, returnInfo);
  return response.data;
};
