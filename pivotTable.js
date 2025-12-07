// ========================================
// Pivot Table Builder
// ========================================

class PivotTableBuilder {
    constructor() {
        this.currentPivot = null;
    }
    
    // Generate pivot table
    generatePivot(config) {
        try {
            const { rows, columns, values, aggregation } = config;
            
            if (!rows || rows.length === 0 || !values || values.length === 0) {
                throw new Error('Rows and Values are required');
            }
            
            const data = dataProcessor.processedData || [];
            if (data.length === 0) {
                throw new Error('No data available');
            }
            
            // Build pivot structure
            const pivotData = this.buildPivotStructure(data, rows, columns, values, aggregation);
            
            // Render pivot table
            this.renderPivotTable(pivotData, rows, columns, values);
            
            this.currentPivot = pivotData;
            return true;
            
        } catch (error) {
            console.error('Pivot generation error:', error);
            Utils.showToast('Failed to generate pivot: ' + error.message, 'error');
            return false;
        }
    }
    
    // Build pivot data structure
    buildPivotStructure(data, rowFields, colFields, valueFields, aggFunc) {
        const pivot = {};
        
        // Group data
        data.forEach(row => {
            // Build row key
            const rowKey = rowFields.map(field => row[field] || 'N/A').join('|');
            
            // Build column key
            const colKey = colFields.length > 0 ? 
                colFields.map(field => row[field] || 'N/A').join('|') : 
                'Total';
            
            if (!pivot[rowKey]) {
                pivot[rowKey] = {};
            }
            
            if (!pivot[rowKey][colKey]) {
                pivot[rowKey][colKey] = [];
            }
            
            // Add values
            valueFields.forEach(field => {
                const value = parseFloat(row[field]);
                if (!isNaN(value)) {
                    pivot[rowKey][colKey].push(value);
                }
            });
        });
        
        // Aggregate values
        Object.keys(pivot).forEach(rowKey => {
            Object.keys(pivot[rowKey]).forEach(colKey => {
                const values = pivot[rowKey][colKey];
                pivot[rowKey][colKey] = this.aggregate(values, aggFunc);
            });
        });
        
        return pivot;
    }
    
    // Aggregate function
    aggregate(values, func) {
        if (values.length === 0) return 0;
        
        switch (func) {
            case 'sum':
                return values.reduce((a, b) => a + b, 0);
            case 'mean':
                return values.reduce((a, b) => a + b, 0) / values.length;
            case 'count':
                return values.length;
            case 'min':
                return Math.min(...values);
            case 'max':
                return Math.max(...values);
            default:
                return values[0];
        }
    }
    
    // Render pivot table HTML
    renderPivotTable(pivotData, rowFields, colFields, valueFields) {
        const container = document.getElementById('pivotTableContainer');
        
        // Get unique column keys
        const colKeys = new Set();
        Object.values(pivotData).forEach(row => {
            Object.keys(row).forEach(key => colKeys.add(key));
        });
        const sortedColKeys = Array.from(colKeys).sort();
        
        // Build table HTML
        let html = '<table class="data-table"><thead><tr>';
        
        // Header row
        rowFields.forEach(field => {
            html += `<th>${field}</th>`;
        });
        
        sortedColKeys.forEach(colKey => {
            html += `<th>${colKey}</th>`;
        });
        
        html += '</tr></thead><tbody>';
        
        // Data rows
        Object.entries(pivotData).forEach(([rowKey, cols]) => {
            html += '<tr>';
            
            // Row header
            rowKey.split('|').forEach(val => {
                html += `<td><strong>${val}</strong></td>`;
            });
            
            // Data cells
            sortedColKeys.forEach(colKey => {
                const value = cols[colKey] || 0;
                html += `<td>${this.formatValue(value)}</td>`;
            });
            
            html += '</tr>';
        });
        
        html += '</tbody></table>';
        
        container.innerHTML = html;
    }
    
    // Format value for display
    formatValue(value) {
        if (typeof value === 'number') {
            return value.toFixed(2);
        }
        return value;
    }
    
    // Export pivot table
    exportPivot() {
        if (!this.currentPivot) {
            Utils.showToast('No pivot table to export', 'warning');
            return;
        }
        
        // Convert pivot to flat array
        const flatData = [];
        Object.entries(this.currentPivot).forEach(([rowKey, cols]) => {
            const row = { rowKey };
            Object.entries(cols).forEach(([colKey, value]) => {
                row[colKey] = value;
            });
            flatData.push(row);
        });
        
        Utils.downloadCSV(flatData, 'pivot_table.csv');
        Utils.showToast('Pivot table exported', 'success');
    }
}

// Global pivot table builder instance
const pivotTableBuilder = new PivotTableBuilder();