// ========================================
// Utility Functions
// ========================================

const Utils = {
    // Toast notification system
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = type === 'success' ? 'fa-check-circle' : 
                     type === 'error' ? 'fa-exclamation-circle' : 
                     type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle';
        
        toast.innerHTML = `
            <i class="fas ${icon} toast-icon"></i>
            <span class="toast-message">${message}</span>
            <button class="toast-close">&times;</button>
        `;
        
        container.appendChild(toast);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        }, 5000);
        
        // Manual close
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.remove();
        });
    },
    
    // Show/hide loading overlay
    showLoading(message = 'Processing data...') {
        const overlay = document.getElementById('loadingOverlay');
        overlay.querySelector('p').textContent = message;
        overlay.classList.add('active');
    },
    
    hideLoading() {
        document.getElementById('loadingOverlay').classList.remove('active');
    },
    
    // Format numbers with commas
    formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },
    
    // Format bytes to human readable
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    },
    
    // Detect column type
    detectColumnType(values) {
        const nonNull = values.filter(v => v !== null && v !== undefined && v !== '');
        if (nonNull.length === 0) return 'text';
        
        // Check if numeric
        const numericCount = nonNull.filter(v => !isNaN(parseFloat(v))).length;
        if (numericCount / nonNull.length > 0.8) return 'numeric';
        
        // Check if date
        const dateCount = nonNull.filter(v => {
            const date = new Date(v);
            return date instanceof Date && !isNaN(date);
        }).length;
        if (dateCount / nonNull.length > 0.8) return 'datetime';
        
        // Check if boolean
        const boolCount = nonNull.filter(v => 
            v === true || v === false || 
            v === 'true' || v === 'false' ||
            v === 'TRUE' || v === 'FALSE' ||
            v === 'yes' || v === 'no' ||
            v === 'YES' || v === 'NO'
        ).length;
        if (boolCount / nonNull.length > 0.8) return 'boolean';
        
        return 'categorical';
    },
    
    // Get unique values from array
    getUniqueValues(arr) {
        return [...new Set(arr.filter(v => v !== null && v !== undefined))];
    },
    
    // Calculate statistics for numeric column
    calculateStats(values) {
        const nums = values.filter(v => !isNaN(parseFloat(v))).map(v => parseFloat(v));
        if (nums.length === 0) return null;
        
        const sorted = nums.sort((a, b) => a - b);
        const sum = nums.reduce((a, b) => a + b, 0);
        const mean = sum / nums.length;
        const median = sorted[Math.floor(sorted.length / 2)];
        const min = Math.min(...nums);
        const max = Math.max(...nums);
        const variance = nums.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / nums.length;
        const stdDev = Math.sqrt(variance);
        
        return { min, max, mean, median, stdDev, count: nums.length, sum };
    },
    
    // Download data as CSV
    downloadCSV(data, filename = 'export.csv') {
        const csv = this.convertToCSV(data);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    },
    
    // Convert array of objects to CSV
    convertToCSV(data) {
        if (!data || data.length === 0) return '';
        
        const headers = Object.keys(data[0]);
        const csvRows = [];
        
        // Add headers
        csvRows.push(headers.join(','));
        
        // Add data rows
        for (const row of data) {
            const values = headers.map(header => {
                const val = row[header];
                return typeof val === 'string' ? `"${val}"` : val;
            });
            csvRows.push(values.join(','));
        }
        
        return csvRows.join('\n');
    },
    
    // Generate random color
    randomColor() {
        const colors = [
            '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
            '#f59e0b', '#10b981', '#3b82f6', '#06b6d4',
            '#14b8a6', '#84cc16', '#eab308', '#ef4444'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    },
    
    // Generate color palette
    generateColorPalette(count, scheme = 'default') {
        const palettes = {
            default: ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#06b6d4'],
            pastel: ['#fecaca', '#fed7aa', '#fef3c7', '#d9f99d', '#bfdbfe', '#ddd6fe', '#fbcfe8', '#fecdd3'],
            vibrant: ['#dc2626', '#ea580c', '#d97706', '#65a30d', '#059669', '#0891b2', '#2563eb', '#7c3aed'],
            monochrome: ['#1f2937', '#374151', '#4b5563', '#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb', '#f3f4f6'],
            gradient: ['#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#c026d3', '#db2777', '#e11d48']
        };
        
        const palette = palettes[scheme] || palettes.default;
        const colors = [];
        
        for (let i = 0; i < count; i++) {
            colors.push(palette[i % palette.length]);
        }
        
        return colors;
    },
    
    // Deep clone object
    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    },
    
    // Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // Get correlation coefficient
    calculateCorrelation(x, y) {
        const n = x.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
        
        for (let i = 0; i < n; i++) {
            sumX += x[i];
            sumY += y[i];
            sumXY += x[i] * y[i];
            sumX2 += x[i] * x[i];
            sumY2 += y[i] * y[i];
        }
        
        const numerator = (n * sumXY) - (sumX * sumY);
        const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
        
        return denominator === 0 ? 0 : numerator / denominator;
    },
    
    // Export chart as image
    async exportChartAsImage(chartElement, filename = 'chart.png') {
        try {
            // For canvas-based charts (Chart.js)
            if (chartElement.tagName === 'CANVAS') {
                const url = chartElement.toDataURL('image/png');
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.click();
                return;
            }
            
            // For SVG-based charts (ECharts, Plotly)
            const svg = chartElement.querySelector('svg');
            if (svg) {
                const svgData = new XMLSerializer().serializeToString(svg);
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const img = new Image();
                
                img.onload = () => {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    const url = canvas.toDataURL('image/png');
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    a.click();
                };
                
                img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
            }
        } catch (error) {
            console.error('Export failed:', error);
            Utils.showToast('Failed to export chart', 'error');
        }
    }
};

// Color schemes for charts
const ColorSchemes = {
    default: ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#06b6d4'],
    pastel: ['#fecaca', '#fed7aa', '#fef3c7', '#d9f99d', '#bfdbfe', '#ddd6fe', '#fbcfe8', '#fecdd3'],
    vibrant: ['#dc2626', '#ea580c', '#d97706', '#65a30d', '#059669', '#0891b2', '#2563eb', '#7c3aed'],
    monochrome: ['#1f2937', '#374151', '#4b5563', '#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb', '#f3f4f6'],
    gradient: ['#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#c026d3', '#db2777', '#e11d48']
};