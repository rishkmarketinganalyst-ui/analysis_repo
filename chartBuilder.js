// ========================================
// Advanced Chart Builder
// Supports Chart.js, ECharts, and Plotly
// ========================================

class ChartBuilder {
    constructor() {
        this.currentChart = null;
        this.savedCharts = [];
        this.chartContainer = null;
    }
    
    // Initialize chart builder
    init(containerId) {
        this.chartContainer = document.getElementById(containerId);
    }
    
    // Build chart based on configuration
    async buildChart(config) {
        try {
            // Destroy previous chart
            this.destroyChart();
            
            // Prepare data
            const chartData = this.prepareChartData(config);
            
            if (!chartData || chartData.labels.length === 0) {
                throw new Error('No data available for chart');
            }
            
            // Build chart based on library
            switch (config.library) {
                case 'chartjs':
                    this.buildChartJS(chartData, config);
                    break;
                case 'echarts':
                    this.buildECharts(chartData, config);
                    break;
                case 'plotly':
                    this.buildPlotly(chartData, config);
                    break;
                default:
                    throw new Error('Unknown chart library');
            }
            
            return true;
        } catch (error) {
            console.error('Chart build error:', error);
            Utils.showToast('Failed to build chart: ' + error.message, 'error');
            return false;
        }
    }
    
    // Prepare chart data from dataset
    prepareChartData(config) {
        const { xColumn, yColumns, groupBy, colorBy, aggFunc, sortBy, dataLimit, filters } = config;
        
        // Apply filters if any
        if (filters && filters.length > 0) {
            dataProcessor.applyFilters(filters);
        }
        
        let data = dataProcessor.processedData || [];
        
        // Limit data
        if (dataLimit && dataLimit < data.length) {
            data = data.slice(0, dataLimit);
        }
        
        // Group and aggregate if needed
        if (groupBy && aggFunc !== 'none') {
            const grouped = {};
            
            data.forEach(row => {
                const key = row[xColumn];
                if (!grouped[key]) {
                    grouped[key] = [];
                }
                yColumns.forEach(yCol => {
                    grouped[key].push(parseFloat(row[yCol]) || 0);
                });
            });
            
            const labels = Object.keys(grouped);
            const datasets = yColumns.map((yCol, idx) => {
                const values = labels.map(label => {
                    const nums = grouped[label].filter((_, i) => i % yColumns.length === idx);
                    return this.aggregate(nums, aggFunc);
                });
                
                return {
                    label: yCol,
                    data: values
                };
            });
            
            return { labels, datasets };
        }
        
        // Simple x-y mapping
        const labels = data.map(row => row[xColumn]);
        const datasets = yColumns.map(yCol => {
            return {
                label: yCol,
                data: data.map(row => parseFloat(row[yCol]) || 0)
            };
        });
        
        // Sort if requested
        if (sortBy) {
            const combined = labels.map((label, i) => ({
                label,
                values: datasets.map(ds => ds.data[i])
            }));
            
            if (sortBy === 'x-asc') {
                combined.sort((a, b) => a.label > b.label ? 1 : -1);
            } else if (sortBy === 'x-desc') {
                combined.sort((a, b) => a.label < b.label ? 1 : -1);
            } else if (sortBy === 'y-asc') {
                combined.sort((a, b) => a.values[0] - b.values[0]);
            } else if (sortBy === 'y-desc') {
                combined.sort((a, b) => b.values[0] - a.values[0]);
            }
            
            return {
                labels: combined.map(c => c.label),
                datasets: datasets.map((ds, idx) => ({
                    ...ds,
                    data: combined.map(c => c.values[idx])
                }))
            };
        }
        
        return { labels, datasets };
    }
    
    // Aggregate function
    aggregate(values, func) {
        const nums = values.filter(v => !isNaN(v));
        if (nums.length === 0) return 0;
        
        switch (func) {
            case 'sum':
                return nums.reduce((a, b) => a + b, 0);
            case 'mean':
                return nums.reduce((a, b) => a + b, 0) / nums.length;
            case 'count':
                return nums.length;
            case 'min':
                return Math.min(...nums);
            case 'max':
                return Math.max(...nums);
            default:
                return nums[0];
        }
    }
    
    // Build Chart.js chart
    buildChartJS(chartData, config) {
        // Clear container and create canvas
        this.chartContainer.innerHTML = '<canvas id="chartCanvas"></canvas>';
        const canvas = document.getElementById('chartCanvas');
        const ctx = canvas.getContext('2d');
        
        const colors = Utils.generateColorPalette(chartData.datasets.length, config.colorScheme);
        
        const datasets = chartData.datasets.map((ds, idx) => {
            const color = colors[idx];
            
            const dataset = {
                label: ds.label,
                data: ds.data,
                backgroundColor: config.chartType === 'line' ? 
                    `${color}33` : color,
                borderColor: color,
                borderWidth: 2,
                tension: config.smoothLines ? 0.4 : 0,
                fill: config.chartType === 'area'
            };
            
            if (config.chartType === 'scatter') {
                dataset.pointRadius = 5;
                dataset.pointHoverRadius = 7;
            }
            
            return dataset;
        });
        
        let chartType = config.chartType;
        if (chartType === 'area') chartType = 'line';
        
        const chartConfig = {
            type: chartType,
            data: {
                labels: chartData.labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: config.showLegend,
                        position: 'top'
                    },
                    title: {
                        display: !!config.title,
                        text: config.title || '',
                        font: { size: 16, weight: 'bold' }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: chartType !== 'pie' && chartType !== 'doughnut' && chartType !== 'radar' ? {
                    x: {
                        display: true,
                        grid: {
                            display: config.showGrid
                        }
                    },
                    y: {
                        display: true,
                        grid: {
                            display: config.showGrid
                        },
                        beginAtZero: true
                    }
                } : {},
                animation: {
                    duration: config.enableAnimation ? 1000 : 0
                }
            }
        };
        
        // Stacked mode for bar charts
        if (config.stackedMode && (chartType === 'bar' || chartType === 'line')) {
            chartConfig.options.scales.x.stacked = true;
            chartConfig.options.scales.y.stacked = true;
        }
        
        this.currentChart = new Chart(ctx, chartConfig);
    }
    
    // Build ECharts chart
    buildECharts(chartData, config) {
        this.chartContainer.innerHTML = '';
        const chart = echarts.init(this.chartContainer);
        
        const colors = Utils.generateColorPalette(chartData.datasets.length, config.colorScheme);
        
        let option = {};
        
        switch (config.chartType) {
            case 'line':
            case 'area':
                option = {
                    color: colors,
                    title: {
                        text: config.title || '',
                        left: 'center',
                        textStyle: { fontSize: 16, fontWeight: 'bold' }
                    },
                    tooltip: {
                        trigger: 'axis',
                        axisPointer: { type: 'cross' }
                    },
                    legend: {
                        data: chartData.datasets.map(ds => ds.label),
                        top: 30,
                        show: config.showLegend
                    },
                    grid: {
                        left: '3%',
                        right: '4%',
                        bottom: '3%',
                        containLabel: true,
                        show: config.showGrid
                    },
                    xAxis: {
                        type: 'category',
                        data: chartData.labels,
                        boundaryGap: false
                    },
                    yAxis: {
                        type: 'value'
                    },
                    series: chartData.datasets.map(ds => ({
                        name: ds.label,
                        type: 'line',
                        data: ds.data,
                        smooth: config.smoothLines,
                        areaStyle: config.chartType === 'area' ? {} : null,
                        label: {
                            show: config.showDataLabels,
                            position: 'top'
                        }
                    }))
                };
                break;
                
            case 'bar':
                option = {
                    color: colors,
                    title: {
                        text: config.title || '',
                        left: 'center'
                    },
                    tooltip: {
                        trigger: 'axis',
                        axisPointer: { type: 'shadow' }
                    },
                    legend: {
                        data: chartData.datasets.map(ds => ds.label),
                        top: 30,
                        show: config.showLegend
                    },
                    grid: {
                        left: '3%',
                        right: '4%',
                        bottom: '3%',
                        containLabel: true
                    },
                    xAxis: {
                        type: 'category',
                        data: chartData.labels
                    },
                    yAxis: {
                        type: 'value'
                    },
                    series: chartData.datasets.map(ds => ({
                        name: ds.label,
                        type: 'bar',
                        data: ds.data,
                        stack: config.stackedMode ? 'total' : null,
                        label: {
                            show: config.showDataLabels,
                            position: 'top'
                        }
                    }))
                };
                break;
                
            case 'pie':
                option = {
                    color: colors,
                    title: {
                        text: config.title || '',
                        left: 'center'
                    },
                    tooltip: {
                        trigger: 'item',
                        formatter: '{a} <br/>{b}: {c} ({d}%)'
                    },
                    legend: {
                        orient: 'vertical',
                        left: 'left',
                        show: config.showLegend
                    },
                    series: [{
                        name: chartData.datasets[0].label,
                        type: 'pie',
                        radius: '50%',
                        data: chartData.labels.map((label, idx) => ({
                            value: chartData.datasets[0].data[idx],
                            name: label
                        })),
                        emphasis: {
                            itemStyle: {
                                shadowBlur: 10,
                                shadowOffsetX: 0,
                                shadowColor: 'rgba(0, 0, 0, 0.5)'
                            }
                        },
                        label: {
                            show: config.showDataLabels
                        }
                    }]
                };
                break;
                
            case 'scatter':
                option = {
                    color: colors,
                    title: {
                        text: config.title || '',
                        left: 'center'
                    },
                    tooltip: {
                        trigger: 'item'
                    },
                    legend: {
                        data: chartData.datasets.map(ds => ds.label),
                        top: 30,
                        show: config.showLegend
                    },
                    xAxis: {
                        type: 'value'
                    },
                    yAxis: {
                        type: 'value'
                    },
                    series: chartData.datasets.map(ds => ({
                        name: ds.label,
                        type: 'scatter',
                        data: ds.data.map((val, idx) => [chartData.labels[idx], val]),
                        symbolSize: 10
                    }))
                };
                break;
                
            case 'radar':
                option = {
                    color: colors,
                    title: {
                        text: config.title || '',
                        left: 'center'
                    },
                    tooltip: {},
                    legend: {
                        data: chartData.datasets.map(ds => ds.label),
                        top: 30,
                        show: config.showLegend
                    },
                    radar: {
                        indicator: chartData.labels.map(label => ({ name: label, max: Math.max(...chartData.datasets.map(ds => Math.max(...ds.data))) }))
                    },
                    series: [{
                        type: 'radar',
                        data: chartData.datasets.map(ds => ({
                            value: ds.data,
                            name: ds.label
                        }))
                    }]
                };
                break;
                
            case 'heatmap':
                const maxValue = Math.max(...chartData.datasets.flatMap(ds => ds.data));
                option = {
                    title: {
                        text: config.title || '',
                        left: 'center'
                    },
                    tooltip: {
                        position: 'top'
                    },
                    grid: {
                        height: '50%',
                        top: '10%'
                    },
                    xAxis: {
                        type: 'category',
                        data: chartData.labels,
                        splitArea: { show: true }
                    },
                    yAxis: {
                        type: 'category',
                        data: chartData.datasets.map(ds => ds.label),
                        splitArea: { show: true }
                    },
                    visualMap: {
                        min: 0,
                        max: maxValue,
                        calculable: true,
                        orient: 'horizontal',
                        left: 'center',
                        bottom: '15%'
                    },
                    series: [{
                        type: 'heatmap',
                        data: chartData.datasets.flatMap((ds, yIdx) => 
                            ds.data.map((val, xIdx) => [xIdx, yIdx, val])
                        ),
                        label: {
                            show: config.showDataLabels
                        },
                        emphasis: {
                            itemStyle: {
                                shadowBlur: 10,
                                shadowColor: 'rgba(0, 0, 0, 0.5)'
                            }
                        }
                    }]
                };
                break;
        }
        
        option.animation = config.enableAnimation;
        chart.setOption(option);
        this.currentChart = chart;
    }
    
    // Build Plotly chart
    buildPlotly(chartData, config) {
        this.chartContainer.innerHTML = '';
        
        const colors = Utils.generateColorPalette(chartData.datasets.length, config.colorScheme);
        
        const traces = chartData.datasets.map((ds, idx) => {
            const trace = {
                name: ds.label,
                x: chartData.labels,
                y: ds.data,
                type: this.getPlotlyType(config.chartType),
                mode: config.chartType === 'scatter' ? 'markers' : 'lines+markers',
                marker: { color: colors[idx], size: 8 },
                line: { 
                    color: colors[idx],
                    shape: config.smoothLines ? 'spline' : 'linear'
                }
            };
            
            if (config.chartType === 'area') {
                trace.fill = 'tozeroy';
            }
            
            if (config.chartType === 'bar') {
                trace.marker = { color: colors[idx] };
            }
            
            return trace;
        });
        
        const layout = {
            title: config.title || '',
            showlegend: config.showLegend,
            xaxis: {
                title: '',
                showgrid: config.showGrid
            },
            yaxis: {
                title: '',
                showgrid: config.showGrid
            },
            hovermode: 'closest'
        };
        
        if (config.stackedMode && config.chartType === 'bar') {
            layout.barmode = 'stack';
        }
        
        const plotConfig = {
            responsive: true,
            displayModeBar: true,
            displaylogo: false
        };
        
        Plotly.newPlot(this.chartContainer, traces, layout, plotConfig);
        this.currentChart = 'plotly';
    }
    
    // Get Plotly chart type
    getPlotlyType(type) {
        const typeMap = {
            line: 'scatter',
            area: 'scatter',
            bar: 'bar',
            scatter: 'scatter',
            pie: 'pie',
            box: 'box'
        };
        return typeMap[type] || 'scatter';
    }
    
    // Destroy current chart
    destroyChart() {
        if (this.currentChart) {
            if (typeof this.currentChart.destroy === 'function') {
                this.currentChart.destroy();
            } else if (typeof this.currentChart.dispose === 'function') {
                this.currentChart.dispose();
            } else if (this.currentChart === 'plotly') {
                Plotly.purge(this.chartContainer);
            }
            this.currentChart = null;
        }
    }
    
    // Save current chart
    saveChart(config) {
        const chartData = {
            id: Date.now(),
            config: config,
            timestamp: new Date().toISOString(),
            thumbnail: null
        };
        
        this.savedCharts.push(chartData);
        this.saveTos();
        
        Utils.showToast('Chart saved successfully', 'success');
    }
    
    // Save to localStorage
    saveToLocalStorage() {
        try {
            localStorage.setItem('savedCharts', JSON.stringify(this.savedCharts));
        } catch (error) {
            console.error('Failed to save charts:', error);
        }
    }
    
    // Load from localStorage
    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('savedCharts');
            if (saved) {
                this.savedCharts = JSON.parse(saved);
            }
        } catch (error) {
            console.error('Failed to load charts:', error);
        }
    }
}

// Global chart builder instance
const chartBuilder = new ChartBuilder();