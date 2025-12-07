// ========================================
// Data Insights & Analytics
// ========================================

class InsightsEngine {
    constructor() {
        this.correlationMatrix = null;
        this.statistics = null;
    }
    
    // Generate comprehensive insights
    generateInsights() {
        try {
            const insights = [];
            
            // Basic dataset info
            insights.push(this.getDatasetInfo());
            
            // Column type distribution
            insights.push(this.getColumnTypeDistribution());
            
            // Missing values analysis
            insights.push(this.getMissingValuesAnalysis());
            
            // Numeric columns statistics
            insights.push(this.getNumericStatistics());
            
            // Categorical insights
            insights.push(this.getCategoricalInsights());
            
            // Correlation insights
            insights.push(this.getCorrelationInsights());
            
            return insights.filter(i => i !== null);
            
        } catch (error) {
            console.error('Insights generation error:', error);
            return [];
        }
    }
    
    // Dataset basic information
    getDatasetInfo() {
        const data = dataProcessor.processedData;
        if (!data || data.length === 0) return null;
        
        return {
            type: 'info',
            title: 'Dataset Overview',
            content: [
                { label: 'Total Rows', value: Utils.formatNumber(data.length) },
                { label: 'Total Columns', value: dataProcessor.columns.length },
                { label: 'Memory Size', value: this.estimateMemorySize(data) }
            ]
        };
    }
    
    // Column type distribution
    getColumnTypeDistribution() {
        const types = Object.values(dataProcessor.columnTypes);
        const distribution = {
            numeric: types.filter(t => t === 'numeric').length,
            categorical: types.filter(t => t === 'categorical').length,
            datetime: types.filter(t => t === 'datetime').length,
            boolean: types.filter(t => t === 'boolean').length
        };
        
        return {
            type: 'distribution',
            title: 'Column Type Distribution',
            content: Object.entries(distribution)
                .filter(([_, count]) => count > 0)
                .map(([type, count]) => ({ label: type, value: count }))
        };
    }
    
    // Missing values analysis
    getMissingValuesAnalysis() {
        const data = dataProcessor.processedData;
        const missing = {};
        
        dataProcessor.columns.forEach(col => {
            const nullCount = data.filter(row => 
                row[col] === null || 
                row[col] === undefined || 
                row[col] === ''
            ).length;
            
            if (nullCount > 0) {
                missing[col] = {
                    count: nullCount,
                    percentage: ((nullCount / data.length) * 100).toFixed(2)
                };
            }
        });
        
        if (Object.keys(missing).length === 0) {
            return {
                type: 'success',
                title: 'Data Quality',
                content: 'No missing values detected'
            };
        }
        
        return {
            type: 'warning',
            title: 'Missing Values Detected',
            content: Object.entries(missing).map(([col, info]) => ({
                label: col,
                value: `${info.count} (${info.percentage}%)`
            }))
        };
    }
    
    // Numeric statistics
    getNumericStatistics() {
        const numericCols = dataProcessor.getNumericColumns();
        if (numericCols.length === 0) return null;
        
        this.statistics = dataProcessor.getSummaryStatistics();
        
        const topStats = [];
        numericCols.slice(0, 5).forEach(col => {
            const stats = this.statistics[col];
            if (stats) {
                topStats.push({
                    column: col,
                    stats: {
                        Mean: stats.mean.toFixed(2),
                        Median: stats.median.toFixed(2),
                        'Std Dev': stats.stdDev.toFixed(2),
                        Min: stats.min.toFixed(2),
                        Max: stats.max.toFixed(2)
                    }
                });
            }
        });
        
        return {
            type: 'statistics',
            title: 'Numeric Column Statistics',
            content: topStats
        };
    }
    
    // Categorical insights
    getCategoricalInsights() {
        const catCols = dataProcessor.getCategoricalColumns();
        if (catCols.length === 0) return null;
        
        const insights = [];
        catCols.slice(0, 5).forEach(col => {
            const values = dataProcessor.getColumnValues(col);
            const unique = Utils.getUniqueValues(values);
            
            insights.push({
                column: col,
                uniqueCount: unique.length,
                topValues: this.getTopValues(values, 3)
            });
        });
        
        return {
            type: 'categorical',
            title: 'Categorical Column Insights',
            content: insights
        };
    }
    
    // Correlation insights
    getCorrelationInsights() {
        const numericCols = dataProcessor.getNumericColumns();
        if (numericCols.length < 2) return null;
        
        this.correlationMatrix = dataProcessor.calculateCorrelationMatrix();
        
        // Find top correlations
        const correlations = [];
        numericCols.forEach((col1, i) => {
            numericCols.forEach((col2, j) => {
                if (i < j) {
                    const corr = this.correlationMatrix[col1][col2];
                    if (Math.abs(corr) > 0.5 && Math.abs(corr) < 1) {
                        correlations.push({
                            col1,
                            col2,
                            correlation: corr.toFixed(3),
                            strength: this.getCorrelationStrength(corr)
                        });
                    }
                }
            });
        });
        
        // Sort by absolute correlation
        correlations.sort((a, b) => Math.abs(parseFloat(b.correlation)) - Math.abs(parseFloat(a.correlation)));
        
        if (correlations.length === 0) {
            return {
                type: 'info',
                title: 'Correlation Analysis',
                content: 'No strong correlations found (|r| > 0.5)'
            };
        }
        
        return {
            type: 'correlation',
            title: 'Top Correlations',
            content: correlations.slice(0, 10)
        };
    }
    
    // Get correlation strength description
    getCorrelationStrength(corr) {
        const abs = Math.abs(corr);
        if (abs >= 0.9) return 'Very Strong';
        if (abs >= 0.7) return 'Strong';
        if (abs >= 0.5) return 'Moderate';
        if (abs >= 0.3) return 'Weak';
        return 'Very Weak';
    }
    
    // Get top values in array
    getTopValues(arr, count = 5) {
        const frequency = {};
        arr.forEach(val => {
            if (val !== null && val !== undefined) {
                frequency[val] = (frequency[val] || 0) + 1;
            }
        });
        
        return Object.entries(frequency)
            .sort((a, b) => b[1] - a[1])
            .slice(0, count)
            .map(([value, count]) => ({ value, count }));
    }
    
    // Estimate memory size
    estimateMemorySize(data) {
        const str = JSON.stringify(data);
        const bytes = new Blob([str]).size;
        return Utils.formatBytes(bytes);
    }
    
    // Render insights to HTML
    renderInsights(insights) {
        const container = document.getElementById('insightsContent');
        let html = '';
        
        insights.forEach(insight => {
            html += this.renderInsightCard(insight);
        });
        
        container.innerHTML = html;
    }
    
    // Render single insight card
    renderInsightCard(insight) {
        let content = '';
        
        if (typeof insight.content === 'string') {
            content = `<p>${insight.content}</p>`;
        } else if (Array.isArray(insight.content)) {
            if (insight.type === 'statistics') {
                content = this.renderStatistics(insight.content);
            } else if (insight.type === 'categorical') {
                content = this.renderCategorical(insight.content);
            } else if (insight.type === 'correlation') {
                content = this.renderCorrelations(insight.content);
            } else {
                content = '<ul>';
                insight.content.forEach(item => {
                    if (typeof item === 'object' && item.label) {
                        content += `<li><strong>${item.label}:</strong> ${item.value}</li>`;
                    }
                });
                content += '</ul>';
            }
        }
        
        const iconMap = {
            info: 'fa-info-circle',
            success: 'fa-check-circle',
            warning: 'fa-exclamation-triangle',
            statistics: 'fa-chart-bar',
            categorical: 'fa-tags',
            correlation: 'fa-project-diagram',
            distribution: 'fa-pie-chart'
        };
        
        const icon = iconMap[insight.type] || 'fa-info-circle';
        
        return `
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas ${icon}"></i> ${insight.title}</h3>
                </div>
                <div class="card-body">
                    ${content}
                </div>
            </div>
        `;
    }
    
    // Render statistics table
    renderStatistics(data) {
        let html = '<div class="table-container"><table class="data-table"><thead><tr>';
        html += '<th>Column</th><th>Mean</th><th>Median</th><th>Std Dev</th><th>Min</th><th>Max</th>';
        html += '</tr></thead><tbody>';
        
        data.forEach(item => {
            html += `<tr><td><strong>${item.column}</strong></td>`;
            Object.values(item.stats).forEach(val => {
                html += `<td>${val}</td>`;
            });
            html += '</tr>';
        });
        
        html += '</tbody></table></div>';
        return html;
    }
    
    // Render categorical insights
    renderCategorical(data) {
        let html = '';
        data.forEach(item => {
            html += `<div class="stat-card">
                <div class="stat-label">${item.column}</div>
                <div class="stat-value">${item.uniqueCount} unique values</div>
                <p class="text-muted">Top values: ${item.topValues.map(v => `${v.value} (${v.count})`).join(', ')}</p>
            </div>`;
        });
        return `<div class="stats-grid">${html}</div>`;
    }
    
    // Render correlations
    renderCorrelations(data) {
        let html = '<ul>';
        data.forEach(item => {
            const color = parseFloat(item.correlation) > 0 ? 'var(--success-color)' : 'var(--danger-color)';
            html += `<li>
                <strong>${item.col1}</strong> ↔ <strong>${item.col2}</strong>: 
                <span style="color: ${color}">${item.correlation}</span>
                <em class="text-muted">(${item.strength})</em>
            </li>`;
        });
        html += '</ul>';
        return html;
    }
    
    // Render correlation matrix heatmap
    renderCorrelationMatrix() {
        if (!this.correlationMatrix) {
            this.correlationMatrix = dataProcessor.calculateCorrelationMatrix();
        }
        
        const numericCols = dataProcessor.getNumericColumns();
        const container = document.getElementById('correlationMatrix');
        
        // Prepare data for heatmap
        const data = [];
        numericCols.forEach((col1, i) => {
            numericCols.forEach((col2, j) => {
                data.push([i, j, this.correlationMatrix[col1][col2]]);
            });
        });
        
        // Create ECharts heatmap
        const chart = echarts.init(container);
        const option = {
            tooltip: {
                position: 'top',
                formatter: (params) => {
                    return `${numericCols[params.value[0]]} vs ${numericCols[params.value[1]]}<br/>Correlation: ${params.value[2].toFixed(3)}`;
                }
            },
            grid: {
                height: '70%',
                top: '5%'
            },
            xAxis: {
                type: 'category',
                data: numericCols,
                splitArea: { show: true },
                axisLabel: {
                    rotate: 45,
                    interval: 0
                }
            },
            yAxis: {
                type: 'category',
                data: numericCols,
                splitArea: { show: true }
            },
            visualMap: {
                min: -1,
                max: 1,
                calculable: true,
                orient: 'horizontal',
                left: 'center',
                bottom: '5%',
                inRange: {
                    color: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8', '#ffffbf', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026']
                }
            },
            series: [{
                type: 'heatmap',
                data: data,
                label: {
                    show: true,
                    formatter: (params) => params.value[2].toFixed(2)
                },
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }]
        };
        
        chart.setOption(option);
    }
}

// Global insights engine instance
const insightsEngine = new InsightsEngine();