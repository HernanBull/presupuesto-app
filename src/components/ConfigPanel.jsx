import React, { useState } from 'react';
import { User, Clock, Laptop, TrendingUp, ChevronDown, ChevronUp, Plus, Trash2, CreditCard, Bike } from 'lucide-react';
import { cn } from '../utils/cn';

function AccordionItem({ title, icon: Icon, isOpen, onToggle, children }) {
  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm transition-all duration-300">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-5 text-left bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors focus:outline-none"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
            <Icon size={20} />
          </div>
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
        </div>
        {isOpen ? (
          <ChevronUp size={20} className="text-slate-400" />
        ) : (
          <ChevronDown size={20} className="text-slate-400" />
        )}
      </button>
      <div
        className={cn(
          "grid transition-all duration-300 ease-in-out",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="p-5 pt-0 border-t border-slate-100 dark:border-slate-800">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, type = "number", suffix, min = 0, step = 1 }) {
  return (
    <div className="flex flex-col gap-1.5 mb-4 last:mb-0">
      <label className="text-sm font-medium text-slate-600 dark:text-slate-300">{label}</label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          min={min}
          step={step}
          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-slate-100 transition-all outline-none"
        />
        {suffix && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

export function ConfigPanel({ inputs, setInputs }) {
  const [openSection, setOpenSection] = useState('salary'); // 'salary', 'time', 'costs', 'margin'

  const handleChange = (field, value) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
  };

  const toggleSection = (section) => {
    setOpenSection(openSection === section ? null : section);
  };

  const updateCost = (id, field, value) => {
    setInputs((prev) => ({
      ...prev,
      costs: prev.costs.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
    }));
  };

  const removeCost = (id) => {
    setInputs((prev) => ({
      ...prev,
      costs: prev.costs.filter((c) => c.id !== id),
    }));
  };

  const addCost = () => {
    setInputs((prev) => ({
      ...prev,
      costs: [
        ...prev.costs,
        { id: Date.now().toString(), name: '', amount: 0, type: 'monthly', category: 'otros' },
      ],
    }));
  };

  const updateEquipment = (id, field, value) => {
    setInputs((prev) => ({
      ...prev,
      equipment: prev.equipment.map((e) => (e.id === id ? { ...e, [field]: value } : e)),
    }));
  };

  const removeEquipment = (id) => {
    setInputs((prev) => ({
      ...prev,
      equipment: prev.equipment.filter((e) => e.id !== id),
    }));
  };

  const addEquipment = () => {
    setInputs((prev) => ({
      ...prev,
      equipment: [
        ...prev.equipment,
        { id: Date.now().toString(), name: '', price: 0, residualValue: 0, lifespanYears: 1 },
      ],
    }));
  };

  const updateVehicleCost = (id, field, value) => {
    setInputs((prev) => ({
      ...prev,
      vehicleCosts: prev.vehicleCosts.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
    }));
  };

  const removeVehicleCost = (id) => {
    setInputs((prev) => ({
      ...prev,
      vehicleCosts: prev.vehicleCosts.filter((c) => c.id !== id),
    }));
  };

  const addVehicleCost = () => {
    setInputs((prev) => ({
      ...prev,
      vehicleCosts: [
        ...prev.vehicleCosts,
        { id: Date.now().toString(), name: '', amount: 0, type: 'monthly' },
      ],
    }));
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2 px-1">Configuración</h2>
      
      <AccordionItem
        title="Mi Salario Deseado"
        icon={User}
        isOpen={openSection === 'salary'}
        onToggle={() => toggleSection('salary')}
      >
        <InputField
          label="Sueldo Neto Mensual Deseado"
          value={inputs.netSalary}
          onChange={(val) => handleChange('netSalary', val)}
          suffix="€"
        />
        <InputField
          label="Impuestos y Seg. Social (IRPF + Cuota)"
          value={inputs.taxPercentage}
          onChange={(val) => handleChange('taxPercentage', val)}
          suffix="%"
          max={99}
        />
      </AccordionItem>

      <AccordionItem
        title="Mi Tiempo de Trabajo"
        icon={Clock}
        isOpen={openSection === 'time'}
        onToggle={() => toggleSection('time')}
      >
        <InputField
          label="Horas Productivas Mensuales"
          value={inputs.productiveHours}
          onChange={(val) => handleChange('productiveHours', val)}
          suffix="hrs"
        />
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
          Nota: Considera solo las horas que realmente puedes facturar a clientes, no tareas administrativas. (Promedio: 80-120h).
        </p>
      </AccordionItem>

      <AccordionItem
        title="Amortización de Equipos"
        icon={Laptop}
        isOpen={openSection === 'equipment'}
        onToggle={() => toggleSection('equipment')}
      >
        <div className="flex flex-col gap-4">
          {(inputs.equipment || []).map((item) => {
            const monthlyAmortization = item.lifespanYears > 0 
              ? ((Math.max(0, item.price - item.residualValue)) / item.lifespanYears) / 12 
              : 0;

            return (
              <div key={item.id} className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col gap-3 relative">
                <div className="flex justify-between items-center">
                  <input
                    type="text"
                    value={item.name}
                    placeholder="Nombre del equipo (ej. MacBook Pro)"
                    onChange={(e) => updateEquipment(item.id, 'name', e.target.value)}
                    className="font-medium bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none dark:text-slate-100 w-full mr-4"
                  />
                  <button
                    onClick={() => removeEquipment(item.id)}
                    className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800"
                    title="Eliminar equipo"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1">
                  <div>
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Precio de Compra</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) => updateEquipment(item.id, 'price', e.target.value === '' ? '' : Number(e.target.value))}
                        min={0}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none dark:text-slate-100 text-sm"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">€</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Valor Residual</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={item.residualValue}
                        onChange={(e) => updateEquipment(item.id, 'residualValue', e.target.value === '' ? '' : Number(e.target.value))}
                        min={0}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none dark:text-slate-100 text-sm"
                        title="En cuánto esperas venderlo al final"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">€</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Vida Útil</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={item.lifespanYears}
                        onChange={(e) => updateEquipment(item.id, 'lifespanYears', e.target.value === '' ? '' : Number(e.target.value))}
                        min={0.1}
                        step={0.5}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none dark:text-slate-100 text-sm"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">Años</span>
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-right">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Impacto Mensual: </span>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{monthlyAmortization.toFixed(2)}€</span>
                </div>
              </div>
            );
          })}
          
          <button
            onClick={addEquipment}
            className="flex items-center justify-center gap-2 w-full py-3 mt-2 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 hover:text-blue-600 hover:border-blue-300 dark:hover:border-blue-900/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-sm font-medium"
          >
            <Plus size={16} />
            Añadir otro equipo
          </button>
        </div>
      </AccordionItem>

      <AccordionItem
        title="Costes de Vehículo (Toro TRX 150)"
        icon={Bike}
        isOpen={openSection === 'vehicle'}
        onToggle={() => toggleSection('vehicle')}
      >
        <div className="flex flex-col gap-4">
          {(inputs.vehicleCosts || []).map((cost) => (
            <div key={cost.id} className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col gap-3 relative">
              <div className="flex justify-between items-center">
                <input
                  type="text"
                  value={cost.name}
                  placeholder="Nombre del gasto (ej. Seguro, Gasolina)"
                  onChange={(e) => updateVehicleCost(cost.id, 'name', e.target.value)}
                  className="font-medium bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none dark:text-slate-100 w-full mr-4"
                />
                <button
                  onClick={() => removeVehicleCost(cost.id)}
                  className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800"
                  title="Eliminar gasto"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                  <input
                    type="number"
                    value={cost.amount}
                    onChange={(e) => updateVehicleCost(cost.id, 'amount', e.target.value === '' ? '' : Number(e.target.value))}
                    min={0}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none dark:text-slate-100 text-sm"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">€</span>
                </div>
                
                <select
                  value={cost.type}
                  onChange={(e) => updateVehicleCost(cost.id, 'type', e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none dark:text-slate-100 text-sm"
                >
                  <option value="daily">Diario</option>
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensual</option>
                  <option value="annual">Anual</option>
                </select>
              </div>
            </div>
          ))}
          
          <button
            onClick={addVehicleCost}
            className="flex items-center justify-center gap-2 w-full py-3 mt-2 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 hover:text-blue-600 hover:border-blue-300 dark:hover:border-blue-900/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-sm font-medium"
          >
            <Plus size={16} />
            Añadir otro gasto
          </button>
        </div>
      </AccordionItem>

      <AccordionItem
        title="Mis Costes de Operación"
        icon={CreditCard}
        isOpen={openSection === 'costs'}
        onToggle={() => toggleSection('costs')}
      >
        <div className="flex flex-col gap-4">
          {(inputs.costs || []).map((cost) => (
            <div key={cost.id} className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col gap-3 relative">
              <div className="flex justify-between items-center">
                <input
                  type="text"
                  value={cost.name}
                  placeholder="Nombre del coste"
                  onChange={(e) => updateCost(cost.id, 'name', e.target.value)}
                  className="font-medium bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none dark:text-slate-100 w-full mr-4"
                />
                <button
                  onClick={() => removeCost(cost.id)}
                  className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800"
                  title="Eliminar coste"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="relative">
                  <input
                    type="number"
                    value={cost.amount}
                    onChange={(e) => updateCost(cost.id, 'amount', e.target.value === '' ? '' : Number(e.target.value))}
                    min={0}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none dark:text-slate-100 text-sm"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">€</span>
                </div>
                
                <select
                  value={cost.type}
                  onChange={(e) => updateCost(cost.id, 'type', e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none dark:text-slate-100 text-sm"
                >
                  <option value="daily">Diario</option>
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensual</option>
                  <option value="annual">Anual</option>
                </select>

                <select
                  value={cost.category}
                  onChange={(e) => updateCost(cost.id, 'category', e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none dark:text-slate-100 text-sm"
                >
                  <option value="fijos">Servicios Fijos</option>
                  <option value="licencias">Licencias</option>
                  <option value="otros">Otros</option>
                </select>
              </div>
            </div>
          ))}
          
          <button
            onClick={addCost}
            className="flex items-center justify-center gap-2 w-full py-3 mt-2 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 hover:text-blue-600 hover:border-blue-300 dark:hover:border-blue-900/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-sm font-medium"
          >
            <Plus size={16} />
            Añadir otro coste
          </button>
        </div>
      </AccordionItem>

      <AccordionItem
        title="Margen de Negocio"
        icon={TrendingUp}
        isOpen={openSection === 'margin'}
        onToggle={() => toggleSection('margin')}
      >
        <InputField
          label="Margen de Beneficio Deseado"
          value={inputs.profitMargin}
          onChange={(val) => handleChange('profitMargin', val)}
          suffix="%"
        />
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
          Es el porcentaje de beneficio extra que se queda la empresa para reinversión o crecimiento, después de pagar tu sueldo y gastos.
        </p>
      </AccordionItem>
    </div>
  );
}
