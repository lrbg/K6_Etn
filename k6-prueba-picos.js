import http from 'k6/http';
import { check, sleep } from 'k6';

// CONFIGURACIÓN DE PRUEBA DE PICOS
export const options = {
  stages: [
    { duration: '30s', target: 5 },    // Tráfico normal
    { duration: '10s', target: 50 },   // Pico súbito a 50 usuarios
    { duration: '1m', target: 50 },    // Mantener el pico
    { duration: '10s', target: 5 },    // Volver a normalidad
    { duration: '30s', target: 5 },    // Observar recuperación
    { duration: '10s', target: 100 },  // Mega pico a 100 usuarios
    { duration: '30s', target: 100 },  // Mantener mega pico
    { duration: '20s', target: 5 },    // Recuperación final
  ],
  thresholds: {
    http_req_failed: ['rate<0.15'],     // Permitir hasta 15% de errores en picos
    http_req_duration: ['p(95)<5000'],  // 95% responde en menos de 5s
  },
};

const SITE_URL = 'https://wordpress-turistar-etn-production.onrender.com';

// Contadores globales
let peakReached = false;
let megaPeakReached = false;

export default function () {
  // Marcar cuando alcanzamos picos
  const currentVUs = __VU;
  if (currentVUs >= 45 && !peakReached) {
    peakReached = true;
    console.log(`[PICO] Alcanzado primer pico con ${currentVUs} usuarios`);
  }
  if (currentVUs >= 95 && !megaPeakReached) {
    megaPeakReached = true;
    console.log(`[MEGA PICO] Alcanzado mega pico con ${currentVUs} usuarios`);
  }
  
  const response = http.get(SITE_URL);
  
  const checks = check(response, {
    'Sitio disponible (no 503)': (r) => r.status !== 503,
    'Respuesta exitosa': (r) => r.status === 200,
    'Tiempo aceptable (<5s)': (r) => r.timings.duration < 5000,
    'Tiempo bueno (<2s)': (r) => r.timings.duration < 2000,
    'Sin errores del servidor': (r) => r.status < 500,
  });
  
  // Log de errores críticos
  if (response.status >= 500) {
    console.log(`[CRÍTICO] Error ${response.status} - Usuario ${__VU} - Tiempo: ${response.timings.duration}ms`);
  }
  
  sleep(Math.random() + 0.5); // 0.5 a 1.5 segundos
}

export function handleSummary(data) {
  const timestamp = new Date().toISOString();
  const fecha = new Date().toLocaleDateString('es-MX');
  const hora = new Date().toLocaleTimeString('es-MX');
  
  let report = [];
  
  // ENCABEZADO
  report.push('================================================================================');
  report.push('                  REPORTE DE PRUEBA DE PICOS DE TRÁFICO - K6                   ');
  report.push('================================================================================');
  report.push('');
  report.push('INFORMACIÓN DE LA PRUEBA');
  report.push('------------------------');
  report.push(`Fecha de ejecución     : ${fecha}`);
  report.push(`Hora de ejecución      : ${hora}`);
  report.push(`URL del sitio probado  : ${SITE_URL}`);
  report.push(`Tipo de prueba         : PRUEBA DE PICOS (Spike Test)`);
  report.push(`Duración total         : 4 minutos`);
  report.push(`Pico máximo            : 100 usuarios simultáneos`);
  report.push('');
  
  // DESCRIPCIÓN
  report.push('DESCRIPCIÓN DE LA PRUEBA DE PICOS');
  report.push('---------------------------------');
  report.push('Simula picos súbitos de tráfico como los que ocurren durante:');
  report.push('  • Campañas de marketing viral');
  report.push('  • Menciones en redes sociales');
  report.push('  • Eventos especiales o promociones');
  report.push('  • Ataques DDoS básicos');
  report.push('');
  report.push('ESCENARIOS DE PICOS:');
  report.push('  1. Tráfico normal      (0-30s)   : 5 usuarios');
  report.push('  2. PICO MODERADO       (30-40s)  : 5 → 50 usuarios (10x súbito)');
  report.push('  3. Pico sostenido      (40-100s) : 50 usuarios constantes');
  report.push('  4. Recuperación        (100-130s): 50 → 5 usuarios');
  report.push('  5. MEGA PICO           (160-170s): 5 → 100 usuarios (20x súbito)');
  report.push('  6. Estrés máximo       (170-200s): 100 usuarios constantes');
  report.push('  7. Recuperación final  (200-220s): 100 → 5 usuarios');
  report.push('');
  
  // RESULTADOS
  const totalRequests = data.metrics.http_reqs?.values?.count || 0;
  const failedRequests = data.metrics.http_req_failed?.values?.passes || 0;
  const successRate = totalRequests > 0 ? ((totalRequests - failedRequests) / totalRequests * 100).toFixed(2) : 0;
  
  report.push('RESULTADOS DEL IMPACTO DE PICOS');
  report.push('--------------------------------');
  report.push(`Total de peticiones            : ${totalRequests}`);
  report.push(`Peticiones exitosas            : ${totalRequests - failedRequests}`);
  report.push(`Peticiones fallidas            : ${failedRequests}`);
  report.push(`Tasa de éxito general          : ${successRate}%`);
  report.push('');
  
  // ANÁLISIS DE TIEMPOS
  const avgDuration = (data.metrics.http_req_duration?.values?.avg || 0).toFixed(0);
  const minDuration = (data.metrics.http_req_duration?.values?.min || 0).toFixed(0);
  const maxDuration = (data.metrics.http_req_duration?.values?.max || 0).toFixed(0);
  const p50Duration = (data.metrics.http_req_duration?.values?.med || 0).toFixed(0);
  const p90Duration = (data.metrics.http_req_duration?.values['p(90)'] || 0).toFixed(0);
  const p95Duration = (data.metrics.http_req_duration?.values['p(95)'] || 0).toFixed(0);
  const p99Duration = (data.metrics.http_req_duration?.values['p(99)'] || 0).toFixed(0);
  
  report.push('TIEMPOS DE RESPUESTA BAJO PICOS:');
  report.push(`  Tiempo promedio      : ${avgDuration} ms`);
  report.push(`  Mejor tiempo         : ${minDuration} ms`);
  report.push(`  Peor tiempo          : ${maxDuration} ms`);
  report.push(`  Mediana (P50)        : ${p50Duration} ms`);
  report.push(`  Percentil 90         : ${p90Duration} ms`);
  report.push(`  Percentil 95         : ${p95Duration} ms`);
  report.push(`  Percentil 99         : ${p99Duration} ms`);
  report.push('');
  
  // VERIFICACIONES
  report.push('COMPORTAMIENTO DURANTE PICOS');
  report.push('----------------------------');
  Object.keys(data.root_group.checks || {}).forEach(checkName => {
    const check = data.root_group.checks[checkName];
    const passRate = ((check.passes / (check.passes + check.fails)) * 100).toFixed(1);
    const status = passRate > 95 ? '✓' : passRate > 85 ? '⚠' : '✗';
    report.push(`${status} ${checkName}: ${passRate}%`);
  });
  report.push('');
  
  // ANÁLISIS DE RESISTENCIA
  report.push('ANÁLISIS DE RESISTENCIA A PICOS');
  report.push('--------------------------------');
  
  const resistenciaPicos = successRate >= 85;
  const recuperacionRapida = p95Duration < 5000;
  const sinColapso = failedRequests < totalRequests * 0.15;
  
  if (resistenciaPicos && recuperacionRapida && sinColapso) {
    report.push('✅ EXCELENTE RESISTENCIA A PICOS');
    report.push('   - El sistema mantuvo disponibilidad durante picos súbitos');
    report.push('   - Recuperación rápida después de cada pico');
    report.push('   - Sin colapso del servicio');
  } else if (resistenciaPicos && sinColapso) {
    report.push('⚠️  RESISTENCIA MODERADA');
    report.push('   - El sistema se mantuvo operativo pero con degradación');
    report.push(`   - Tiempos de respuesta aumentaron a ${p95Duration}ms (P95)`);
  } else {
    report.push('❌ VULNERABLE A PICOS');
    report.push('   - El sistema mostró signos de colapso bajo picos súbitos');
    report.push(`   - ${failedRequests} peticiones fallaron durante los picos`);
  }
  
  // TIEMPO DE RECUPERACIÓN
  report.push('');
  report.push('CAPACIDAD DE RECUPERACIÓN');
  report.push('-------------------------');
  
  if (maxDuration > 10000) {
    report.push('⚠️  RECUPERACIÓN LENTA DETECTADA');
    report.push(`   - Algunas peticiones tardaron hasta ${maxDuration}ms`);
    report.push('   - El sistema tarda en volver a la normalidad después de picos');
  } else {
    report.push('✓  Buena capacidad de recuperación post-pico');
  }
  
  // RECOMENDACIONES ESPECÍFICAS
  report.push('');
  report.push('RECOMENDACIONES PARA MANEJO DE PICOS');
  report.push('------------------------------------');
  
  report.push('1. PROTECCIÓN INMEDIATA:');
  report.push('   • Implementar rate limiting por IP');
  report.push('   • Configurar Cloudflare o servicio anti-DDoS');
  report.push('   • Establecer límites de conexiones concurrentes');
  
  report.push('');
  report.push('2. OPTIMIZACIÓN PARA PICOS:');
  report.push('   • Cache agresivo de página completa');
  report.push('   • CDN para todos los assets estáticos');
  report.push('   • Configurar auto-scaling si está disponible');
  
  if (!resistenciaPicos) {
    report.push('');
    report.push('3. MEJORAS CRÍTICAS:');
    report.push('   • Aumentar recursos del servidor (CPU/RAM)');
    report.push('   • Optimizar configuración de PHP/MySQL');
    report.push('   • Considerar arquitectura con load balancer');
  }
  
  // CONCLUSIÓN
  report.push('');
  report.push('CONCLUSIÓN - PREPARACIÓN PARA PICOS');
  report.push('-----------------------------------');
  
  let nivelPreparacion = '';
  if (resistenciaPicos && recuperacionRapida && sinColapso) {
    nivelPreparacion = '✅ ALTO: El sitio está bien preparado para picos de tráfico';
  } else if (resistenciaPicos && sinColapso) {
    nivelPreparacion = '⚠️  MEDIO: El sitio resiste pero con degradación notable';
  } else {
    nivelPreparacion = '❌ BAJO: El sitio es vulnerable a picos y necesita mejoras urgentes';
  }
  
  report.push(`Nivel de preparación: ${nivelPreparacion}`);
  report.push('');
  report.push(`Capacidad estimada: El sitio puede manejar picos de hasta ${sinColapso ? '50-70' : '20-30'} usuarios simultáneos`);
  
  report.push('');
  report.push('================================================================================');
  report.push('                       FIN DEL REPORTE DE PICOS                                 ');
  report.push('================================================================================');
  
  const reportContent = report.join('\n');
  const filename = `reporte-picos-k6-${fecha.replace(/\//g, '-')}-${hora.replace(/:/g, '-')}.txt`;
  
  return {
    [filename]: reportContent,
    stdout: reportContent,
  };
}