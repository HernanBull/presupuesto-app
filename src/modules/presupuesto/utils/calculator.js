/**
 * Calcula la rentabilidad y tarifa por hora basándose en los inputs del usuario.
 * @param {Object} inputs - Valores ingresados por el usuario.
 * @param {number} inputs.netSalary - Sueldo Neto Mensual Deseado.
 * @param {number} inputs.taxPercentage - Porcentaje de Impuestos/Seguridad Social.
 * @param {number} inputs.productiveHours - Horas Productivas Mensuales.
 * @param {number} inputs.costsAmortization - Amortización mensual.
 * @param {number} inputs.costsInternet - Conexión a Internet y servicios fijos.
 * @param {number} inputs.costsSoftware - Licencias de Software y Herramientas.
 * @param {number} inputs.profitMargin - Margen de Beneficio (%).
 * @returns {Object} - Resultados calculados.
 */
export function calculateProfitability(inputs) {
  // 1. Sueldo Bruto Mensual
  const netSalary = Math.max(0, inputs.netSalary || 0);
  const taxPercentage = Math.max(0, Math.min(99, inputs.taxPercentage || 0)); // Evitar division por cero (100%)
  const grossSalary = netSalary / (1 - (taxPercentage / 100));

  // 2. Precio Hora Base
  const productiveHours = Math.max(1, inputs.productiveHours || 1); // Al menos 1 para evitar division por 0
  const baseHourlyRate = grossSalary / productiveHours;

  // 3. Costes Operativos Mensuales
  let totalMonthlyCosts = 0;
  
  // Amortización de Equipos
  if (Array.isArray(inputs.equipment)) {
    inputs.equipment.forEach(item => {
      const price = Math.max(0, item.price || 0);
      const residual = Math.max(0, item.residualValue || 0);
      const years = Math.max(0.1, item.lifespanYears || 1); // Evitar división por cero
      
      const depreciation = Math.max(0, price - residual);
      const monthlyAmortization = (depreciation / years) / 12;
      totalMonthlyCosts += monthlyAmortization;
    });
  }

  // Costes genéricos
  if (Array.isArray(inputs.costs)) {
    inputs.costs.forEach(cost => {
      const amount = Math.max(0, cost.amount || 0);
      if (cost.type === 'annual') {
        totalMonthlyCosts += amount / 12;
      } else if (cost.type === 'weekly') {
        totalMonthlyCosts += amount * 4.3333; // ~4.33 semanas por mes promedio
      } else if (cost.type === 'daily') {
        totalMonthlyCosts += amount * 30.416; // ~30.4 días por mes promedio
      } else {
        totalMonthlyCosts += amount; // monthly
      }
    });
  }

  // Costes de Vehículo (Mensualizado)
  if (Array.isArray(inputs.vehicleCosts)) {
    inputs.vehicleCosts.forEach(cost => {
      const amount = Math.max(0, cost.amount || 0);
      if (cost.type === 'annual') {
        totalMonthlyCosts += amount / 12;
      } else if (cost.type === 'weekly') {
        totalMonthlyCosts += amount * 4.3333;
      } else if (cost.type === 'daily') {
        totalMonthlyCosts += amount * 30.416;
      } else {
        totalMonthlyCosts += amount; // monthly
      }
    });
  }
  
  const hourlyOperatingCost = totalMonthlyCosts / productiveHours;

  // 4. Coste de Empresa por Hora
  const companyHourlyCost = baseHourlyRate + hourlyOperatingCost;

  // 5. Tarifa Final (Precio de Venta por Hora) con Margen
  const profitMargin = Math.max(0, inputs.profitMargin || 0);
  const finalHourlyRate = companyHourlyCost * (1 + (profitMargin / 100));

  return {
    grossSalary,
    baseHourlyRate,
    totalMonthlyCosts,
    hourlyOperatingCost,
    companyHourlyCost,
    finalHourlyRate,
    
    // Desglose de ingresos por hora (útil para el gráfico)
    breakdown: {
      netSalaryPerHour: netSalary / productiveHours,
      taxesPerHour: (grossSalary - netSalary) / productiveHours,
      costsPerHour: hourlyOperatingCost,
      profitPerHour: finalHourlyRate - companyHourlyCost
    }
  };
}

/**
 * Calcula el presupuesto de un proyecto basado en la tarifa final y horas.
 */
export function calculateProjectQuote(finalHourlyRate, estimatedHours) {
  return finalHourlyRate * Math.max(0, estimatedHours || 0);
}
