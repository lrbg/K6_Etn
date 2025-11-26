import http from 'k6/http';
import { check, sleep } from 'k6';

// CONFIGURACIÓN DE PRUEBA DE ESTRÉS
export const options = {
  stages: [
    { duration: '2m', target: 10 },  // Subir a 10 usuarios en 2 minutos
    { duration: '3m', target: 20 },  // Subir a 20 usuarios en 3 minutos
    { duration: '3m', target: 225 },  // Subir a 30 usuarios en 3 minutos
    { duration: '2m', target: 0 },   // Bajar a 0 usuarios en 2 minutos
  ],
  thresholds: {
    http_req_failed: ['rate<0.1'],      // Menos del 10% de errores
    http_req_duration: ['p(95)<4000'],  // 95% responde en menos de 4s
    http_req_duration: ['p(99)<6000'],  // 99% responde en menos de 6s
  },
};

const SITE_URL = 'https://wordpress-turistar-etn-production.onrender.com';
const ENDPOINTS = [
  { name: 'Página Principal', url: SITE_URL },
  { name: 'aviso-privasidad', url: `https://etn.com.mx/aviso-privacidad.html` },
  { name: 'quienes somos', url: `https://etn.com.mx/quienes-somos.html` },
  { name: 'preguntas frecuentes', url: `https://etn.com.mx/preguntas-frecuentes.html` },
  { name: 'terminos y condiciones', url: `https://etn.com.mx/terminos-condiciones.html` },
  { name: 'paqueteria', url: `https://etn.com.mx/pack-multienlace/` },
  { name: 'facturacion', url: `https://venta.etn.com.mx/request.aspx?PRGNAME=Facturacion` },
  { name: 'facturacion', url: `https://venta.etn.com.mx/request.aspx?PRGNAME=Facturacion` },
  
];

// Variables para estadísticas
let requestCount = 0;
let errorCount = 0;

export default function () {
  // Seleccionar endpoint aleatorio
  const endpoint = ENDPOINTS[Math.floor(Math.random() * ENDPOINTS.length)];
  
  // Realizar petición
  const response = http.get(endpoint.url);
  requestCount++;
  
  // Verificaciones
  const checkResult = check(response, {
    'Status es 200': (r) => r.status === 200,
    'Status es 404': (r) => r.status === 404,
    'Respuesta en menos de 4s': (r) => r.timings.duration < 4000,
    'Respuesta en menos de 2s': (r) => r.timings.duration < 2000,
    'Servidor no sobrecargado (no 503)': (r) => r.status !== 503,
    'Sin errores del servidor (5xx)': (r) => r.status < 500,
  });
  
  if (response.status >= 400) {
    errorCount++;
  }
  
  // Log detallado para debugging
  if (response.status !== 200 && response.status !== 404) {
    console.log(`[ERROR] ${endpoint.name}: Status ${response.status} - Tiempo: ${response.timings.duration}ms`);
  }
  
  // Simular comportamiento real del usuario
  sleep(Math.random() * 2 + 1); // Entre 1 y 3 segundos
}

export function handleSummary(data) {
  const timestamp = new Date().toISOString();
  const fecha = new Date().toLocaleDateString('es-MX');
  const hora = new Date().toLocaleTimeString('es-MX');
  
  let report = [];
  
  // ENCABEZADO
  report.push('================================================================================');
  report.push('                    REPORTE DE PRUEBA DE ESTRÉS - K6                            ');
  report.push('================================================================================');
  report.push('');
  report.push('INFORMACIÓN DE LA PRUEBA');
  report.push('------------------------');
  report.push(`Fecha de ejecución     : ${fecha}`);
  report.push(`Hora de ejecución      : ${hora}`);
  report.push(`URL del sitio probado  : ${SITE_URL}`);
  report.push(`Tipo de prueba         : PRUEBA DE ESTRÉS (Stress Test)`);
  report.push(`Duración total         : 10 minutos`);
  report.push(`Usuarios máximos       : 30 usuarios virtuales concurrentes`);
  report.push('');
  
  // DESCRIPCIÓN
  report.push('DESCRIPCIÓN DE LA PRUEBA DE ESTRÉS');
  report.push('----------------------------------');
  report.push('Esta prueba incrementa gradualmente la carga para encontrar el punto de quiebre:');
  report.push('');
  report.push('FASES DE LA PRUEBA:');
  report.push('  1. CALENTAMIENTO (0-2 min)   : 0 → 10 usuarios');
  report.push('  2. CARGA NORMAL (2-5 min)    : 10 → 20 usuarios');
  report.push('  3. ESTRÉS (5-8 min)          : 20 → 30 usuarios');
  report.push('  4. RECUPERACIÓN (8-10 min)   : 30 → 0 usuarios');
  report.push('');
  report.push('ENDPOINTS PROBADOS:');
  ENDPOINTS.forEach(ep => {
    report.push(`  - ${ep.name}: ${ep.url}`);
  });
  report.push('');
  
  // RESULTADOS
  const totalRequests = data.metrics.http_reqs?.values?.count || 0;
  const failedRequests = data.metrics.http_req_failed?.values?.passes || 0;
  const successRate = totalRequests > 0 ? ((totalRequests - failedRequests) / totalRequests * 100).toFixed(2) : 0;
  
  report.push('RESULTADOS GENERALES');
  report.push('--------------------');
  report.push(`Total de peticiones HTTP       : ${totalRequests}`);
  report.push(`Peticiones exitosas            : ${totalRequests - failedRequests}`);
  report.push(`Peticiones fallidas            : ${failedRequests}`);
  report.push(`Tasa de éxito                  : ${successRate}%`);
  report.push(`Datos descargados              : ${((data.metrics.data_received?.values?.count || 0) / 1024 / 1024).toFixed(2)} MB`);
  report.push(`Datos enviados                 : ${((data.metrics.data_sent?.values?.count || 0) / 1024).toFixed(2)} KB`);
  report.push('');
  
  // ANÁLISIS POR FASES
  report.push('ANÁLISIS DE RENDIMIENTO');
  report.push('-----------------------');
  const avgDuration = (data.metrics.http_req_duration?.values?.avg || 0).toFixed(0);
  const minDuration = (data.metrics.http_req_duration?.values?.min || 0).toFixed(0);
  const maxDuration = (data.metrics.http_req_duration?.values?.max || 0).toFixed(0);
  const p50Duration = (data.metrics.http_req_duration?.values?.med || 0).toFixed(0);
  const p90Duration = (data.metrics.http_req_duration?.values['p(90)'] || 0).toFixed(0);
  const p95Duration = (data.metrics.http_req_duration?.values['p(95)'] || 0).toFixed(0);
  const p99Duration = (data.metrics.http_req_duration?.values['p(99)'] || 0).toFixed(0);
  
  report.push('TIEMPOS DE RESPUESTA:');
  report.push(`  Promedio general     : ${avgDuration} ms`);
  report.push(`  Tiempo mínimo        : ${minDuration} ms`);
  report.push(`  Tiempo máximo        : ${maxDuration} ms`);
  report.push(`  Mediana (P50)        : ${p50Duration} ms`);
  report.push(`  Percentil 90         : ${p90Duration} ms`);
  report.push(`  Percentil 95         : ${p95Duration} ms`);
  report.push(`  Percentil 99         : ${p99Duration} ms`);
  report.push('');
  
  // VERIFICACIONES
  report.push('VERIFICACIONES REALIZADAS');
  report.push('-------------------------');
  Object.keys(data.root_group.checks || {}).forEach(checkName => {
    const check = data.root_group.checks[checkName];
    const passRate = ((check.passes / (check.passes + check.fails)) * 100).toFixed(1);
    const status = passRate == 100 ? '✓' : passRate > 90 ? '⚠' : '✗';
    report.push(`${status} ${checkName}: ${passRate}% (${check.passes}/${check.passes + check.fails})`);
  });
  report.push('');
  
  // PUNTO DE QUIEBRE
  report.push('ANÁLISIS DEL PUNTO DE QUIEBRE');
  report.push('------------------------------');
  
  if (p95Duration > 4000) {
    report.push('⚠️  PUNTO DE DEGRADACIÓN DETECTADO');
    report.push(`   - El percentil 95 (${p95Duration}ms) supera los 4 segundos`);
    report.push(`   - El sistema comienza a degradarse con más de 20 usuarios concurrentes`);
  } else {
    report.push('✓  El sistema manejó bien la carga de 30 usuarios');
  }
  
  if (failedRequests > totalRequests * 0.01) {
    report.push('');
    report.push('⚠️  ERRORES BAJO ESTRÉS');
    report.push(`   - Se detectaron ${failedRequests} errores (${(failedRequests/totalRequests*100).toFixed(2)}%)`);
    report.push('   - El sistema puede necesitar mejoras en el manejo de concurrencia');
  }
  
  // RECOMENDACIONES
  report.push('');
  report.push('RECOMENDACIONES BASADAS EN LA PRUEBA DE ESTRÉS');
  report.push('-----------------------------------------------');
  
  if (avgDuration > 2000 || p95Duration > 4000) {
    report.push('1. OPTIMIZACIÓN DE RENDIMIENTO URGENTE:');
    report.push('   • Implementar caché agresivo (Redis/Memcached)');
    report.push('   • Optimizar consultas a base de datos');
    report.push('   • Considerar escalar verticalmente el servidor');
  }
  
  if (maxDuration > 10000) {
    report.push('');
    report.push('2. PROBLEMAS DE TIMEOUT:');
    report.push('   • Revisar consultas lentas en la base de datos');
    report.push('   • Implementar índices en tablas grandes');
    report.push('   • Considerar paginación para contenido pesado');
  }
  
  report.push('');
  report.push('3. PREPARACIÓN PARA PICOS DE TRÁFICO:');
  report.push('   • Configurar auto-scaling si es posible');
  report.push('   • Implementar rate limiting para protección');
  report.push('   • Considerar un CDN para contenido estático');
  
  // CAPACIDAD ESTIMADA
  report.push('');
  report.push('CAPACIDAD ESTIMADA DEL SISTEMA');
  report.push('------------------------------');
  
  let capacidadUsuarios = 30;
  if (p95Duration > 4000) capacidadUsuarios = 20;
  if (p95Duration > 6000) capacidadUsuarios = 15;
  if (failedRequests > totalRequests * 0.05) capacidadUsuarios = 10;
  
  report.push(`Usuarios concurrentes recomendados: ${capacidadUsuarios}`);
  report.push(`Capacidad máxima antes de degradación: ${capacidadUsuarios * 1.5} usuarios`);
  report.push('');
  
  // CONCLUSIÓN
  report.push('CONCLUSIÓN DE LA PRUEBA DE ESTRÉS');
  report.push('---------------------------------');
  
  if (successRate >= 99 && p95Duration < 3000) {
    report.push('✅ EXCELENTE: El sistema maneja muy bien el estrés y tiene buena escalabilidad.');
  } else if (successRate >= 95 && p95Duration < 5000) {
    report.push('✅ BUENO: El sistema resiste bien pero hay oportunidades de mejora.');
  } else if (successRate >= 90 && p95Duration < 8000) {
    report.push('⚠️  REGULAR: El sistema muestra signos de estrés y necesita optimización.');
  } else {
    report.push('❌ CRÍTICO: El sistema no maneja bien la carga y requiere acción inmediata.');
  }
  
  report.push('');
  report.push('================================================================================');
  report.push('                         FIN DEL REPORTE DE ESTRÉS                              ');
  report.push('================================================================================');
  
  const reportContent = report.join('\n');
  const filename = `reporte-estres-k6-${fecha.replace(/\//g, '-')}-${hora.replace(/:/g, '-')}.txt`;
  
  return {
    [filename]: reportContent,
    stdout: reportContent,
  };
}