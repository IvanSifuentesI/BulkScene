import React from 'react';

const NumberInputWithSteppers: React.FC<{
    label: string;
    value: number;
    onChange: (value: number) => void;
    min: number;
    max: number;
    step: number;
    precision?: number;
}> = ({ label, value, onChange, min, max, step, precision = 2 }) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const num = parseFloat(e.target.value);
        if (e.target.value === '') {
            onChange(min);
        } else if (!isNaN(num)) {
            onChange(Math.max(min, Math.min(max, num)));
        }
    };

    const stepValue = (direction: 'up' | 'down') => {
        const newValue = value + (direction === 'up' ? step : -step);
        onChange(Math.max(min, Math.min(max, parseFloat(newValue.toFixed(precision + 1)))));
    };
    
    return (
        <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">{label} ({value.toFixed(precision)})</label>
            <div className="flex items-center">
                <input
                    type="number"
                    value={value}
                    onChange={handleChange}
                    min={min}
                    max={max}
                    step={step}
                    className="w-full bg-slate-700 border border-slate-600 rounded-l-lg px-3 py-1.5 focus:ring-1 focus:ring-violet-500 focus:outline-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                 <div className="flex flex-col">
                    <button type="button" onClick={() => stepValue('up')} className="px-2 py-0.5 bg-slate-600 hover:bg-slate-500 border-t border-r border-b border-slate-600 rounded-tr-lg transition-colors text-lg leading-none">▲</button>
                    <button type="button" onClick={() => stepValue('down')} className="px-2 py-0.5 bg-slate-600 hover:bg-slate-500 border-r border-b border-slate-600 rounded-br-lg transition-colors text-lg leading-none">▼</button>
                </div>
            </div>
        </div>
    );
};

export default NumberInputWithSteppers;
