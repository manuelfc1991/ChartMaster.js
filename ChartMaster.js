/**
 * ChartMaster.js - Optimized Complete Charting Library
 * Enhanced with Funnel and Gauge charts
 * @version 3.0.0
 */

class ChartMaster {
    constructor(canvasId, config) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) throw new Error(`Canvas "${canvasId}" not found`);

        this.ctx = this.canvas.getContext('2d', {
            alpha: false
        });
        this.width = this.canvas.width;
        this.height = this.canvas.height;

        this.type = config.type || 'line';
        this.data = config.data || {};
        this.options = this.mergeOptions(config.options || {});

        // State
        this.animationProgress = 0;
        this.isAnimating = false;
        this.hoveredIndex = -1;
        this.tooltipData = null;
        this.chartArea = null;
        this.scales = {
            x: null,
            y: null
        };
        this.detailedView = false;

        // Layout measurements
        this.titleHeight = 0;
        this.legendHeight = 0;
        this.axisHeight = 0;
        this.axisWidth = 0;

        // Performance
        this.cache = new Map();
        this.frameId = null;
        this.boundHandlers = {};

        // Touch
        this.touchStartTime = 0;
        this.touchStartX = 0;
        this.touchStartY = 0;

        // Background color
        this.backgroundColor = config.backgroundColor || '#ffffff';

        this.setupStyles();
        this.setupEventListeners();
        this.render();
    }

    setupStyles() {
        if (document.getElementById('chartmaster-styles')) return;

        const styles = `
      .chartmaster-tooltip {
        position: fixed;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 10px 14px;
        border-radius: 8px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
        font-size: 13px;
        pointer-events: none;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        backdrop-filter: blur(8px);
        border: 1px solid rgba(255,255,255,0.15);
        white-space: nowrap;
        max-width: 250px;
        opacity: 0;
        transition: opacity 0.15s ease;
      }
      
      .chartmaster-tooltip.visible {
        opacity: 1;
      }
      
      .chartmaster-tooltip::after {
        content: '';
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        border: 6px solid transparent;
        border-top-color: rgba(0, 0, 0, 0.9);
      }
      
      .chartmaster-tooltip strong {
        display: block;
        margin-bottom: 4px;
        font-size: 14px;
      }
      
      .chartmaster-detailed-view {
        position: fixed;
        background: white;
        border: 1px solid #ddd;
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        z-index: 10001;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
        max-width: 320px;
        min-width: 280px;
        animation: chartmaster-slideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      }
      
      .chartmaster-detailed-view h4 {
        margin: 0 0 12px 0;
        color: #1a1a1a;
        font-size: 16px;
        font-weight: 600;
        border-bottom: 2px solid #f0f0f0;
        padding-bottom: 8px;
      }
      
      .chartmaster-detailed-view p {
        margin: 6px 0;
        color: #666;
        font-size: 13px;
      }
      
      .chartmaster-detailed-view .data-point {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin: 10px 0;
        padding: 8px 0;
        border-bottom: 1px solid #f5f5f5;
      }
      
      .chartmaster-detailed-view .data-point:last-child {
        border-bottom: none;
      }
      
      .chartmaster-detailed-view .data-point span:first-child {
        color: #666;
        font-size: 12px;
      }
      
      .chartmaster-detailed-view .data-point span:last-child {
        font-weight: 600;
        color: #333;
      }
      
      .chartmaster-detailed-view .color-indicator {
        width: 14px;
        height: 14px;
        border-radius: 3px;
        display: inline-block;
        margin-right: 8px;
        vertical-align: middle;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
      }
      
      .chartmaster-detailed-view .section-divider {
        margin: 16px 0;
        padding-top: 16px;
        border-top: 2px solid #e8e8e8;
      }
      
      @keyframes chartmaster-slideIn {
        from { 
          opacity: 0; 
          transform: scale(0.95) translateY(-10px); 
        }
        to { 
          opacity: 1; 
          transform: scale(1) translateY(0); 
        }
      }
    `;

        const styleSheet = document.createElement('style');
        styleSheet.id = 'chartmaster-styles';
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }

    mergeOptions(userOptions) {
        const defaults = {
            responsive: true,
            maintainAspectRatio: true,
            backgroundColor: '#ffffff',
            detailedView: {
                enabled: true,
                trigger: 'doubleClick',
                showStats: true,
                showRawData: false
            },
            animation: {
                duration: 800,
                easing: 'easeOutQuart'
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top', // 'top', 'bottom', 'left', 'right'
                    align: 'center', // 'start', 'center', 'end'
                    labels: {
                        color: '#666',
                        font: {
                            size: 12,
                            family: 'Arial'
                        },
                        padding: 12,
                        boxWidth: 12,
                        usePointStyle: false
                    },
                    padding: 15
                },
                title: {
                    display: false,
                    text: '',
                    color: '#333',
                    font: {
                        size: 16,
                        weight: 'bold',
                        family: 'Arial'
                    },
                    padding: {
                        top: 10,
                        bottom: 15
                    },
                    align: 'center'
                },
                tooltip: {
                    enabled: true,
                    mode: 'nearest'
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: false,
                        text: '',
                        color: '#666',
                        font: {
                            size: 12,
                            family: 'Arial'
                        }
                    },
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.08)'
                    },
                    ticks: {
                        padding: 8,
                        maxRotation: 0
                    }
                },
                y: {
                    display: true,
                    beginAtZero: true,
                    title: {
                        display: false,
                        text: '',
                        color: '#666',
                        font: {
                            size: 12,
                            family: 'Arial'
                        }
                    },
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.08)'
                    },
                    ticks: {
                        padding: 8
                    }
                }
            },
            layout: {
                padding: {
                    top: 20,
                    right: 20,
                    bottom: 20,
                    left: 20
                },
                autoPadding: true
            },
            elements: {
                line: {
                    borderWidth: 2,
                    tension: 0.4,
                    fill: false
                },
                point: {
                    radius: 3,
                    hoverRadius: 5,
                    hitRadius: 10
                },
                bar: {
                    borderWidth: 0,
                    borderRadius: 4
                },
                arc: {
                    borderWidth: 2,
                    borderColor: '#fff',
                    hoverOffset: 10
                }
            },
            // Funnel specific options
            funnel: {
                width: 0.7,
                gap: 0.02,
                sort: 'desc'
            },
            // Gauge specific options
            gauge: {
                startAngle: -135,
                endAngle: 135,
                thickness: 0.2,
                showValue: true,
                valueFormat: (value) => value.toFixed(1),
                ranges: [
                    {
                        min: 0,
                        max: 33,
                        color: '#ef4444'
                    },
                    {
                        min: 33,
                        max: 66,
                        color: '#f59e0b'
                    },
                    {
                        min: 66,
                        max: 100,
                        color: '#10b981'
                    }
                ]
            },
            onClick: null,
            onHover: null,
            onDetailedView: null
        };

        return this.deepMerge(defaults, userOptions);
    }

    deepMerge(target, source) {
        const output = Object.assign({}, target);
        if (this.isObject(target) && this.isObject(source)) {
            Object.keys(source).forEach(key => {
                if (this.isObject(source[key])) {
                    if (!(key in target)) {
                        output[key] = source[key];
                    } else {
                        output[key] = this.deepMerge(target[key], source[key]);
                    }
                } else {
                    output[key] = source[key];
                }
            });
        }
        return output;
    }

    isObject(item) {
        return item && typeof item === 'object' && !Array.isArray(item);
    }

    setupEventListeners() {
        this.boundHandlers = {
            mousemove: this.throttle(this.handleMouseMove.bind(this), 16),
            mouseleave: this.handleMouseLeave.bind(this),
            click: this.handleClick.bind(this),
            dblclick: this.handleDoubleClick.bind(this),
            touchstart: this.handleTouchStart.bind(this),
            touchmove: this.throttle(this.handleTouchMove.bind(this), 16),
            touchend: this.handleTouchEnd.bind(this),
            resize: this.throttle(this.handleResize.bind(this), 250)
        };

        this.canvas.addEventListener('mousemove', this.boundHandlers.mousemove);
        this.canvas.addEventListener('mouseleave', this.boundHandlers.mouseleave);
        this.canvas.addEventListener('click', this.boundHandlers.click);
        this.canvas.addEventListener('dblclick', this.boundHandlers.dblclick);
        this.canvas.addEventListener('touchstart', this.boundHandlers.touchstart, {
            passive: false
        });
        this.canvas.addEventListener('touchmove', this.boundHandlers.touchmove, {
            passive: false
        });
        this.canvas.addEventListener('touchend', this.boundHandlers.touchend);
        window.addEventListener('resize', this.boundHandlers.resize);
    }

    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    handleMouseMove(e) {
        const pos = this.getCanvasPosition(e);
        this.updateHoverState(pos.x, pos.y, e);
    }

    handleTouchMove(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const pos = this.getCanvasPosition(touch);
        this.updateHoverState(pos.x, pos.y, touch);
    }

    handleMouseLeave() {
        this.hoveredIndex = -1;
        this.hideTooltip();
        this.redraw();
    }

    handleClick(e) {
        if (this.hoveredIndex !== -1 && this.options.onClick) {
            this.options.onClick(e, this.hoveredIndex, this.getDataAtPoint(this.hoveredIndex), this);
        }
    }

    handleDoubleClick(e) {
        if (this.options.detailedView.enabled && this.options.detailedView.trigger === 'doubleClick') {
            this.toggleDetailedView(e);
        }
    }

    handleTouchStart(e) {
        this.touchStartTime = Date.now();
        const touch = e.touches[0];
        const pos = this.getCanvasPosition(touch);
        this.touchStartX = pos.x;
        this.touchStartY = pos.y;
    }

    handleTouchEnd(e) {
        const touchDuration = Date.now() - this.touchStartTime;
        if (this.options.detailedView.enabled &&
            this.options.detailedView.trigger === 'longPress' &&
            touchDuration > 500) {
            const touch = e.changedTouches[0];
            this.toggleDetailedView(touch);
        }
    }

    handleResize() {
        if (this.options.responsive) {
            const container = this.canvas.parentElement;
            if (container) {
                const rect = container.getBoundingClientRect();
                this.canvas.width = rect.width;
                this.canvas.height = rect.height;
                this.width = this.canvas.width;
                this.height = this.canvas.height;
                this.redraw();
            }
        }
    }

    getCanvasPosition(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
            clientX: e.clientX,
            clientY: e.clientY
        };
    }

    updateHoverState(x, y, event) {
        const prevHovered = this.hoveredIndex;
        this.hoveredIndex = this.getElementAtPosition(x, y);

        if (this.hoveredIndex !== -1) {
            this.canvas.style.cursor = 'pointer';
            this.updateTooltip(event);
        } else {
            this.canvas.style.cursor = 'default';
            this.hideTooltip();
        }

        if (prevHovered !== this.hoveredIndex) {
            this.redraw();
            if (this.options.onHover) {
                this.options.onHover(null, this.hoveredIndex, this.getDataAtPoint(this.hoveredIndex), this);
            }
        }
    }

    getElementAtPosition(x, y) {
        const cacheKey = `element-${Math.floor(x)}-${Math.floor(y)}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        let elementIndex = -1;

        switch (this.type) {
            case 'line':
            case 'bar':
                elementIndex = this.getAxisChartElement(x, y);
                break;
            case 'pie':
            case 'doughnut':
                elementIndex = this.getCircularChartElement(x, y);
                break;
            case 'funnel':
                elementIndex = this.getFunnelElement(x, y);
                break;
            case 'gauge':
                elementIndex = this.getGaugeElement(x, y);
                break;
        }

        this.cache.set(cacheKey, elementIndex);
        return elementIndex;
    }

    getAxisChartElement(x, y) {
        if (!this.chartArea) return -1;
        if (x < this.chartArea.x || x > this.chartArea.x + this.chartArea.width ||
            y < this.chartArea.y || y > this.chartArea.y + this.chartArea.height) {
            return -1;
        }

        const dataset = this.data.datasets[0];
        const dataLength = dataset.data.length;

        if (this.type === 'bar') {
            const barWidth = this.chartArea.width / dataLength * 0.7;
            const gap = this.chartArea.width / dataLength * 0.15;

            for (let i = 0; i < dataLength; i++) {
                const barX = this.chartArea.x + (i / dataLength) * this.chartArea.width + gap;
                if (x >= barX && x <= barX + barWidth) {
                    return i;
                }
            }
        } else if (this.type === 'line') {
            const hitRadius = this.options.elements.point.hitRadius;

            for (let i = 0; i < dataLength; i++) {
                const pointX = this.chartArea.x + (i / Math.max(dataLength - 1, 1)) * this.chartArea.width;
                const pointY = this.getYPosition(dataset.data[i]);

                const distance = Math.sqrt(Math.pow(x - pointX, 2) + Math.pow(y - pointY, 2));
                if (distance <= hitRadius) {
                    return i;
                }
            }
        }

        return -1;
    }

    getCircularChartElement(x, y) {
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const dataset = this.data.datasets[0];
        const total = dataset.data.reduce((sum, val) => sum + val, 0);

        const maxSize = Math.min(this.width, this.height);
        const radius = (maxSize / 2) - 60;
        const innerRadius = this.type === 'doughnut' ? radius * 0.5 : 0;

        if (distance < innerRadius || distance > radius) return -1;

        const angle = Math.atan2(dy, dx) + Math.PI / 2;
        const normalizedAngle = angle < 0 ? angle + Math.PI * 2 : angle;

        let currentAngle = 0;
        for (let i = 0; i < dataset.data.length; i++) {
            const sliceAngle = (dataset.data[i] / total) * Math.PI * 2;
            if (normalizedAngle >= currentAngle && normalizedAngle <= currentAngle + sliceAngle) {
                return i;
            }
            currentAngle += sliceAngle;
        }

        return -1;
    }

    getFunnelElement(x, y) {
        if (!this.chartArea) return -1;

        const dataset = this.data.datasets[0];
        const data = dataset.data;
        const sortedData = this.getSortedFunnelData();

        const funnelWidth = this.chartArea.width * this.options.funnel.width;
        const segmentHeight = this.chartArea.height / data.length;
        const gap = segmentHeight * this.options.funnel.gap;

        for (let i = 0; i < sortedData.length; i++) {
            const segmentY = this.chartArea.y + i * segmentHeight;
            const topWidth = this.getFunnelSegmentWidth(i, sortedData);
            const bottomWidth = this.getFunnelSegmentWidth(i + 1, sortedData);
            const segmentX = this.chartArea.x + (this.chartArea.width - topWidth) / 2;

            if (y >= segmentY && y <= segmentY + segmentHeight - gap) {
                const relativeY = (y - segmentY) / (segmentHeight - gap);
                const widthAtY = topWidth + (bottomWidth - topWidth) * relativeY;
                const xAtY = this.chartArea.x + (this.chartArea.width - widthAtY) / 2;

                if (x >= xAtY && x <= xAtY + widthAtY) {
                    return sortedData[i].originalIndex;
                }
            }
        }

        return -1;
    }

    getGaugeElement(x, y) {
        const centerX = this.width / 2;
        const centerY = this.height * 0.65;
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const radius = Math.min(this.width, this.height) / 2 - 40;
        const thickness = radius * this.options.gauge.thickness;
        const innerRadius = radius - thickness;

        if (distance >= innerRadius && distance <= radius) {
            return 0;
        }

        return -1;
    }

    getYPosition(value) {
        const dataset = this.data.datasets[0];
        const data = dataset.data;
        const max = Math.max(...data);
        const min = this.options.scales.y.beginAtZero ? 0 : Math.min(...data);
        const range = max - min || 1;

        return this.chartArea.y + this.chartArea.height - ((value - min) / range) * this.chartArea.height;
    }

    updateTooltip(event) {
        const data = this.getDataAtPoint(this.hoveredIndex);
        if (!data) return;

        if (!this.tooltip) {
            this.tooltip = document.createElement('div');
            this.tooltip.className = 'chartmaster-tooltip';
            document.body.appendChild(this.tooltip);
        }

        this.tooltip.innerHTML = `
      <strong>${data.label}</strong>
      Value: ${data.value}
      ${data.percentage ? `<br>Percentage: ${data.percentage}%` : ''}
    `;

        this.tooltip.style.left = event.clientX + 'px';
        this.tooltip.style.top = (event.clientY - this.tooltip.offsetHeight - 15) + 'px';

        requestAnimationFrame(() => {
            if (this.tooltip) {
                this.tooltip.classList.add('visible');
            }
        });

        const rect = this.tooltip.getBoundingClientRect();
        if (rect.right > window.innerWidth - 10) {
            this.tooltip.style.left = (window.innerWidth - rect.width - 10) + 'px';
        }
        if (rect.top < 10) {
            this.tooltip.style.top = (event.clientY + 15) + 'px';
        }
    }

    hideTooltip() {
        if (this.tooltip) {
            this.tooltip.classList.remove('visible');
            setTimeout(() => {
                if (this.tooltip && !this.tooltip.classList.contains('visible')) {
                    this.tooltip.remove();
                    this.tooltip = null;
                }
            }, 150);
        }
    }

    toggleDetailedView(e) {
        if (this.detailedView) {
            this.hideDetailedView();
        } else if (this.hoveredIndex !== -1) {
            this.showDetailedView(e);
        }
    }

    showDetailedView(e) {
        this.hideDetailedView();

        const data = this.getDataAtPoint(this.hoveredIndex);
        if (!data) return;

        this.detailedView = document.createElement('div');
        this.detailedView.className = 'chartmaster-detailed-view';

        const stats = this.calculateStats();
        const dataset = this.data.datasets[0];

        this.detailedView.innerHTML = `
      <h4>Detailed Analysis</h4>
      <div class="data-point">
        <span>Label:</span>
        <span>${data.label}</span>
      </div>
      <div class="data-point">
        <span>Value:</span>
        <span>${data.value}</span>
      </div>
      ${data.percentage ? `
      <div class="data-point">
        <span>Percentage:</span>
        <span>${data.percentage}%</span>
      </div>
      ` : ''}
      <div class="data-point">
        <span>Color:</span>
        <span>
          <span class="color-indicator" style="background-color: ${data.color};"></span>
          ${data.color}
        </span>
      </div>
      ${this.options.detailedView.showStats ? `
      <div class="section-divider">
        <strong style="font-size: 13px; color: #333;">Statistics</strong>
        <div class="data-point">
          <span>Average:</span>
          <span>${stats.average.toFixed(2)}</span>
        </div>
        <div class="data-point">
          <span>Median:</span>
          <span>${stats.median.toFixed(2)}</span>
        </div>
        <div class="data-point">
          <span>Range:</span>
          <span>${stats.min} - ${stats.max}</span>
        </div>
        <div class="data-point">
          <span>Total:</span>
          <span>${stats.total.toFixed(2)}</span>
        </div>
        <div class="data-point">
          <span>Count:</span>
          <span>${dataset.data.length}</span>
        </div>
      </div>
      ` : ''}
      ${this.options.detailedView.showRawData ? `
      <div class="section-divider">
        <strong style="font-size: 13px; color: #333;">All Data Points</strong>
        ${this.data.labels.map((label, idx) => `
          <div class="data-point">
            <span>${label}:</span>
            <span>${dataset.data[idx]}</span>
          </div>
        `).join('')}
      </div>
      ` : ''}
    `;

        document.body.appendChild(this.detailedView);

        let left = e.clientX;
        let top = e.clientY + 20;

        requestAnimationFrame(() => {
            const rect = this.detailedView.getBoundingClientRect();

            if (left + rect.width > window.innerWidth - 20) {
                left = window.innerWidth - rect.width - 20;
            }
            if (top + rect.height > window.innerHeight - 20) {
                top = e.clientY - rect.height - 20;
            }

            this.detailedView.style.left = left + 'px';
            this.detailedView.style.top = top + 'px';
        });

        this.detailedViewClickListener = (event) => {
            if (!this.detailedView.contains(event.target) && event.target !== this.canvas) {
                this.hideDetailedView();
            }
        };

        setTimeout(() => {
            document.addEventListener('mousedown', this.detailedViewClickListener);
        }, 100);

        if (this.options.onDetailedView) {
            this.options.onDetailedView(e, this.hoveredIndex, data, this);
        }
    }

    hideDetailedView() {
        if (this.detailedView && this.detailedView.parentNode) {
            this.detailedView.remove();
        }
        this.detailedView = null;

        if (this.detailedViewClickListener) {
            document.removeEventListener('mousedown', this.detailedViewClickListener);
            this.detailedViewClickListener = null;
        }
    }

    getDataAtPoint(index) {
        if (index === -1 || !this.data.datasets[0]) return null;

        const dataset = this.data.datasets[0];

        if (this.type === 'gauge') {
            const value = dataset.data[0];
            return {
                label: this.data.labels[0] || 'Value',
                value: value,
                percentage: null,
                color: this.getGaugeColor(value)
            };
        }

        if (this.type === 'funnel') {
            const sortedData = this.getSortedFunnelData();
            const item = sortedData.find(d => d.originalIndex === index);
            if (item) {
                const total = dataset.data.reduce((sum, val) => sum + val, 0);
                return {
                    label: item.label,
                    value: item.value,
                    percentage: ((item.value / total) * 100).toFixed(1),
                    color: item.color
                };
            }
        }

        const label = this.data.labels[index];
        const value = dataset.data[index];

        let percentage = null;
        if (this.type === 'pie' || this.type === 'doughnut' || this.type === 'funnel') {
            const total = dataset.data.reduce((sum, val) => sum + val, 0);
            percentage = ((value / total) * 100).toFixed(1);
        }

        return {
            label,
            value,
            percentage,
            color: Array.isArray(dataset.backgroundColor) ?
                dataset.backgroundColor[index % dataset.backgroundColor.length] :
                dataset.backgroundColor || '#3b82f6'
        };
    }

    calculateStats() {
        const data = this.data.datasets[0].data;
        const sorted = [...data].sort((a, b) => a - b);
        const total = data.reduce((sum, val) => sum + val, 0);
        const mid = Math.floor(data.length / 2);
        const median = data.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

        return {
            average: total / data.length,
            median: median,
            min: sorted[0],
            max: sorted[data.length - 1],
            total: total
        };
    }

    render() {
        this.cache.clear();
        this.animationProgress = 0;
        this.isAnimating = true;

        if (this.frameId) {
            cancelAnimationFrame(this.frameId);
        }

        this.animate();
    }

    animate() {
        const startTime = Date.now();
        const duration = this.options.animation.duration;

        const step = () => {
            const elapsed = Date.now() - startTime;
            this.animationProgress = Math.min(elapsed / duration, 1);

            const easedProgress = this.easing(
                this.animationProgress,
                this.options.animation.easing
            );

            this.draw(easedProgress);

            if (this.animationProgress < 1) {
                this.frameId = requestAnimationFrame(step);
            } else {
                this.isAnimating = false;
                this.frameId = null;
            }
        };

        this.frameId = requestAnimationFrame(step);
    }

    redraw() {
        this.cache.clear();
        this.draw(1);
    }

    draw(progress) {
        this.clear();
        this.calculateLayout();
        this.calculateChartArea();

        if (this.options.plugins.title.display) {
            this.drawTitle();
        }

        if (this.options.plugins.legend.display && this.type !== 'gauge') {
            this.drawLegend();
        }

        switch (this.type) {
            case 'line':
                this.drawLineChart(progress);
                break;
            case 'bar':
                this.drawBarChart(progress);
                break;
            case 'pie':
                this.drawPieChart(progress);
                break;
            case 'doughnut':
                this.drawDoughnutChart(progress);
                break;
            case 'funnel':
                this.drawFunnelChart(progress);
                break;
            case 'gauge':
                this.drawGaugeChart(progress);
                break;
        }

        if (this.type === 'line' || this.type === 'bar') {
            this.drawAxes();
            this.drawGrid();
        }
    }

    calculateLayout() {
        // Calculate title height
        this.titleHeight = 0;
        if (this.options.plugins.title.display) {
            const title = this.options.plugins.title;
            this.ctx.save();
            this.ctx.font = `${title.font.weight || 'bold'} ${title.font.size}px ${title.font.family}`;
            const metrics = this.ctx.measureText(title.text);
            this.titleHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent + 
                              title.padding.top + title.padding.bottom + 10;
            this.ctx.restore();
        }

        // Calculate legend height/width
        this.legendHeight = 0;
        this.legendWidth = 0;
        if (this.options.plugins.legend.display && this.type !== 'gauge') {
            const legend = this.options.plugins.legend;
            const dataset = this.data.datasets[0];
            const labels = this.type === 'funnel' ? 
                this.getSortedFunnelData().map(d => d.label) : 
                this.data.labels;

            this.ctx.save();
            this.ctx.font = `${legend.labels.font.size}px ${legend.labels.font.family}`;
            
            const itemWidths = labels.map(label => {
                const textWidth = this.ctx.measureText(label).width;
                return textWidth + legend.labels.boxWidth + legend.labels.padding * 2;
            });

            if (legend.position === 'top' || legend.position === 'bottom') {
                this.legendHeight = Math.max(...itemWidths.map(() => legend.labels.boxWidth + legend.labels.padding)) + 
                                  legend.padding * 2;
                this.legendWidth = this.width;
            } else {
                this.legendWidth = Math.max(...itemWidths) + legend.padding * 2;
                this.legendHeight = this.height;
            }
            
            this.ctx.restore();
        }

        // Calculate axis dimensions
        this.axisHeight = 0;
        this.axisWidth = 0;
        if ((this.type === 'line' || this.type === 'bar') && 
            (this.options.scales.x.display || this.options.scales.y.display)) {
            
            this.ctx.save();
            this.ctx.font = '11px Arial';
            
            if (this.options.scales.y.display) {
                const yTicks = this.options.scales.y.ticks || {};
                const longestLabel = this.getLongestYAxisLabel();
                const labelWidth = this.ctx.measureText(longestLabel).width;
                this.axisWidth = Math.max(this.axisWidth, labelWidth + (yTicks.padding || 8) + 15);
            }
            
            if (this.options.scales.x.display) {
                const xTicks = this.options.scales.x.ticks || {};
                const xLabels = this.data.labels || [];
                if (xLabels.length > 0) {
                    const maxLabelHeight = this.ctx.measureText('M').actualBoundingBoxAscent + 
                                         this.ctx.measureText('M').actualBoundingBoxDescent;
                    this.axisHeight = maxLabelHeight + (xTicks.padding || 8) + 15;
                }
            }
            
            this.ctx.restore();
        }
    }

    getLongestYAxisLabel() {
        const dataset = this.data.datasets[0];
        const data = dataset.data;
        const max = Math.max(...data, 0);
        const min = this.options.scales.y.beginAtZero ? 0 : Math.min(...data, 0);
        
        const labels = [];
        for (let i = 0; i <= 5; i++) {
            const value = min + (i / 5) * (max - min);
            labels.push(value.toFixed(1));
        }
        
        return labels.reduce((a, b) => a.length > b.length ? a : b);
    }

    calculateChartArea() {
        const layout = this.options.layout.padding;
        const legend = this.options.plugins.legend;
        
        let top = layout.top + this.titleHeight;
        let bottom = layout.bottom + this.axisHeight;
        let left = layout.left + this.axisWidth;
        let right = layout.right;

        // Adjust for legend position
        if (legend.display && this.type !== 'gauge') {
            switch (legend.position) {
                case 'top':
                    top += this.legendHeight;
                    break;
                case 'bottom':
                    bottom += this.legendHeight;
                    break;
                case 'left':
                    left += this.legendWidth;
                    break;
                case 'right':
                    right += this.legendWidth;
                    break;
            }
        }

        this.chartArea = {
            x: left,
            y: top,
            width: Math.max(0, this.width - left - right),
            height: Math.max(0, this.height - top - bottom)
        };
    }

    drawLineChart(progress) {
        const dataset = this.data.datasets[0];
        const data = dataset.data;
        const max = Math.max(...data);
        const min = this.options.scales.y.beginAtZero ? 0 : Math.min(...data);
        const range = max - min || 1;
        this.drawAxisLabels(min, max);

        const points = [];
        const visibleCount = Math.ceil(data.length * progress);

        this.ctx.save();
        this.ctx.strokeStyle = dataset.borderColor || '#3b82f6';
        this.ctx.lineWidth = this.options.elements.line.borderWidth;
        this.ctx.lineJoin = 'round';
        this.ctx.lineCap = 'round';
        this.ctx.beginPath();

        for (let i = 0; i < visibleCount; i++) {
            const x = this.chartArea.x + (i / Math.max(data.length - 1, 1)) * this.chartArea.width;
            const value = data[i];
            const y = this.chartArea.y + this.chartArea.height - ((value - min) / range) * this.chartArea.height;

            points.push({
                x,
                y,
                index: i
            });

            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                if (this.options.elements.line.tension > 0) {
                    const prevPoint = points[i - 1];
                    const cpx = (prevPoint.x + x) / 2;
                    this.ctx.quadraticCurveTo(cpx, prevPoint.y, x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
        }

        this.ctx.stroke();

        if (this.options.elements.line.fill && points.length > 0) {
            this.ctx.globalAlpha = 0.15;
            this.ctx.fillStyle = dataset.backgroundColor || dataset.borderColor || '#3b82f6';
            this.ctx.lineTo(points[points.length - 1].x, this.chartArea.y + this.chartArea.height);
            this.ctx.lineTo(points[0].x, this.chartArea.y + this.chartArea.height);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.globalAlpha = 1;
        }

        points.forEach(point => {
            const isHovered = this.hoveredIndex === point.index;
            const radius = isHovered ?
                this.options.elements.point.hoverRadius :
                this.options.elements.point.radius;

            this.ctx.fillStyle = '#fff';
            this.ctx.strokeStyle = dataset.borderColor || '#3b82f6';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
        });

        this.ctx.restore();
    }

    drawBarChart(progress) {
        const dataset = this.data.datasets[0];
        const data = dataset.data;
        const max = Math.max(...data, 0);
        const min = this.options.scales.y.beginAtZero ? 0 : Math.min(...data, 0);
        const range = max - min || 1;
        this.drawAxisLabels(min, max);

        const barWidth = this.chartArea.width / data.length * 0.7;
        const gap = this.chartArea.width / data.length * 0.15;

        this.ctx.save();

        data.forEach((value, i) => {
            const x = this.chartArea.x + (i / data.length) * this.chartArea.width + gap;
            const barHeight = Math.abs((value - min) / range) * this.chartArea.height * progress;
            const y = value >= 0 ?
                this.chartArea.y + this.chartArea.height - barHeight :
                this.chartArea.y + this.chartArea.height;

            const isHovered = this.hoveredIndex === i;
            const color = Array.isArray(dataset.backgroundColor) ?
                dataset.backgroundColor[i % dataset.backgroundColor.length] :
                dataset.backgroundColor || '#3b82f6';

            this.ctx.fillStyle = isHovered ? this.lightenColor(color, 15) : color;

            const radius = this.options.elements.bar.borderRadius;
            this.roundRect(this.ctx, x, y, barWidth, barHeight, radius);
            this.ctx.fill();

            if (this.options.elements.bar.borderWidth > 0) {
                this.ctx.strokeStyle = dataset.borderColor || '#fff';
                this.ctx.lineWidth = this.options.elements.bar.borderWidth;
                this.ctx.stroke();
            }
        });

        this.ctx.restore();
    }

    drawPieChart(progress) {
        this.drawCircularChart(progress, 0);
    }

    drawDoughnutChart(progress) {
        const radius = Math.min(this.width, this.height) / 2 - 60;
        const innerRadius = radius * 0.5;
        this.drawCircularChart(progress, innerRadius);
    }

    drawCircularChart(progress, innerRadius) {
        const dataset = this.data.datasets[0];
        const data = dataset.data;
        const total = data.reduce((sum, val) => sum + val, 0);
        const centerX = this.width / 2;
        const centerY = this.chartArea.y + this.chartArea.height / 2;

        const maxSize = Math.min(this.chartArea.width, this.chartArea.height);
        const radius = (maxSize / 2) - 20;

        let currentAngle = -Math.PI / 2;

        this.ctx.save();

        data.forEach((value, i) => {
            const sliceAngle = (value / total) * Math.PI * 2 * progress;
            const isHovered = this.hoveredIndex === i;

            const offset = isHovered ? this.options.elements.arc.hoverOffset : 0;
            const midAngle = currentAngle + sliceAngle / 2;
            const offsetX = Math.cos(midAngle) * offset;
            const offsetY = Math.sin(midAngle) * offset;

            const color = Array.isArray(dataset.backgroundColor) ?
                dataset.backgroundColor[i % dataset.backgroundColor.length] :
                dataset.backgroundColor || '#3b82f6';

            this.ctx.fillStyle = isHovered ? this.lightenColor(color, 10) : color;
            this.ctx.beginPath();

            if (innerRadius > 0) {
                this.ctx.arc(centerX + offsetX, centerY + offsetY, radius, currentAngle, currentAngle + sliceAngle);
                this.ctx.arc(centerX + offsetX, centerY + offsetY, innerRadius, currentAngle + sliceAngle, currentAngle, true);
            } else {
                this.ctx.moveTo(centerX + offsetX, centerY + offsetY);
                this.ctx.arc(centerX + offsetX, centerY + offsetY, radius, currentAngle, currentAngle + sliceAngle);
            }

            this.ctx.closePath();
            this.ctx.fill();

            if (this.options.elements.arc.borderWidth > 0) {
                this.ctx.strokeStyle = this.options.elements.arc.borderColor;
                this.ctx.lineWidth = this.options.elements.arc.borderWidth;
                this.ctx.stroke();
            }

            currentAngle += sliceAngle;
        });

        this.ctx.restore();
    }

    getSortedFunnelData() {
        const dataset = this.data.datasets[0];
        const data = dataset.data.map((value, index) => ({
            value,
            label: this.data.labels[index],
            originalIndex: index,
            color: Array.isArray(dataset.backgroundColor) ?
                dataset.backgroundColor[index % dataset.backgroundColor.length] :
                dataset.backgroundColor || '#3b82f6'
        }));
        if (this.options.funnel.sort === 'desc') {
            return data.sort((a, b) => b.value - a.value);
        } else if (this.options.funnel.sort === 'asc') {
            return data.sort((a, b) => a.value - b.value);
        }
        return data;
    }

    getFunnelSegmentWidth(index, sortedData) {
        if (index >= sortedData.length) {
            return this.chartArea.width * this.options.funnel.width * 0.3;
        }
        if (index === 0) {
            return this.chartArea.width * this.options.funnel.width;
        }
        const maxValue = Math.max(...sortedData.map(d => d.value));
        const ratio = sortedData[index].value / maxValue;
        return this.chartArea.width * this.options.funnel.width * (0.3 + ratio * 0.7);
    }

    drawFunnelChart(progress) {
        const sortedData = this.getSortedFunnelData();
        const segmentHeight = this.chartArea.height / sortedData.length;
        const gap = segmentHeight * this.options.funnel.gap;
        this.ctx.save();

        sortedData.forEach((item, i) => {
            const visibleProgress = Math.max(0, Math.min(1, (progress - i / sortedData.length) * sortedData.length));

            if (visibleProgress <= 0) return;

            const topWidth = this.getFunnelSegmentWidth(i, sortedData) * visibleProgress;
            const bottomWidth = this.getFunnelSegmentWidth(i + 1, sortedData) * visibleProgress;
            const segmentY = this.chartArea.y + i * segmentHeight;
            const topX = this.chartArea.x + (this.chartArea.width - topWidth) / 2;
            const bottomX = this.chartArea.x + (this.chartArea.width - bottomWidth) / 2;

            const isHovered = this.hoveredIndex === item.originalIndex;
            this.ctx.fillStyle = isHovered ? this.lightenColor(item.color, 15) : item.color;

            this.ctx.beginPath();
            this.ctx.moveTo(topX, segmentY);
            this.ctx.lineTo(topX + topWidth, segmentY);
            this.ctx.lineTo(bottomX + bottomWidth, segmentY + segmentHeight - gap);
            this.ctx.lineTo(bottomX, segmentY + segmentHeight - gap);
            this.ctx.closePath();
            this.ctx.fill();

            if (this.options.elements.bar.borderWidth > 0) {
                this.ctx.strokeStyle = '#fff';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            }

            // Draw label
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 13px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            const labelY = segmentY + (segmentHeight - gap) / 2;
            this.ctx.fillText(item.label, this.chartArea.x + this.chartArea.width / 2, labelY - 8);

            this.ctx.font = '12px Arial';
            this.ctx.fillText(item.value.toFixed(0), this.chartArea.x + this.chartArea.width / 2, labelY + 8);
        });

        this.ctx.restore();
    }

    getGaugeColor(value) {
        const ranges = this.options.gauge.ranges;
        for (let range of ranges) {
            if (value >= range.min && value <= range.max) {
                return range.color;
            }
        }
        return ranges[ranges.length - 1].color;
    }

    drawGaugeChart(progress) {
        const value = this.data.datasets[0].data[0];
        const min = 0;
        const max = 100;
        const centerX = this.width / 2;
        const centerY = this.chartArea.y + this.chartArea.height * 0.65;
        const maxRadius = Math.min(this.chartArea.width, this.chartArea.height) / 2;
        const radius = maxRadius * 0.75;
        const thickness = radius * 0.25;
        const innerRadius = radius - thickness;
        const startAngle = (this.options.gauge.startAngle * Math.PI) / 180;
        const endAngle = (this.options.gauge.endAngle * Math.PI) / 180;
        const totalAngle = endAngle - startAngle;

        this.ctx.save();
        this.ctx.lineCap = 'round';

        // Draw colored range segments
        const ranges = this.options.gauge.ranges;
        const segmentGap = 0.015;

        ranges.forEach((range, index) => {
            const rangeStartAngle = startAngle + (range.min / max) * totalAngle + (index > 0 ? segmentGap : 0);
            const rangeEndAngle = startAngle + (range.max / max) * totalAngle - segmentGap;

            this.ctx.lineWidth = thickness;
            this.ctx.strokeStyle = range.color;
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, innerRadius + thickness / 2, rangeStartAngle, rangeEndAngle);
            this.ctx.stroke();
        });

        // Draw needle
        const needleAngle = startAngle + ((value / max) * totalAngle) * progress;
        const needleLength = innerRadius - 10;
        const needleWidth = 6;

        this.ctx.fillStyle = '#2c3e50';
        this.ctx.beginPath();
        this.ctx.moveTo(
            centerX + Math.cos(needleAngle - Math.PI / 2) * needleWidth / 2,
            centerY + Math.sin(needleAngle - Math.PI / 2) * needleWidth / 2
        );
        this.ctx.lineTo(
            centerX + Math.cos(needleAngle) * needleLength,
            centerY + Math.sin(needleAngle) * needleLength
        );
        this.ctx.lineTo(
            centerX + Math.cos(needleAngle + Math.PI / 2) * needleWidth / 2,
            centerY + Math.sin(needleAngle + Math.PI / 2) * needleWidth / 2
        );
        this.ctx.closePath();
        this.ctx.fill();

        // Draw center hub
        const hubRadius = 12;
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, hubRadius, 0, Math.PI * 2);
        this.ctx.fill();

        // Draw value text
        if (this.options.gauge.showValue) {
            const displayValue = this.options.gauge.valueFormat(value * progress);
            const label = this.data.labels[0] || '';

            const progressColor = this.getGaugeColor(value);
            this.ctx.fillStyle = progressColor;
            this.ctx.font = `bold 48px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(displayValue, centerX, centerY - 10);

            this.ctx.font = '16px Arial';
            this.ctx.fillStyle = '#bbb';
            this.ctx.fillText(label, centerX, centerY + 25);
        }

        // Draw min/max labels
        this.ctx.font = '14px Arial';
        this.ctx.fillStyle = '#999';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        const minLabelX = centerX + Math.cos(startAngle) * (radius + thickness / 2 + 15);
        const minLabelY = centerY + Math.sin(startAngle) * (radius + thickness / 2 + 15);
        this.ctx.fillText(min.toString(), minLabelX, minLabelY);

        const maxLabelX = centerX + Math.cos(endAngle) * (radius + thickness / 2 + 15);
        const maxLabelY = centerY + Math.sin(endAngle) * (radius + thickness / 2 + 15);
        this.ctx.fillText(max.toString(), maxLabelX, maxLabelY);

        this.ctx.restore();
    }

    drawTitle() {
        const title = this.options.plugins.title;
        this.ctx.save();
        this.ctx.font = `${title.font.weight || 'bold'} ${title.font.size}px ${title.font.family}`;
        this.ctx.fillStyle = title.color;
        this.ctx.textAlign = title.align || 'center';
        this.ctx.textBaseline = 'top';
        
        const titleX = title.align === 'start' ? this.options.layout.padding.left : 
                      title.align === 'end' ? this.width - this.options.layout.padding.right : 
                      this.width / 2;
        
        this.ctx.fillText(title.text, titleX, this.options.layout.padding.top + title.padding.top);
        this.ctx.restore();
    }

    drawLegend() {
        const legend = this.options.plugins.legend;
        const dataset = this.data.datasets[0];
        const labels = this.type === 'funnel' ?
            this.getSortedFunnelData().map(d => d.label) :
            this.data.labels;

        this.ctx.save();
        this.ctx.font = `${legend.labels.font.size}px ${legend.labels.font.family}`;
        this.ctx.textBaseline = 'middle';

        const itemWidths = labels.map(label => {
            const textWidth = this.ctx.measureText(label).width;
            return textWidth + legend.labels.boxWidth + legend.labels.padding * 2;
        });

        const totalWidth = itemWidths.reduce((sum, w) => sum + w, 0);
        const maxItemHeight = legend.labels.boxWidth + legend.labels.padding;

        let startX, startY;

        switch (legend.position) {
            case 'top':
                startX = legend.align === 'start' ? this.options.layout.padding.left :
                        legend.align === 'end' ? this.width - totalWidth - this.options.layout.padding.right :
                        (this.width - totalWidth) / 2;
                startY = this.options.layout.padding.top + this.titleHeight + legend.padding;
                break;
            case 'bottom':
                startX = legend.align === 'start' ? this.options.layout.padding.left :
                        legend.align === 'end' ? this.width - totalWidth - this.options.layout.padding.right :
                        (this.width - totalWidth) / 2;
                startY = this.height - this.options.layout.padding.bottom - this.legendHeight + legend.padding;
                break;
            case 'left':
                startX = this.options.layout.padding.left + legend.padding;
                startY = this.chartArea.y + (this.chartArea.height - labels.length * maxItemHeight) / 2;
                break;
            case 'right':
                startX = this.width - this.options.layout.padding.right - this.legendWidth + legend.padding;
                startY = this.chartArea.y + (this.chartArea.height - labels.length * maxItemHeight) / 2;
                break;
        }

        let currentX = startX;
        let currentY = startY;

        labels.forEach((label, i) => {
            const color = Array.isArray(dataset.backgroundColor) ?
                dataset.backgroundColor[i % dataset.backgroundColor.length] :
                dataset.backgroundColor || '#3b82f6';

            // Draw color box
            this.ctx.fillStyle = color;
            if (legend.labels.usePointStyle) {
                this.ctx.beginPath();
                this.ctx.arc(currentX + legend.labels.boxWidth / 2, currentY, legend.labels.boxWidth / 2, 0, Math.PI * 2);
                this.ctx.fill();
            } else {
                this.roundRect(this.ctx, currentX, currentY - legend.labels.boxWidth / 2, 
                             legend.labels.boxWidth, legend.labels.boxWidth, 2);
                this.ctx.fill();
            }

            // Draw label text
            this.ctx.fillStyle = legend.labels.color;
            this.ctx.textAlign = 'left';
            this.ctx.fillText(label, currentX + legend.labels.boxWidth + legend.labels.padding, currentY);

            if (legend.position === 'left' || legend.position === 'right') {
                currentY += maxItemHeight;
            } else {
                currentX += itemWidths[i];
            }
        });

        this.ctx.restore();
    }

    drawAxes() {
        if (!this.options.scales.x.display && !this.options.scales.y.display) return;
        this.ctx.save();
        this.ctx.strokeStyle = '#999';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();

        if (this.options.scales.y.display) {
            this.ctx.moveTo(this.chartArea.x, this.chartArea.y);
            this.ctx.lineTo(this.chartArea.x, this.chartArea.y + this.chartArea.height);
        }

        if (this.options.scales.x.display) {
            this.ctx.moveTo(this.chartArea.x, this.chartArea.y + this.chartArea.height);
            this.ctx.lineTo(this.chartArea.x + this.chartArea.width, this.chartArea.y + this.chartArea.height);
        }

        this.ctx.stroke();
        this.ctx.restore();
    }

    drawGrid() {
        const xGrid = this.options.scales.x.grid;
        const yGrid = this.options.scales.y.grid;
        if (!xGrid.display && !yGrid.display) return;

        this.ctx.save();
        this.ctx.lineWidth = 1;

        if (yGrid.display) {
            this.ctx.strokeStyle = yGrid.color;
            for (let i = 0; i <= 5; i++) {
                const y = this.chartArea.y + (i / 5) * this.chartArea.height;
                this.ctx.beginPath();
                this.ctx.moveTo(this.chartArea.x, y);
                this.ctx.lineTo(this.chartArea.x + this.chartArea.width, y);
                this.ctx.stroke();
            }
        }

        if (xGrid.display) {
            this.ctx.strokeStyle = xGrid.color;
            const dataLength = this.data.labels.length;
            for (let i = 0; i < dataLength; i++) {
                const x = this.chartArea.x + (i / Math.max(dataLength - 1, 1)) * this.chartArea.width;
                this.ctx.beginPath();
                this.ctx.moveTo(x, this.chartArea.y);
                this.ctx.lineTo(x, this.chartArea.y + this.chartArea.height);
                this.ctx.stroke();
            }
        }

        this.ctx.restore();
    }

    drawAxisLabels(min, max) {
        if (!this.options.scales.x.display && !this.options.scales.y.display) return;
        this.ctx.save();

        if (this.options.scales.y.display) {
            const ticks = this.options.scales.y.ticks || {};
            this.ctx.font = `${ticks.font?.size || 11}px Arial`;
            this.ctx.fillStyle = ticks.color || '#666';
            this.ctx.textAlign = 'right';
            this.ctx.textBaseline = 'middle';

            for (let i = 0; i <= 5; i++) {
                const value = min + (i / 5) * (max - min);
                const y = this.chartArea.y + this.chartArea.height - (i / 5) * this.chartArea.height;
                this.ctx.fillText(value.toFixed(1), this.chartArea.x - 10, y);
            }
        }

        if (this.options.scales.x.display) {
            const ticks = this.options.scales.x.ticks || {};
            this.ctx.font = `${ticks.font?.size || 11}px Arial`;
            this.ctx.fillStyle = ticks.color || '#666';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'top';

            this.data.labels.forEach((label, i) => {
                const x = this.chartArea.x + (i / Math.max(this.data.labels.length - 1, 1)) * this.chartArea.width;
                this.ctx.fillText(label, x, this.chartArea.y + this.chartArea.height + 5);
            });
        }

        this.ctx.restore();
    }

    clear() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.ctx.fillStyle = this.backgroundColor;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    setBackgroundColor(color) {
        this.backgroundColor = color;
        this.redraw();
    }

    roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    lightenColor(color, percent) {
        if (!color || color === 'transparent') return '#3b82f6';
        let r, g, b;
        if (color.startsWith('#')) {
            const hex = color.replace('#', '');
            r = parseInt(hex.substr(0, 2), 16);
            g = parseInt(hex.substr(2, 2), 16);
            b = parseInt(hex.substr(4, 2), 16);
        } else if (color.startsWith('rgb')) {
            const match = color.match(/(\d+),\s*(\d+),\s*(\d+)/);
            if (match) {
                r = parseInt(match[1]);
                g = parseInt(match[2]);
                b = parseInt(match[3]);
            } else {
                return color;
            }
        } else {
            return color;
        }

        const amt = Math.round(2.55 * percent);
        r = Math.min(255, r + amt);
        g = Math.min(255, g + amt);
        b = Math.min(255, b + amt);

        return `rgb(${r}, ${g}, ${b})`;
    }

    easing(t, type) {
        const easings = {
            linear: t => t,
            easeInQuad: t => t * t,
            easeOutQuad: t => t * (2 - t),
            easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
            easeOutQuart: t => 1 - Math.pow(1 - t, 4),
            easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
            easeOutElastic: t => {
                const p = 0.3;
                return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
            }
        };
        return easings[type] ? easings[type](t) : easings.easeOutQuart(t);
    }

    update(newData) {
        this.cache.clear();
        if (newData.data) this.data = newData.data;
        if (newData.options) this.options = this.mergeOptions(newData.options);
        if (newData.type) this.type = newData.type;
        if (newData.backgroundColor) this.backgroundColor = newData.backgroundColor;
        this.render();
    }

    destroy() {
        this.removeEventListeners();
        this.hideTooltip();
        this.hideDetailedView();
        this.clear();
        if (this.frameId) {
            cancelAnimationFrame(this.frameId);
            this.frameId = null;
        }

        this.cache.clear();
    }

    removeEventListeners() {
        if (!this.boundHandlers) return;
        this.canvas.removeEventListener('mousemove', this.boundHandlers.mousemove);
        this.canvas.removeEventListener('mouseleave', this.boundHandlers.mouseleave);
        this.canvas.removeEventListener('click', this.boundHandlers.click);
        this.canvas.removeEventListener('dblclick', this.boundHandlers.dblclick);
        this.canvas.removeEventListener('touchstart', this.boundHandlers.touchstart);
        this.canvas.removeEventListener('touchmove', this.boundHandlers.touchmove);
        this.canvas.removeEventListener('touchend', this.boundHandlers.touchend);
        window.removeEventListener('resize', this.boundHandlers.resize);

        if (this.detailedViewClickListener) {
            document.removeEventListener('mousedown', this.detailedViewClickListener);
            this.detailedViewClickListener = null;
        }

        this.boundHandlers = {};
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChartMaster;
}
if (typeof window !== 'undefined') {
    window.ChartMaster = ChartMaster;
}
