
import React from 'react';
import Select, { StylesConfig } from 'react-select';
import type { CubeType, Theme } from '../types';
import { CUBE_TYPES } from '../types';

interface ScrambleTypeSelectorProps {
    value: CubeType;
    onChange: (value: CubeType) => void;
    theme: Theme;
    disabled?: boolean;
}

const options = CUBE_TYPES.map(type => ({ value: type, label: type }));

const getCustomStyles = (theme: Theme): StylesConfig => {
    const isDark = theme === 'dark';

    return {
        control: (provided, state) => ({
          ...provided,
          backgroundColor: isDark ? 'rgba(15, 23, 42, 0.4)' : 'rgba(255, 255, 255, 0.4)',
          border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(15, 23, 42, 0.1)'}`,
          borderRadius: '0.5rem',
          backdropFilter: 'blur(4px)',
          boxShadow: state.isFocused ? `0 0 0 1px #38bdf8` : 'none',
          minWidth: '120px',
          transition: 'background-color 150ms, border-color 150ms',
          '&:hover': {
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255, 255, 255, 0.6)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(15, 23, 42, 0.2)',
          },
          opacity: state.isDisabled ? 0.5 : 1,
          cursor: state.isDisabled ? 'not-allowed' : 'default',
        }),
        singleValue: (provided) => ({
          ...provided,
          color: isDark ? '#f1f5f9' : '#0f172a', // slate-100 vs slate-900
          fontWeight: 500,
        }),
        menu: (provided) => ({
          ...provided,
          backgroundColor: isDark ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(10px)',
          borderRadius: '0.5rem',
          border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(15, 23, 42, 0.2)'}`,
          overflow: 'hidden',
        }),
        option: (provided, state) => ({
          ...provided,
          backgroundColor: state.isSelected 
              ? '#38bdf8'
              : state.isFocused 
              ? isDark ? 'rgba(56, 189, 248, 0.2)' : 'rgba(56, 189, 248, 0.1)'
              : 'transparent',
          color: state.isSelected ? 'white' : (isDark ? '#f1f5f9' : '#0f172a'),
          fontWeight: 500,
          cursor: state.isDisabled ? 'not-allowed' : 'default',
          '&:active': {
            backgroundColor: isDark ? 'rgba(56, 189, 248, 0.4)' : 'rgba(56, 189, 248, 0.2)',
          },
        }),
        indicatorSeparator: () => ({
          display: 'none',
        }),
         dropdownIndicator: (provided, state) => ({
          ...provided,
          color: isDark ? '#94a3b8' : '#64748b', // slate-400 vs slate-500
          cursor: state.isDisabled ? 'not-allowed' : 'default',
          '&:hover': {
            color: isDark ? '#f1f5f9' : '#0f172a',
          },
        }),
    };
};

export const ScrambleTypeSelector: React.FC<ScrambleTypeSelectorProps> = ({ value, onChange, theme, disabled = false }) => {
    const selectedOption = options.find(option => option.value === value);

    const handleChange = (selected) => {
        if (selected) {
            onChange(selected.value);
        }
    };

    return (
        <Select
            value={selectedOption}
            onChange={handleChange}
            options={options}
            styles={getCustomStyles(theme)}
            isSearchable={false}
            isDisabled={disabled}
            instanceId="cube-type-selector"
        />
    );
};
