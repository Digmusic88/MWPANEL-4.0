import React, { useState, useCallback } from 'react';
import { Input, AutoComplete, Tag, Dropdown, Button, Space, MenuProps } from 'antd';
import { SearchOutlined, FilterOutlined, ClearOutlined } from '@ant-design/icons';
import { debounce } from 'lodash';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onFilter?: (filters: SearchFilters) => void;
  placeholder?: string;
  showFilters?: boolean;
  suggestions?: string[];
  loading?: boolean;
}

export interface SearchFilters {
  fileType?: string;
  dateRange?: [Date, Date];
  isStudentSubmission?: boolean;
  isTeacherMaterial?: boolean;
  tags?: string[];
  uploadedBy?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onFilter,
  placeholder = "Buscar archivos...",
  showFilters = true,
  suggestions = [],
  loading = false,
}) => {
  const [activeFilters, setActiveFilters] = useState<SearchFilters>({});
  const [autoCompleteOptions, setAutoCompleteOptions] = useState<{ value: string; label: string }[]>([]);

  // Debounced search function
  const debouncedOnChange = useCallback(
    debounce((searchValue: string) => {
      onChange(searchValue);
    }, 300),
    [onChange]
  );

  const handleSearch = (searchValue: string) => {
    debouncedOnChange(searchValue);
    
    // Generate autocomplete options based on search value
    if (searchValue.length > 1) {
      const filteredSuggestions = suggestions
        .filter(suggestion => 
          suggestion.toLowerCase().includes(searchValue.toLowerCase())
        )
        .slice(0, 10)
        .map(suggestion => ({
          value: suggestion,
          label: suggestion,
        }));
      
      setAutoCompleteOptions(filteredSuggestions);
    } else {
      setAutoCompleteOptions([]);
    }
  };

  const filterMenuItems: MenuProps['items'] = [
    {
      key: 'fileType',
      label: 'Tipo de archivo',
      children: [
        { key: 'image', label: 'Imágenes' },
        { key: 'document', label: 'Documentos' },
        { key: 'video', label: 'Videos' },
        { key: 'audio', label: 'Audio' },
        { key: 'pdf', label: 'PDF' },
      ],
    },
    {
      key: 'category',
      label: 'Categoría',
      children: [
        { 
          key: 'student', 
          label: 'Entregas de estudiantes',
          onClick: () => handleFilterChange('isStudentSubmission', true),
        },
        { 
          key: 'teacher', 
          label: 'Material del profesor',
          onClick: () => handleFilterChange('isTeacherMaterial', true),
        },
      ],
    },
    {
      type: 'divider',
    },
    {
      key: 'clear',
      label: 'Limpiar filtros',
      icon: <ClearOutlined />,
      onClick: () => {
        setActiveFilters({});
        onFilter?.({});
      },
    },
  ];

  const handleFilterChange = (filterKey: keyof SearchFilters, value: any) => {
    const newFilters = { ...activeFilters, [filterKey]: value };
    setActiveFilters(newFilters);
    onFilter?.(newFilters);
  };

  const removeFilter = (filterKey: keyof SearchFilters) => {
    const newFilters = { ...activeFilters };
    delete newFilters[filterKey];
    setActiveFilters(newFilters);
    onFilter?.(newFilters);
  };

  const getActiveFiltersCount = () => {
    return Object.keys(activeFilters).length;
  };

  const renderFilterTags = () => {
    const tags: React.ReactNode[] = [];

    if (activeFilters.isStudentSubmission) {
      tags.push(
        <Tag
          key="student"
          closable
          onClose={() => removeFilter('isStudentSubmission')}
          color="blue"
        >
          Entregas de estudiantes
        </Tag>
      );
    }

    if (activeFilters.isTeacherMaterial) {
      tags.push(
        <Tag
          key="teacher"
          closable
          onClose={() => removeFilter('isTeacherMaterial')}
          color="green"
        >
          Material del profesor
        </Tag>
      );
    }

    if (activeFilters.fileType) {
      tags.push(
        <Tag
          key="fileType"
          closable
          onClose={() => removeFilter('fileType')}
          color="orange"
        >
          Tipo: {activeFilters.fileType}
        </Tag>
      );
    }

    if (activeFilters.tags && activeFilters.tags.length > 0) {
      activeFilters.tags.forEach((tag, index) => {
        tags.push(
          <Tag
            key={`tag-${index}`}
            closable
            onClose={() => {
              const newTags = activeFilters.tags?.filter(t => t !== tag);
              handleFilterChange('tags', newTags);
            }}
            color="purple"
          >
            {tag}
          </Tag>
        );
      });
    }

    return tags;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <AutoComplete
          value={value}
          options={autoCompleteOptions}
          onSearch={handleSearch}
          onSelect={(selectedValue) => {
            onChange(selectedValue);
          }}
          className="flex-1"
          allowClear
        >
          <Input
            placeholder={placeholder}
            prefix={<SearchOutlined className="text-gray-400" />}
            size="middle"
            loading={loading}
          />
        </AutoComplete>

        {showFilters && (
          <Dropdown
            menu={{ items: filterMenuItems }}
            trigger={['click']}
            placement="bottomRight"
          >
            <Button
              icon={<FilterOutlined />}
              className={getActiveFiltersCount() > 0 ? 'border-blue-500 text-blue-500' : ''}
            >
              Filtros
              {getActiveFiltersCount() > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                  {getActiveFiltersCount()}
                </span>
              )}
            </Button>
          </Dropdown>
        )}
      </div>

      {/* Active filters display */}
      {getActiveFiltersCount() > 0 && (
        <div className="flex flex-wrap gap-1">
          {renderFilterTags()}
        </div>
      )}
    </div>
  );
};

export default SearchBar;