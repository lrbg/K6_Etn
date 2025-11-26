import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 5,
  duration: '1m',
};

const BASE_URL = 'https://wordpress-turistar-etn-production.onrender.com';

export default function () {
  let response = http.get(BASE_URL);
  
  check(response, {
    'status es 200': (r) => r.status === 200,
    'página carga en menos de 3s': (r) => r.timings.duration < 3000,
  });
  
  console.log(`Status: ${response.status} - Tiempo: ${response.timings.duration}ms`);
  sleep(1);
}