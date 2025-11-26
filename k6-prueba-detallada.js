import http from 'k6/http';
import { check, sleep } from 'k6';

// CONFIGURACIÓN DE LA PRUEBA
export const options = {
  vus: 5,
  duration: '1m',
  thresholds: {
    http_req_failed: ['rate<0.1'],
    http_req_duration: ['p(95)<3000'],
  },
};

const SITE_URL = 'https://wordpress-turistar-etn-production.onrender.com';

// FUNCIÓN PRINCIPAL DE PRUEBA
export default function () {
  let response = http.get(SITE_URL);
  
  check(response, {
    'Status HTTP 200 OK': (r) => r.status === 200,
    'Tiempo de respuesta < 3 segundos': (r) => r.timings.duration < 3000,
    'Tiempo de respuesta < 2 segundos': (r) => r.timings.duration < 2000,
    'Tiempo de respuesta < 1 segundo': (r) => r.timings.duration < 1000,
    'El sitio contiene WordPress': (r) => r.body && (r.body.includes('WordPress') || r.body.includes('wp-content')),
  });
  
  sleep(1);
}

// GENERADOR DE REPORTE PERSONALIZADO
export function handleSummary(data) {
  const timestamp = new Date().toISOString();
  const fecha = new Date().toLocaleDateString('es-MX');
  const hora = new Date().toLocaleTimeString('es-MX');
  
  // Construir el reporte
  let report = [];
  
  // ENCABEZADO
  report.push('================================================================================');
  report.push('                        REPORTE DE PRUEBAS DE RENDIMIENTO K6                    ');
  report.push('================================================================================');
  report.push('');
  report.push('INFORMACIÓN DE LA PRUEBA');
  report.push('------------------------');
  report.push(`Fecha de ejecución     : ${fecha}`);
  report.push(`Hora de ejecución      : ${hora}`);
  report.push(`URL del sitio probado  : ${SITE_URL}`);
  report.push(`Tipo de prueba         : Prueba de Carga Básica`);
  report.push(`Duración de la prueba  : 1 minuto`);
  report.push(`Usuarios concurrentes  : 5 usuarios virtuales (VUs)`);
  report.push('');
  
  // DESCRIPCIÓN DE LA PRUEBA
  report.push('DESCRIPCIÓN DE LA PRUEBA');
  report.push('------------------------');
  report.push('Esta es una prueba de carga básica que simula 5 usuarios accediendo');
  report.push('simultáneamente al sitio web durante 1 minuto. Cada usuario:');
  report.push('  - Accede a la página principal');
  report.push('  - Espera 1 segundo entre peticiones');
  report.push('  - Verifica que el sitio responda correctamente');
  report.push('');
  
  // RESULTADOS GENERALES
  report.push('RESULTADOS GENERALES');
  report.push('--------------------');
  const totalRequests = data.metrics.http_reqs?.values?.count || 0;
  const failedRequests = data.metrics.http_req_failed?.values?.passes || 0;
  const successRate = totalRequests > 0 ? ((totalRequests - failedRequests) / totalRequests * 100).toFixed(2) : 0;
  
  report.push(`Total de peticiones realizadas : ${totalRequests}`);
  report.push(`Peticiones exitosas           : ${totalRequests - failedRequests}`);
  report.push(`Peticiones fallidas           : ${failedRequests}`);
  report.push(`Tasa de éxito                 : ${successRate}%`);
  report.push(`Datos descargados             : ${((data.metrics.data_received?.values?.count || 0) / 1024 / 1024).toFixed(2)} MB`);
  report.push(`Datos enviados                : ${((data.metrics.data_sent?.values?.count || 0) / 1024).toFixed(2)} KB`);
  report.push('');
  
  // TIEMPOS DE RESPUESTA
  report.push('TIEMPOS DE RESPUESTA');
  report.push('--------------------');
  const avgDuration = (data.metrics.http_req_duration?.values?.avg || 0).toFixed(0);
  const minDuration = (data.metrics.http_req_duration?.values?.min || 0).toFixed(0);
  const maxDuration = (data.metrics.http_req_duration?.values?.max || 0).toFixed(0);
  const p50Duration = (data.metrics.http_req_duration?.values?.med || 0).toFixed(0);
  const p95Duration = (data.metrics.http_req_duration?.values['p(95)'] || 0).toFixed(0);
  const p99Duration = (data.metrics.http_req_duration?.values['p(99)'] || 0).toFixed(0);
  
  report.push(`Tiempo promedio      : ${avgDuration} ms`);
  report.push(`Tiempo mínimo        : ${minDuration} ms`);
  report.push(`Tiempo máximo        : ${maxDuration} ms`);
  report.push(`Mediana (P50)        : ${p50Duration} ms`);
  report.push(`Percentil 95         : ${p95Duration} ms (95% de peticiones responden en menos de este tiempo)`);
  report.push(`Percentil 99         : ${p99Duration} ms (99% de peticiones responden en menos de este tiempo)`);
  report.push('');
  
  // VERIFICACIONES REALIZADAS
  report.push('VERIFICACIONES REALIZADAS (CHECKS)');
  report.push('----------------------------------');
  let checksTotal = 0;
  let checksPassed = 0;
  
  Object.keys(data.root_group.checks || {}).forEach(checkName => {
    const check = data.root_group.checks[checkName];
    checksTotal += check.passes + check.fails;
    checksPassed += check.passes;
    const passRate = ((check.passes / (check.passes + check.fails)) * 100).toFixed(1);
    const status = passRate == 100 ? '✓ PASÓ' : passRate > 90 ? '⚠ ADVERTENCIA' : '✗ FALLÓ';
    report.push(`${status} | ${checkName}: ${passRate}% (${check.passes} de ${check.passes + check.fails})`);
  });
  
  report.push('');
  report.push(`Resumen: ${checksPassed} de ${checksTotal} verificaciones pasaron (${(checksPassed/checksTotal*100).toFixed(1)}%)`);
  report.push('');
  
  // UMBRALES DE RENDIMIENTO
  report.push('UMBRALES DE RENDIMIENTO (THRESHOLDS)');
  report.push('------------------------------------');
  let thresholdsPassed = 0;
  let thresholdsTotal = 0;
  
  Object.keys(data.metrics).forEach(metricName => {
    const metric = data.metrics[metricName];
    if (metric.thresholds) {
      Object.keys(metric.thresholds).forEach(threshold => {
        thresholdsTotal++;
        const passed = metric.thresholds[threshold].ok;
        if (passed) thresholdsPassed++;
        const status = passed ? '✓ CUMPLIDO' : '✗ NO CUMPLIDO';
        let description = '';
        
        if (metricName === 'http_req_failed' && threshold.includes('rate<0.1')) {
          description = 'Tasa de error menor al 10%';
        } else if (metricName === 'http_req_duration' && threshold.includes('p(95)<3000')) {
          description = '95% de peticiones responden en menos de 3 segundos';
        }
        
        report.push(`${status} | ${description}`);
      });
    }
  });
  
  report.push('');
  
  // ANÁLISIS Y RECOMENDACIONES
  report.push('ANÁLISIS Y RECOMENDACIONES');
  report.push('--------------------------');
  
  if (avgDuration > 2000) {
    report.push('⚠️  RENDIMIENTO LENTO DETECTADO');
    report.push(`   - El tiempo promedio de respuesta (${avgDuration}ms) es mayor a 2 segundos`);
    report.push('   - Recomendaciones:');
    report.push('     • Implementar sistema de caché (WP Super Cache o W3 Total Cache)');
    report.push('     • Optimizar base de datos');
    report.push('     • Considerar un mejor hosting o plan');
  } else if (avgDuration > 1000) {
    report.push('⚠️  RENDIMIENTO MEJORABLE');
    report.push(`   - El tiempo promedio de respuesta (${avgDuration}ms) es mayor a 1 segundo`);
    report.push('   - Recomendaciones:');
    report.push('     • Optimizar imágenes');
    report.push('     • Minificar CSS y JavaScript');
    report.push('     • Usar un CDN para contenido estático');
  } else {
    report.push('✓  RENDIMIENTO BUENO');
    report.push(`   - El tiempo promedio de respuesta (${avgDuration}ms) es menor a 1 segundo`);
  }
  
  if (maxDuration > 5000) {
    report.push('');
    report.push('⚠️  PICOS DE LENTITUD DETECTADOS');
    report.push(`   - Algunas peticiones tardaron hasta ${maxDuration}ms`);
    report.push('   - Posibles causas: arranque en frío del servidor, consultas pesadas');
  }
  
  if (failedRequests > 0) {
    report.push('');
    report.push('❌  ERRORES DETECTADOS');
    report.push(`   - ${failedRequests} peticiones fallaron`);
    report.push('   - Revisar logs del servidor para más detalles');
  }
  
  // CONCLUSIÓN
  report.push('');
  report.push('CONCLUSIÓN');
  report.push('----------');
  
  if (successRate >= 99 && avgDuration < 1000) {
    report.push('✅ EXCELENTE: El sitio muestra un rendimiento óptimo.');
  } else if (successRate >= 95 && avgDuration < 2000) {
    report.push('✅ BUENO: El sitio funciona correctamente con oportunidades de mejora.');
  } else if (successRate >= 90 && avgDuration < 3000) {
    report.push('⚠️  REGULAR: El sitio necesita optimizaciones para mejorar la experiencia del usuario.');
  } else {
    report.push('❌ DEFICIENTE: El sitio requiere atención inmediata para resolver problemas de rendimiento.');
  }
  
  report.push('');
  report.push('================================================================================');
  report.push('                              FIN DEL REPORTE                                   ');
  report.push('================================================================================');
  
  const reportContent = report.join('\n');
  
  // Guardar en archivo
  const filename = `reporte-k6-${fecha.replace(/\//g, '-')}-${hora.replace(/:/g, '-')}.txt`;
  
  return {
    [filename]: reportContent,
    stdout: reportContent,
  };
}