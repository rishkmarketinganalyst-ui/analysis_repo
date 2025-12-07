// ========================================
// Data Processing & Management
// ========================================

class DataProcessor {
    constructor() {
        this.rawData = null;
        this.processedData = null;
        this.columns = [];
        this.columnTypes = {};
        this.fileInfo = [];
    }
    
    // Process uploaded files
    async processFiles(files, options = {}) {
        Utils.showLoading('Processing files...');
        
        try {
            const dataFrames = [];
            
            for (const file of files) {
                const data = await this.readFile(file);
                if (data && data.length > 0) {
                    // Add source metadata
                    data.forEach(row => {
                        row._source_file = file.name;
                    });
                    dataFrames.push(data);
                    
                    this.fileInfo.push({
                        name: file.name,
                        size: file.size,
                        rows: data.length,
                        cols: Object.keys(data[0] || {}).length
                    });
                }
            }
            
            if (dataFrames.length === 0) {
                throw new Error('No valid data found in files');
            }
            
            // Merge data based on strategy
            this.rawData = this.mergeData(dataFrames, options);
            
            // Remove duplicates if requested
            if (options.dedupe) {
                this.rawData = this.removeDuplicates(this.rawData);
            }
            
            // Analyze columns
            this.analyzeColumns();
            
            this.processedData = this.rawData;
            
            Utils.hideLoading();
            return {
                success: true,
                rows: this.rawData.length,
                columns: this.columns.length,
                fileInfo: this.fileInfo
            };
            
        } catch (error) {
            Utils.hideLoading();
            console.error('File processing error:', error);
            throw error;
        }
    }
    
    // Read single file
    async readFile(file) {
        return new Promise((resolve, reject) => {
            const fileName = file.name.toLowerCase();
            
            if (fileName.endsWith('.csv')) {
                Papa.parse(file, {
                    header: true,
                    dynamicTyping: true,
                    skipEmptyLines: true,
                    complete: (results) => resolve(results.data),
                    error: (error) => reject(error)
                });
            } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = new Uint8Array(e.target.result);
                        const workbook = XLSX.read(data, { type: 'array' });
                        
                        // Read all sheets and combine
                        const allData = [];
                        workbook.SheetNames.forEach(sheetName => {
                            const sheet = workbook.Sheets[sheetName];
                            const json = XLSX.utils.sheet_to_json(sheet);
                            json.forEach(row => {
                                row._source_sheet = sheetName;
                                allData.push(row);
                            });
                        });
                        
                        resolve(allData);
                    } catch (error) {
                        reject(error);
                    }
                };
                reader.onerror = () => reject(reader.error);
                reader.readAsArrayBuffer(file);
            } else {
                reject(new Error('Unsupported file type'));
            }
        });
    }
    
    // Merge multiple dataframes
    mergeData(dataFrames, options) {
        if (dataFrames.length === 0) return [];
        if (dataFrames.length === 1) return dataFrames[0];
        
        const strategy = options.mergeStrategy || 'append';
        
        if (strategy === 'append') {
            // Simple concatenation
            return dataFrames.flat();
        } else if (strategy === 'inner_join') {
            // Inner join on key
            const joinKey = options.joinKey;
            if (!joinKey) {
                throw new Error('Join key required for inner join');
            }
            
            let result = dataFrames[0];
            for (let i = 1; i < dataFrames.length; i++) {
                result = this.innerJoin(result, dataFrames[i], joinKey);
            }
            return result;
        }
        
        return dataFrames.flat();
    }
    
    // Inner join two arrays
    innerJoin(left, right, key) {
        const result = [];
        const rightIndex = {};
        
        // Index right array
        right.forEach(row => {
            const keyVal = row[key];
            if (!rightIndex[keyVal]) {
                rightIndex[keyVal] = [];
            }
            rightIndex[keyVal].push(row);
        });
        
        // Join
        left.forEach(leftRow => {
            const keyVal = leftRow[key];
            if (rightIndex[keyVal]) {
                rightIndex[keyVal].forEach(rightRow => {
                    result.push({ ...leftRow, ...rightRow });
                });
            }
        });
        
        return result;
    }
    
    // Remove duplicate rows
    removeDuplicates(data) {
        const seen = new Set();
        return data.filter(row => {
            const key = JSON.stringify(row);
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }
    
    // Analyze column types
    analyzeColumns() {
        if (!this.rawData || this.rawData.length === 0) return;
        
        const firstRow = this.rawData[0];
        this.columns = Object.keys(firstRow);
        
        this.columns.forEach(col => {
            const values = this.rawData.map(row => row[col]);
            this.columnTypes[col] = Utils.detectColumnType(values);
        });
    }
    
    // Get column values
    getColumnValues(columnName) {
        if (!this.processedData) return [];
        return this.processedData.map(row => row[columnName]);
    }
    
    // Get numeric columns
    getNumericColumns() {
        return this.columns.filter(col => this.columnTypes[col] === 'numeric');
    }
    
    // Get categorical columns
    getCategoricalColumns() {
        return this.columns.filter(col => 
            this.columnTypes[col] === 'categorical' || 
            this.columnTypes[col] === 'boolean'
        );
    }
    
    // Get datetime columns
    getDatetimeColumns() {
        return this.columns.filter(col => this.columnTypes[col] === 'datetime');
    }
    
    // Apply filters
    applyFilters(filters) {
        if (!filters || filters.length === 0) {
            this.processedData = this.rawData;
            return;
        }
        
        this.processedData = this.rawData.filter(row => {
            return filters.every(filter => {
                const value = row[filter.column];
                
                switch (filter.operator) {
                    case 'equals':
                        return value == filter.value;
                    case 'not_equals':
                        return value != filter.value;
                    case 'greater':
                        return parseFloat(value) > parseFloat(filter.value);
                    case 'less':
                        return parseFloat(value) < parseFloat(filter.value);
                    case 'contains':
                        return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
                    case 'in':
                        return filter.value.includes(value);
                    default:
                        return true;
                }
            });
        });
    }
    
    // Group and aggregate data
    groupBy(groupColumn, valueColumn, aggFunc = 'sum') {
        if (!this.processedData) return [];
        
        const groups = {};
        
        this.processedData.forEach(row => {
            const key = row[groupColumn];
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(row[valueColumn]);
        });
        
        const result = [];
        Object.entries(groups).forEach(([key, values]) => {
            const numValues = values.filter(v => !isNaN(parseFloat(v))).map(v => parseFloat(v));
            let aggValue = 0;
            
            switch (aggFunc) {
                case 'sum':
                    aggValue = numValues.reduce((a, b) => a + b, 0);
                    break;
                case 'mean':
                    aggValue = numValues.reduce((a, b) => a + b, 0) / numValues.length;
                    break;
                case 'count':
                    aggValue = numValues.length;
                    break;
                case 'min':
                    aggValue = Math.min(...numValues);
                    break;
                case 'max':
                    aggValue = Math.max(...numValues);
                    break;
            }
            
            result.push({
                [groupColumn]: key,
                [valueColumn]: aggValue
            });
        });
        
        return result;
    }
    
    // Sort data
    sortData(column, direction = 'asc') {
        if (!this.processedData) return;
        
        this.processedData.sort((a, b) => {
            let valA = a[column];
            let valB = b[column];
            
            // Handle numeric values
            if (!isNaN(parseFloat(valA)) && !isNaN(parseFloat(valB))) {
                valA = parseFloat(valA);
                valB = parseFloat(valB);
            }
            
            if (direction === 'asc') {
                return valA > valB ? 1 : valA < valB ? -1 : 0;
            } else {
                return valA < valB ? 1 : valA > valB ? -1 : 0;
            }
        });
    }
    
    // Get paginated data
    getPaginatedData(page = 1, perPage = 50) {
        if (!this.processedData) return { data: [], total: 0, pages: 0 };
        
        const start = (page - 1) * perPage;
        const end = start + perPage;
        
        return {
            data: this.processedData.slice(start, end),
            total: this.processedData.length,
            pages: Math.ceil(this.processedData.length / perPage),
            currentPage: page
        };
    }
    
    // Calculate correlation matrix
    calculateCorrelationMatrix() {
        const numericCols = this.getNumericColumns();
        const matrix = {};
        
        numericCols.forEach(col1 => {
            matrix[col1] = {};
            numericCols.forEach(col2 => {
                const values1 = this.getColumnValues(col1).map(v => parseFloat(v)).filter(v => !isNaN(v));
                const values2 = this.getColumnValues(col2).map(v => parseFloat(v)).filter(v => !isNaN(v));
                
                if (values1.length > 0 && values2.length > 0) {
                    matrix[col1][col2] = Utils.calculateCorrelation(values1, values2);
                } else {
                    matrix[col1][col2] = 0;
                }
            });
        });
        
        return matrix;
    }
    
    // Get summary statistics
    getSummaryStatistics() {
        const stats = {};
        const numericCols = this.getNumericColumns();
        
        numericCols.forEach(col => {
            const values = this.getColumnValues(col).map(v => parseFloat(v)).filter(v => !isNaN(v));
            stats[col] = Utils.calculateStats(values);
        });
        
        return stats;
    }
    
    // Export current data
    exportData(format = 'csv') {
        if (!this.processedData || this.processedData.length === 0) {
            Utils.showToast('No data to export', 'warning');
            return;
        }
        
        if (format === 'csv') {
            Utils.downloadCSV(this.processedData, 'export.csv');
        } else if (format === 'json') {
            const json = JSON.stringify(this.processedData, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'export.json';
            a.click();
            URL.revokeObjectURL(url);
        }
    }
    
    // Clear all data
    clearData() {
        this.rawData = null;
        this.processedData = null;
        this.columns = [];
        this.columnTypes = {};
        this.fileInfo = [];
    }
}

// Global data processor instance
const dataProcessor = new DataProcessor();