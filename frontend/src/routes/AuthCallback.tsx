import { useEffect } from 'react';
import axios from 'axios';

import { API_URL } from '../config';

const CLIENT_ID = process.env.REACT_APP_CLIENT_ID || 'auth-service-client';

let exchangeStarted = false;

export const AuthCallback: React.FC = () => {
  useEffect(() => {
    if (exchangeStarted) return;
    exchangeStarted = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (!code) {
      window.location.replace('/dashboard');
      return;
    }

    axios
      .post(`${API_URL}/auth/token`, {
        grant_type: 'authorization_code',
        code,
        client_id: CLIENT_ID,
        redirect_uri: `${window.location.origin}/auth/callback`,
      })
      .then((response) => {
        const { access_token, refresh_token } = response.data;
        localStorage.setItem('jwt', access_token);
        if (refresh_token) {
          localStorage.setItem('refresh_token', refresh_token);
        }
        window.location.replace('/dashboard');
      })
      .catch(() => {
        window.location.replace('/dashboard');
      });
  }, []);

  return null;
};
