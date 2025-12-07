// ========================================
// Main Application Logic
// ========================================

class DashboardApp {
    constructor() {
        this.currentPage = 'uploadPage';
        this.filters = [];
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupNavigation();
        this.setupThemeToggle();
        this.setupMobileMenu();
        chartBuilder.init('chartContainer');
        this.loadState();
    }
    
    // Setup all event listeners
    setupEventListeners() {
        // Upload page
        this.setupFileUpload();
        
        // Visualization page
        this.setupVisualizationBuilder();
        
        // Pivot page
        this.setupPivotBuilder();
        
        // Insights page
        this.setupInsightsPage();
        
        // Auto report
        this.setupAutoReport();
        
        // Preview page
        this.setupPreviewPage();
        
        // Global actions
        document.getElementById('clearDataBtn').addEventListener('click', () => this.clearAllData());
    }
    
    // Setup file upload
    setupFileUpload() {
        const uploadZone = document.getElementById('uploadZone');
        const fileInput = document.getElementById('fileInput');
        const mergeStrategy = document.getElementById('mergeStrategy');
        const processBtn = document.getElementById('processFilesBtn');
        const proceedBtn = document.getElementById('proceedBtn');
        
        // Click to upload
        uploadZone.addEventListener('click', () => fileInput.click());
        
        // Drag and drop
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('drag-over');
        });
        
        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('drag-over');
        });
        
        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('drag-over');
            const files = Array.from(e.dataTransfer.files);
            this.handleFiles(files);
        });
        
        // File input change
        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            this.handleFiles(files);
        });
        
        // Merge strategy change
        mergeStrategy.addEventListener('change', (e) => {
            const joinKeyGroup = document.getElementById('joinKeyGroup');
            joinKeyGroup.style.display = e.target.value === 'inner_join' ? 'block' : 'none';
        });
        
        // Process files
        processBtn.addEventListener('click', () => this.processFiles());
        
        // Proceed to analysis
        proceedBtn.addEventListener('click', () => {
            this.navigateToPage('previewPage');
            this.updatePreviewPage();
        });
    }
    
    // Handle file selection
    handleFiles(files) {
        if (files.length === 0) return;
        
        const fileList = document.getElementById('fileList');
        const uploadOptions = document.getElementById('uploadOptions');
        
        let html = '<h4>Selected Files:</h4>';
        files.forEach((file, idx) => {
            html += `
                <div class="file-item">
                    <div class="file-info">
                        <i class="fas fa-file-excel"></i>
                        <div class="file-details">
                            <h4>${file.name}</h4>
                            <p>${Utils.formatBytes(file.size)}</p>
                        </div>
                    </div>
                    <div class="file-actions">
                        <button class="btn-icon" onclick="app.removeFile(${idx})">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        fileList.innerHTML = html;
        uploadOptions.style.display = 'block';
        
        this.selectedFiles = files;
    }
    
    // Remove file from selection
    removeFile(index) {
        this.selectedFiles.splice(index, 1);
        if (this.selectedFiles.length > 0) {
            this.handleFiles(this.selectedFiles);
        } else {
            document.getElementById('fileList').innerHTML = '';
            document.getElementById('uploadOptions').style.display = 'none';
        }
    }
    
    // Process uploaded files
    async processFiles() {
        if (!this.selectedFiles || this.selectedFiles.length === 0) {
            Utils.showToast('Please select files first', 'warning');
            return;
        }
        
        const options = {
            mergeStrategy: document.getElementById('mergeStrategy').value,
            joinKey: document.getElementById('joinKey').value,
            dedupe: document.getElementById('dedupeCheck').checked
        };
        
        try {
            const result = await dataProcessor.processFiles(this.selectedFiles, options);
            
            // Show results
            const resultsDiv = document.getElementById('uploadResults');
            const statsDiv = document.getElementById('uploadStats');
            
            let statsHtml = `
                <div class="stat-card">
                    <div class="stat-label">Total Rows</div>
                    <div class="stat-value">${Utils.formatNumber(result.rows)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Total Columns</div>
                    <div class="stat-value">${result.columns}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Files Processed</div>
                    <div class="stat-value">${result.fileInfo.length}</div>
                </div>
            `;
            
            statsDiv.innerHTML = statsHtml;
            resultsDiv.style.display = 'block';
            
            Utils.showToast('Files processed successfully!', 'success');
            this.saveState();
            
        } catch (error) {
            Utils.showToast('Error processing files: ' + error.message, 'error');
        }
    }
    
    // Setup visualization builder
    setupVisualizationBuilder() {
        const generateBtn = document.getElementById('generateChartBtn');
        const saveBtn = document.getElementById('saveChartBtn');
        const downloadBtn = document.getElementById('downloadChartBtn');
        const fullscreenBtn = document.getElementById('fullscreenChartBtn');
        const addFilterBtn = document.getElementById('addFilterBtn');
        
        // Collapsible sections
        document.querySelectorAll('.collapsible-header').forEach(header => {
            header.addEventListener('click', () => {
                header.parentElement.classList.toggle('open');
            });
        });
        
        // Generate chart
        generateBtn.addEventListener('click', () => this.generateChart());
        
        // Save chart
        saveBtn.addEventListener('click', () => this.saveChart());
        
        // Download chart
        downloadBtn.addEventListener('click', () => this.downloadChart());
        
        // Fullscreen
        fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        
        // Add filter
        addFilterBtn.addEventListener('click', () => this.addFilter());
    }
    
    // Generate chart
    async generateChart() {
        if (!dataProcessor.processedData || dataProcessor.processedData.length === 0) {
            Utils.showToast('Please upload data first', 'warning');
            return;
        }
        
        const config = {
            library: document.querySelector('input[name="chartLibrary"]:checked').value,
            chartType: document.querySelector('input[name="chartType"]:checked').value,
            xColumn: document.getElementById('xAxisColumn').value,
            yColumns: Array.from(document.getElementById('yAxisColumn').selectedOptions).map(o => o.value),
            groupBy: document.getElementById('groupByColumn').value,
            colorBy: document.getElementById('colorByColumn').value,
            aggFunc: document.getElementById('aggFunction').value,
            sortBy: document.getElementById('sortBy').value,
            title: document.getElementById('chartTitle').value,
            colorScheme: document.getElementById('colorScheme').value,
            showLegend: document.getElementById('showLegend').checked,
            showGrid: document.getElementById('showGrid').checked,
            showDataLabels: document.getElementById('showDataLabels').checked,
            enableAnimation: document.getElementById('enableAnimation').checked,
            smoothLines: document.getElementById('smoothLines').checked,
            stackedMode: document.getElementById('stackedMode').checked,
            dataLimit: parseInt(document.getElementById('dataLimit').value),
            chartHeight: parseInt(document.getElementById('chartHeight').value),
            filters: this.filters
        };
        
        if (!config.xColumn || config.yColumns.length === 0) {
            Utils.showToast('Please select X and Y columns', 'warning');
            return;
        }
        
        Utils.showLoading('Generating chart...');
        
        setTimeout(async () => {
            // Update chart container height
            document.getElementById('chartContainer').style.height = config.chartHeight + 'px';
            
            const success = await chartBuilder.buildChart(config);
            
            if (success) {
                document.getElementById('chartCard').style.display = 'block';
                document.getElementById('displayedChartTitle').textContent = config.title || 'Generated Chart';
                document.getElementById('saveChartBtn').style.display = 'inline-flex';
                Utils.showToast('Chart generated successfully!', 'success');
            }
            
            Utils.hideLoading();
        }, 100);
    }
    
    // Save chart
    saveChart() {
        const config = this.getCurrentChartConfig();
        chartBuilder.saveChart(config);
        
        // Update saved charts gallery
        this.updateSavedChartsGallery();
    }
    
    // Get current chart configuration
    getCurrentChartConfig() {
        return {
            library: document.querySelector('input[name="chartLibrary"]:checked').value,
            chartType: document.querySelector('input[name="chartType"]:checked').value,
            xColumn: document.getElementById('xAxisColumn').value,
            yColumns: Array.from(document.getElementById('yAxisColumn').selectedOptions).map(o => o.value),
            title: document.getElementById('chartTitle').value
        };
    }
    
    // Download chart as image
    downloadChart() {
        const container = document.getElementById('chartContainer');
        const canvas = container.querySelector('canvas');
        
        if (canvas) {
            Utils.exportChartAsImage(canvas, 'chart.png');
        } else {
            Utils.exportChartAsImage(container, 'chart.png');
        }
    }
    
    // Toggle fullscreen
    toggleFullscreen() {
        const card = document.getElementById('chartCard');
        if (!document.fullscreenElement) {
            card.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }
    
    // Add filter
    addFilter() {
        const filtersList = document.getElementById('filtersList');
        const filterId = `filter_${Date.now()}`;
        
        const filterHtml = `
            <div class="filter-item" id="${filterId}" style="padding: 1rem; background: var(--bg-tertiary); border-radius: 8px; margin-top: 1rem;">
                <div class="form-row">
                    <div class="form-group">
                        <label>Column</label>
                        <select class="form-control filter-column">
                            ${dataProcessor.columns.map(col => `<option value="${col}">${col}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Operator</label>
                        <select class="form-control filter-operator">
                            <option value="equals">Equals</option>
                            <option value="not_equals">Not Equals</option>
                            <option value="greater">Greater Than</option>
                            <option value="less">Less Than</option>
                            <option value="contains">Contains</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Value</label>
                        <input type="text" class="form-control filter-value">
                    </div>
                    <div class="form-group" style="display: flex; align-items: flex-end;">
                        <button class="btn-secondary" onclick="app.removeFilter('${filterId}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        filtersList.insertAdjacentHTML('beforeend', filterHtml);
    }
    
    // Remove filter
    removeFilter(filterId) {
        document.getElementById(filterId).remove();
    }
    
    // Collect filters
    collectFilters() {
        const filterItems = document.querySelectorAll('.filter-item');
        this.filters = [];
        
        filterItems.forEach(item => {
            this.filters.push({
                column: item.querySelector('.filter-column').value,
                operator: item.querySelector('.filter-operator').value,
                value: item.querySelector('.filter-value').value
            });
        });
    }
    
    // Setup pivot builder
    setupPivotBuilder() {
        const generateBtn = document.getElementById('generatePivotBtn');
        const exportBtn = document.getElementById('exportPivotBtn');
        
        generateBtn.addEventListener('click', () => this.generatePivot());
        exportBtn.addEventListener('click', () => pivotTableBuilder.exportPivot());
    }
    
    // Generate pivot table
    generatePivot() {
        if (!dataProcessor.processedData || dataProcessor.processedData.length === 0) {
            Utils.showToast('Please upload data first', 'warning');
            return;
        }
        
        const config = {
            rows: Array.from(document.getElementById('pivotRows').selectedOptions).map(o => o.value),
            columns: Array.from(document.getElementById('pivotCols').selectedOptions).map(o => o.value),
            values: Array.from(document.getElementById('pivotValues').selectedOptions).map(o => o.value),
            aggregation: document.getElementById('pivotAgg').value
        };
        
        Utils.showLoading('Generating pivot table...');
        
        setTimeout(() => {
            const success = pivotTableBuilder.generatePivot(config);
            
            if (success) {
                document.getElementById('pivotResultCard').style.display = 'block';
                Utils.showToast('Pivot table generated!', 'success');
            }
            
            Utils.hideLoading();
        }, 100);
    }
    
    // Setup insights page
    setupInsightsPage() {
        const analyzeBtn = document.getElementById('analyzeDataBtn');
        analyzeBtn.addEventListener('click', () => this.analyzeData());
    }
    
    // Analyze data
    analyzeData() {
        if (!dataProcessor.processedData || dataProcessor.processedData.length === 0) {
            Utils.showToast('Please upload data first', 'warning');
            return;
        }
        
        Utils.showLoading('Analyzing data...');
        
        setTimeout(() => {
            const insights = insightsEngine.generateInsights();
            insightsEngine.renderInsights(insights);
            
            // Show correlation matrix
            document.getElementById('correlationCard').style.display = 'block';
            document.getElementById('statisticsCard').style.display = 'block';
            
            insightsEngine.renderCorrelationMatrix();
            
            Utils.hideLoading();
            Utils.showToast('Analysis complete!', 'success');
        }, 500);
    }
    
    // Setup auto report
    setupAutoReport() {
        const generateBtn = document.getElementById('generateReportBtn');
        generateBtn.addEventListener('click', () => this.generateAutoReport());
    }
    
    // Generate auto report
    generateAutoReport() {
        if (!dataProcessor.processedData || dataProcessor.processedData.length === 0) {
            Utils.showToast('Please upload data first', 'warning');
            return;
        }
        
        Utils.showLoading('Generating report...');
        
        setTimeout(() => {
            const insights = insightsEngine.generateInsights();
            const reportContent = document.getElementById('reportContent');
            
            let html = '<div class="report-content">';
            html += '<h2>Automated Data Report</h2>';
            html += `<p class="text-muted">Generated on ${new Date().toLocaleString()}</p>`;
            
            insights.forEach(insight => {
                html += insightsEngine.renderInsightCard(insight);
            });
            
            html += '</div>';
            
            reportContent.innerHTML = html;
            reportContent.style.display = 'block';
            
            Utils.hideLoading();
            Utils.showToast('Report generated!', 'success');
        }, 500);
    }
    
    // Setup preview page
    setupPreviewPage() {
        const exportBtn = document.getElementById('exportCSV');
        exportBtn.addEventListener('click', () => dataProcessor.exportData('csv'));
    }
    
    // Update preview page
    updatePreviewPage() {
        if (!dataProcessor.processedData) return;
        
        const dataInfo = document.getElementById('dataInfo');
        dataInfo.innerHTML = `
            <p><strong>Total Rows:</strong> ${Utils.formatNumber(dataProcessor.processedData.length)}</p>
            <p><strong>Total Columns:</strong> ${dataProcessor.columns.length}</p>
        `;
        
        // Render table
        this.renderDataTable(1);
        
        // Render column stats
        this.renderColumnStats();
        
        // Update visualization column selects
        this.updateColumnSelects();
    }
    
    // Render data table
    renderDataTable(page = 1) {
        const { data, total, pages, currentPage } = dataProcessor.getPaginatedData(page, 50);
        
        const thead = document.getElementById('previewTableHead');
        const tbody = document.getElementById('previewTableBody');
        
        // Header
        let headerHtml = '<tr>';
        dataProcessor.columns.forEach(col => {
            headerHtml += `<th>${col}</th>`;
        });
        headerHtml += '</tr>';
        thead.innerHTML = headerHtml;
        
        // Body
        let bodyHtml = '';
        data.forEach(row => {
            bodyHtml += '<tr>';
            dataProcessor.columns.forEach(col => {
                bodyHtml += `<td>${row[col] !== null && row[col] !== undefined ? row[col] : ''}</td>`;
            });
            bodyHtml += '</tr>';
        });
        tbody.innerHTML = bodyHtml;
        
        // Pagination
        this.renderPagination(currentPage, pages);
    }
    
    // Render pagination
    renderPagination(current, total) {
        const container = document.getElementById('previewPagination');
        let html = '';
        
        if (current > 1) {
            html += `<button class="btn-secondary" onclick="app.renderDataTable(${current - 1})">Previous</button>`;
        }
        
        html += `<span>Page ${current} of ${total}</span>`;
        
        if (current < total) {
            html += `<button class="btn-secondary" onclick="app.renderDataTable(${current + 1})">Next</button>`;
        }
        
        container.innerHTML = html;
    }
    
    // Render column statistics
    renderColumnStats() {
        const container = document.getElementById('columnStats');
        const stats = dataProcessor.getSummaryStatistics();
        
        let html = '';
        Object.entries(stats).forEach(([col, stat]) => {
            html += `
                <div class="stat-card">
                    <div class="stat-label">${col}</div>
                    <div class="stat-value">${stat.mean.toFixed(2)}</div>
                    <p class="text-muted">Mean (σ=${stat.stdDev.toFixed(2)})</p>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }
    
    // Update column selects for visualization
    updateColumnSelects() {
        const xSelect = document.getElementById('xAxisColumn');
        const ySelect = document.getElementById('yAxisColumn');
        const groupSelect = document.getElementById('groupByColumn');
        const colorSelect = document.getElementById('colorByColumn');
        
        // Update pivot selects
        const pivotRows = document.getElementById('pivotRows');
        const pivotCols = document.getElementById('pivotCols');
        const pivotValues = document.getElementById('pivotValues');
        
        const allOptions = dataProcessor.columns.map(col => 
            `<option value="${col}">${col}</option>`
        ).join('');
        
        const numericOptions = dataProcessor.getNumericColumns().map(col => 
            `<option value="${col}">${col}</option>`
        ).join('');
        
        xSelect.innerHTML = allOptions;
        ySelect.innerHTML = numericOptions;
        groupSelect.innerHTML = '<option value="">None</option>' + allOptions;
        colorSelect.innerHTML = '<option value="">None</option>' + allOptions;
        
        pivotRows.innerHTML = allOptions;
        pivotCols.innerHTML = allOptions;
        pivotValues.innerHTML = numericOptions;
    }
    
    // Navigation
    setupNavigation() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.getAttribute('data-page');
                this.navigateToPage(page + 'Page');
            });
        });
    }
    
    // Navigate to page
    navigateToPage(pageId) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        
        // Show selected page
        document.getElementById(pageId).classList.add('active');
        
        // Update nav
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-page') + 'Page' === pageId) {
                item.classList.add('active');
            }
        });
        
        // Update title
        const titles = {
            uploadPage: 'Upload Data',
            previewPage: 'Data Preview',
            visualizationsPage: 'Visualizations',
            pivotPage: 'Pivot Tables',
            autoReportPage: 'Auto Report',
            insightsPage: 'Insights'
        };
        
        document.getElementById('pageTitle').textContent = titles[pageId] || 'Dashboard';
        
        this.currentPage = pageId;
    }
    
    // Theme toggle
    setupThemeToggle() {
        const toggle = document.getElementById('themeToggle');
        toggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const icon = toggle.querySelector('i');
            icon.classList.toggle('fa-moon');
            icon.classList.toggle('fa-sun');
            
            localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
        });
        
        // Load theme preference
        if (localStorage.getItem('darkMode') === 'true') {
            document.body.classList.add('dark-mode');
            toggle.querySelector('i').classList.replace('fa-moon', 'fa-sun');
        }
    }
    
    // Mobile menu
    setupMobileMenu() {
        const toggle = document.getElementById('mobileMenuToggle');
        const sidebar = document.getElementById('sidebar');
        
        toggle.addEventListener('click', () => {
            sidebar.classList.toggle('mobile-open');
        });
    }
    
    // Clear all data
    clearAllData() {
        if (confirm('Are you sure you want to clear all data?')) {
            dataProcessor.clearData();
            this.selectedFiles = [];
            document.getElementById('fileList').innerHTML = '';
            document.getElementById('uploadOptions').style.display = 'none';
            document.getElementById('uploadResults').style.display = 'none';
            
            Utils.showToast('All data cleared', 'success');
            this.navigateToPage('uploadPage');
        }
    }
    
    // Save state to localStorage
    saveState() {
        try {
            localStorage.setItem('dashboardState', JSON.stringify({
                hasData: dataProcessor.processedData !== null,
                timestamp: Date.now()
            }));
        } catch (error) {
            console.error('Failed to save state:', error);
        }
    }
    
    // Load state from localStorage
    loadState() {
        try {
            const state = localStorage.getItem('dashboardState');
            if (state) {
                const data = JSON.parse(state);
                // Could restore data from localStorage if implemented
            }
        } catch (error) {
            console.error('Failed to load state:', error);
        }
    }
}

// Initialize application
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new DashboardApp();
});