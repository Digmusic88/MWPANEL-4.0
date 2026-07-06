import React from 'react'
import { Table, Card, Row, Col, Typography, Space, Tag, Button } from 'antd'
import { TableProps } from 'antd/es/table'
import { useResponsive } from '../../hooks/useResponsive'

const { Text, Title } = Typography

interface ResponsiveTableProps<T = any> extends TableProps<T> {
  // Configuración específica para mobile
  mobileCardRender?: (record: T, index: number) => React.ReactNode
  mobileTitle?: string
  showMobileCards?: boolean
  mobileCardProps?: any
}

function ResponsiveTable<T extends Record<string, any>>({
  mobileCardRender,
  mobileTitle,
  showMobileCards = true,
  mobileCardProps,
  ...tableProps
}: ResponsiveTableProps<T>) {
  const { isMobile, isTablet } = useResponsive()

  // Configuración responsive para la tabla
  const responsiveTableProps: TableProps<T> = {
    ...tableProps,
    scroll: {
      x: isMobile ? 'max-content' : isTablet ? 800 : 'max-content',
      y: isMobile ? 400 : undefined,
      ...tableProps.scroll,
    },
    size: isMobile ? 'small' : tableProps.size || 'middle',
    pagination: {
      pageSize: isMobile ? 5 : isTablet ? 8 : 10,
      simple: isMobile,
      showSizeChanger: !isMobile,
      showQuickJumper: !isMobile,
      showTotal: (total, range) => 
        isMobile 
          ? `${range[0]}-${range[1]} / ${total}`
          : `${range[0]}-${range[1]} de ${total} elementos`,
      ...tableProps.pagination,
    },
  }

  // Renderizado por defecto para cards mobile
  const defaultMobileCardRender = (record: T, index: number) => {
    const columns = tableProps.columns || []
    
    return (
      <Card 
        key={record.key || index}
        size="small"
        className="mb-3"
        {...mobileCardProps}
      >
        <Space direction="vertical" size="small" className="w-full">
          {columns.slice(0, 4).map((column: any, idx) => {
            const value = record[column.dataIndex]
            const renderedValue = column.render 
              ? column.render(value, record, index)
              : value

            return (
              <div key={idx} className="flex justify-between items-center">
                <Text type="secondary" className="text-xs">
                  {column.title as React.ReactNode}
                </Text>
                <div className="text-right">
                  {renderedValue as React.ReactNode}
                </div>
              </div>
            )
          })}
          
          {/* Botones de acción */}
          {columns.find((col: any) => col.key === 'actions' || col.dataIndex === 'actions') && (
            <div className="flex justify-center pt-2 border-t border-gray-100">
              {(() => {
                const actionsColumn = columns.find((col: any) => col.key === 'actions' || col.dataIndex === 'actions')
                return actionsColumn?.render ? actionsColumn.render(null, record, index) : null
              })()}
            </div>
          )}
        </Space>
      </Card>
    )
  }

  // Si es mobile y se debe mostrar cards
  if (isMobile && showMobileCards) {
    const dataSource = tableProps.dataSource || []
    const renderFunction = mobileCardRender || defaultMobileCardRender

    return (
      <div className="responsive-table-mobile">
        {mobileTitle && (
          <Title level={5} className="mb-4">
            {mobileTitle} ({dataSource.length})
          </Title>
        )}
        
        <div className="space-y-3">
          {dataSource.map((record, index) => renderFunction(record, index))}
        </div>

        {/* Paginación simple para mobile */}
        {dataSource.length > 5 && (
          <div className="flex justify-center mt-4">
            <Text type="secondary" className="text-sm">
              Mostrando {Math.min(5, dataSource.length)} de {dataSource.length} elementos
            </Text>
          </div>
        )}
      </div>
    )
  }

  // Renderizado normal de tabla para desktop/tablet
  return (
    <div className="responsive-table-desktop table-container-responsive">
      <div className="container-scroll-x">
        <Table<T> {...responsiveTableProps} />
      </div>
    </div>
  )
}

export default ResponsiveTable

// Hook para configurar columnas responsive
export const useResponsiveColumns = (baseColumns: any[]) => {
  const { isMobile, isTablet } = useResponsive()

  return React.useMemo(() => {
    if (isMobile) {
      // En mobile, ocultar columnas menos importantes
      return baseColumns.filter(col => 
        col.key !== 'description' && 
        col.key !== 'createdAt' && 
        col.key !== 'updatedAt' &&
        !col.hideOnMobile
      )
    }
    
    if (isTablet) {
      // En tablet, ocultar algunas columnas menos críticas
      return baseColumns.filter(col => !col.hideOnTablet)
    }

    // Desktop: mostrar todas las columnas
    return baseColumns
  }, [baseColumns, isMobile, isTablet])
}