import http from 'k6/http';
import { check, sleep } from 'k6';

// Configuración de la prueba: sube a 50 usuarios concurrentes para una prueba segura
export let options = {
  stages: [
    { duration: '30s', target: 50 },  
    { duration: '1m', target: 50 },  
    { duration: '30s', target: 0 },    
  ],
};

export default function () {
  // URL real de tu backend local corriendo en el puerto 3001 (host.docker.internal para que Docker vea tu PC)
  let res = http.get('http://host.docker.internal:3001/api/ecommerce/products');
  
  check(res, {
    'status was 200': (r) => r.status == 200
  });
  
  sleep(1);
}
