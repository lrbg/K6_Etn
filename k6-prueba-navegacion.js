import http from 'k6/http';
import { check, sleep, group } from 'k6';

// CONFIGURACIÓN DE PRUEBA DE NAVEGACIÓN
export const options = {
  vus: 10,
  duration: '5m',
  thresholds: {
    http_req_failed: ['rate<0.1'],
    http_req_duration: ['p(95)<3000'],
    'http_req_duration{page:home}': ['p(95)<2000'],
    'http_req_duration{page:search}': ['p(95)<4000'],
  },
};

const SITE_URL = 'https://wordpress-turistar-etn-production.onrender.com';

// Simulación de comportamiento de usuario real
export default function () {
  let response;
  let searchTerm = ['turismo', 'viajes', 'destinos', 'hotel', 'tour'][Math.floor(Math.random() * 5)];
  
  // ESCENARIO 1: Visita a página principal
  group('Navegación - Página Principal', () => {
    response = http.get(SITE_URL, {
      tags: { page: 'home' },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    check(response, {
      'Página principal carga correctamente': (r) => r.status === 200,
      'Contiene contenido WordPress': (r) => r.body.includes('wp-content') || r.body.includes('WordPress'),
      'Tiempo de carga aceptable': (r) => r.timings.duration < 2000,
    });
    
    // Simular lectura de la página
    sleep(Math.random() * 3 + 2); // 2-5 segundos
  });
  
  // ESCENARIO 2: Búsqueda
  group('Navegación - Búsqueda', () => {
    response = http.get(`${SITE_URL}/?s=${searchTerm}`, {
      tags: { page: 'search' },
    });
    
    check(response, {
      'Búsqueda funciona': (r) => r.status === 200,
      'Resultados de búsqueda presentes': (r) => r.body.includes('search-results') || r.body.includes(searchTerm),
    });
    
    sleep(Math.random() * 2 + 1);
  });
  
  // ESCENARIO 3: Navegación a página aleatoria
  group('Navegación - Páginas Internas', () => {
    const pages = ['/about', '/contact', '/blog', '/services'];
    const randomPage = pages[Math.floor(Math.random() * pages.length)];
    
    response = http.get(`${SITE_URL}${randomPage}`, {
      tags: { page: 'internal' },
    });
    
    check(response, {
      'Página interna accesible': (r) => r.status === 200 || r.status === 404,
      'Sin errores del servidor': (r) => r.status < 500,
    });
    
    sleep(Math.random() * 3 + 1);
  });
  
  // ESCENARIO 4: Acceso a recursos
  group('Carga de Recursos', () => {
    // Simular carga de CSS
    http.get(`${SITE_URL}/wp-includes/css/dist/block-library/style.min.css`, {
      tags: { resource: 'css' },
    });
    
    // Simular carga de JS
    http.get(`${SITE_URL}/wp-includes/js/jquery/jquery.min.js`, {
      tags: { resource: 'js' },
    });
  });
}

export function handleSummary(data) {
  const fecha = new Date().toLocaleDateString('es-MX');
  const hora = new Date().toLocaleTimeString('es-MX');
  
  let report = [];
  
  // ENCABEZADO
  report.push('================================================================================');
  report.push('              REPORTE DE PRUEBA DE NAVEGACIÓN DE USUARIO - K6                   ');
  report.push('================================================================================');
  report.push('');
  report.push('INFORMACIÓN DE LA PRUEBA');
  report.push('------------------------');
  report.push(`Fecha de ejecución     : ${fecha}`);
  report.push(`Hora de ejecución      : ${hora}`);
  report.push(`URL del sitio probado  : ${SITE_URL}`);
  report.push(`Tipo de prueba         : NAVEGACIÓN DE USUARIO REAL`);
  report.push(`Duración               : 5 minutos`);
  report.push(`Usuarios simulados     : 10 usuarios concurrentes`);
  report.push('');
  
  // DESCRIPCIÓN
  report.push('DESCRIPCIÓN DE LA PRUEBA');
  report.push('------------------------');
  report.push('Simula el comportamiento real de usuarios navegando el sitio:');
  report.push('  1. Visitan la página principal');
  report.push('  2. Realizan búsquedas');
  report.push('  3. Navegan a páginas internas');
  report.push('  4. Cargan recursos (CSS, JS)');
  report.push('  5. Pausan entre acciones (simulando lectura)');
  report.push('');
  
  // RESULTADOS POR GRUPO
  report.push('RESULTADOS POR SECCIÓN DEL SITIO');
  report.push('---------------------------------');
  
  // Analizar grupos
  if (data.root_group && data.root_group.groups) {
    Object.keys(data.root_group.groups).forEach(groupName => {
      const group = data.root_group.groups[groupName];
      report.push(`\n${groupName}:`);
      
      if (group.checks) {
        Object.keys(group.checks).forEach(checkName => {
          const check = group.checks[checkName];
          const passRate = ((check.passes / (check.passes + check.fails)) * 100).toFixed(1);
          const status = passRate == 100 ? '✓' : passRate > 90 ? '⚠' : '✗';
          report.push(`  ${status} ${checkName}: ${passRate}%`);
        });
      }
    });
  }
  
  // MÉTRICAS GENERALES
  report.push('');
  report.push('MÉTRICAS GENERALES DE NAVEGACIÓN');
  report.push('---------------------------------');
  const totalRequests = data.metrics.http_reqs?.values?.count || 0;
  const failedRequests = data.metrics.http_req_failed?.values?.passes || 0;
  const successRate = ((totalRequests - failedRequests) / totalRequests * 100).toFixed(2);
  
  report.push(`Total de páginas visitadas     : ${totalRequests}`);
  report.push(`Navegaciones exitosas          : ${totalRequests - failedRequests}`);
  report.push(`Errores de navegación          : ${failedRequests}`);
  report.push(`Tasa de éxito                  : ${successRate}%`);
  report.push('');
  
  // EXPERIENCIA DEL USUARIO
  report.push('ANÁLISIS DE EXPERIENCIA DE USUARIO');
  report.push('-----------------------------------');
  const avgDuration = (data.metrics.http_req_duration?.values?.avg || 0).toFixed(0);
  const p50Duration = (data.metrics.http_req_duration?.values?.med || 0).toFixed(0);
  const p95Duration = (data.metrics.http_req_duration?.values['p(95)'] || 0).toFixed(0);
  
  report.push('VELOCIDAD PERCIBIDA:');
  if (avgDuration < 1000) {
    report.push('✅ EXCELENTE - Carga instantánea (< 1 segundo promedio)');
  } else if (avgDuration < 2000) {
    report.push('✅ BUENA - Carga rápida (< 2 segundos promedio)');
  } else if (avgDuration < 3000) {
    report.push('⚠️  REGULAR - Carga aceptable (< 3 segundos promedio)');
  } else {
    report.push('❌ LENTA - Los usuarios pueden abandonar el sitio');
  }
  
  report.push('');
  report.push(`Tiempo promedio de carga       : ${avgDuration} ms`);
  report.push(`50% de páginas cargan en       : ${p50Duration} ms`);
  report.push(`95% de páginas cargan en       : ${p95Duration} ms`);
  report.push('');
  
  // ANÁLISIS POR TIPO DE PÁGINA
  report.push('RENDIMIENTO POR TIPO DE PÁGINA');
  report.push('-------------------------------');
  
  // Intentar obtener métricas por tags si están disponibles
  const pageTypes = ['home', 'search', 'internal'];
  pageTypes.forEach(pageType => {
    const metricKey = `http_req_duration{page:${pageType}}`;
    if (data.metrics[metricKey]) {
      const pageAvg = (data.metrics[metricKey].values?.avg || 0).toFixed(0);
      report.push(`${pageType.toUpperCase()}: ${pageAvg} ms promedio`);
    }
  });
  
  // PROBLEMAS DETECTADOS
  report.push('');
  report.push('PROBLEMAS DETECTADOS DURANTE LA NAVEGACIÓN');
  report.push('------------------------------------------');
  
  let problemCount = 0;
  if (failedRequests > 0) {
    report.push(`❌ ${failedRequests} páginas no cargaron correctamente`);
    problemCount++;
  }
  
  if (p95Duration > 3000) {
    report.push(`⚠️  5% de las páginas tardan más de ${(p95Duration/1000).toFixed(1)} segundos`);
    problemCount++;
  }
  
  if (problemCount === 0) {
    report.push('✅ No se detectaron problemas significativos');
  }
  
  // RECOMENDACIONES UX
  report.push('');
  report.push('RECOMENDACIONES PARA MEJORAR LA EXPERIENCIA');
  report.push('--------------------------------------------');
  
  if (avgDuration > 2000) {
    report.push('1. OPTIMIZACIÓN DE VELOCIDAD:');
    report.push('   • Implementar lazy loading para imágenes');
    report.push('   • Minificar y combinar archivos CSS/JS');
    report.push('   • Activar compresión GZIP');
  }
  
  report.push('');
  report.push('2. MEJORAS DE NAVEGACIÓN:');
  report.push('   • Implementar precarga de enlaces (prefetch)');
  report.push('   • Usar caché del navegador efectivamente');
  report.push('   • Optimizar el Critical Rendering Path');
  
  if (failedRequests > totalRequests * 0.02) {
    report.push('');
    report.push('3. ESTABILIDAD:');
    report.push('   • Revisar enlaces rotos (404s)');
    report.push('   • Implementar páginas de error amigables');
    report.push('   • Monitorear disponibilidad continuamente');
  }
  
  // CONCLUSIÓN UX
  report.push('');
  report.push('CALIFICACIÓN DE EXPERIENCIA DE USUARIO');
  report.push('--------------------------------------');
  
  let score = 100;
  if (avgDuration > 1000) score -= 10;
  if (avgDuration > 2000) score -= 15;
  if (avgDuration > 3000) score -= 25;
  if (failedRequests > 0) score -= (failedRequests / totalRequests) * 100;
  if (p95Duration > 5000) score -= 10;
  
  score = Math.max(0, Math.round(score));
  
  let rating = '';
  if (score >= 90) rating = '⭐⭐⭐⭐⭐ EXCELENTE';
  else if (score >= 80) rating = '⭐⭐⭐⭐ MUY BUENO';
  else if (score >= 70) rating = '⭐⭐⭐ BUENO';
  else if (score >= 60) rating = '⭐⭐ REGULAR';
  else rating = '⭐ NECESITA MEJORAS';
  
  report.push(`Puntuación UX: ${score}/100 - ${rating}`);
  
  report.push('');
  report.push('================================================================================');
  report.push('                     FIN DEL REPORTE DE NAVEGACIÓN                              ');
  report.push('================================================================================');
  
  const reportContent = report.join('\n');
  const filename = `reporte-navegacion-k6-${fecha.replace(/\//g, '-')}-${hora.replace(/:/g, '-')}.txt`;
  
  return {
    [filename]: reportContent,
    stdout: reportContent,
  };
}