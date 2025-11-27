/**
 * ChartMaster.js - Optimized Complete Charting Library
 * Enhanced with CSS injection and detailed view functionality
 * @version 2.0.0
 */

class ChartMaster {
  constructor(canvasId, config) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) throw new Error(`Canvas "${canvasId}" not found`);
    
    this.ctx = this.canvas.getContext('2d');
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    
    // Configuration
    this.type = config.type || 'line';
    this.data = config.data || {};
    this.options = this.mergeOptions(config.options || {});
    
    // State management
    this.animationProgress = 0;
    this.isAnimating = false;
    this.hoveredIndex = -1;
    this.tooltipData = null;
    this.chartArea = null;
    this.scales = { x: null, y: null };
    this.detailedView = false;
    
    // Performance optimization
    this.cache = new Map();
    this.frameId = null;
    
    // Touch state
    this.touchStartTime = 0;
    this.touchStartX = 0;
    this.touchStartY = 0;
    
    this.setupStyles();
    this.setupEventListeners();
    this.render();
  }

  // CSS injection for tooltips and detailed view
  setupStyles() {
    if (document.getElementById('chartmaster-styles')) return;
    
    const styles = `
      .chartmaster-tooltip {
        position: absolute;
        background: rgba(0, 0, 0, 0.85);
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        font-family: Arial, sans-serif;
        font-size: 12px;
        pointer-events: none;
        z-index: 1000;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        backdrop-filter: blur(5px);
        border: 1px solid rgba(255,255,255,0.1);
        transform: translate(-50%, -100%);
        margin-top: -10px;
        white-space: nowrap;
        max-width: 200px;
        text-align: center;
      }
      
      .chartmaster-tooltip::after {
        content: '';
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        border: 5px solid transparent;
        border-top-color: rgba(0, 0, 0, 0.85);
      }
      
      .chartmaster-detailed-view {
        position: absolute;
        background: white;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 16px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        z-index: 1001;
        font-family: Arial, sans-serif;
        max-width: 300px;
        animation: chartmaster-fadeIn 0.2s ease-out;
      }
      
      .chartmaster-detailed-view h4 {
        margin: 0 0 8px 0;
        color: #333;
        font-size: 14px;
        font-weight: bold;
      }
      
      .chartmaster-detailed-view p {
        margin: 4px 0;
        color: #666;
        font-size: 12px;
      }
      
      .chartmaster-detailed-view .data-point {
        display: flex;
        justify-content: space-between;
        margin: 8px 0;
        padding: 4px 0;
        border-bottom: 1px solid #f0f0f0;
      }
      
      .chartmaster-detailed-view .data-point:last-child {
        border-bottom: none;
      }
      
      .chartmaster-detailed-view .color-indicator {
        width: 12px;
        height: 12px;
        border-radius: 2px;
        display: inline-block;
        margin-right: 6px;
      }
      
      @keyframes chartmaster-fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
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
      detailedView: {
        enabled: true,
        trigger: 'doubleClick', // 'doubleClick', 'longPress', 'always'
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
          position: 'top',
          labels: {
            color: '#666',
            font: { size: 12, family: 'Arial' },
            padding: 10
          }
        },
        title: {
          display: false,
          text: '',
          color: '#333',
          font: { size: 16, weight: 'bold', family: 'Arial' },
          padding: 20
        },
        tooltip: {
          enabled: true,
          mode: 'nearest'
        }
      },
      scales: {
        x: {
          display: true,
          grid: { display: true, color: 'rgba(0, 0, 0, 0.08)' }
        },
        y: {
          display: true,
          beginAtZero: true,
          grid: { display: true, color: 'rgba(0, 0, 0, 0.08)' }
        }
      },
      layout: {
        padding: { top: 20, right: 20, bottom: 20, left: 20 }
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
    this.canvas.addEventListener('mousemove', this.throttle(this.handleMouseMove.bind(this), 16));
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
    this.canvas.addEventListener('click', this.handleClick.bind(this));
    this.canvas.addEventListener('dblclick', this.handleDoubleClick.bind(this));
    
    // Touch events for mobile
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
    this.canvas.addEventListener('touchmove', this.throttle(this.handleTouchMove.bind(this), 16));
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
    
    // Window resize
    window.addEventListener('resize', this.throttle(this.handleResize.bind(this), 250));
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
    this.updateHoverState(pos.x, pos.y);
  }

  handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const pos = this.getCanvasPosition(touch);
    this.updateHoverState(pos.x, pos.y);
  }

  handleMouseLeave() {
    this.hoveredIndex = -1;
    this.hideTooltip();
    this.redraw();
  }

  handleClick(e) {
    if (this.hoveredIndex !== -1) {
      if (this.options.onClick) {
        const pos = this.getCanvasPosition(e);
        this.options.onClick(e, this.hoveredIndex, this.getDataAtPoint(this.hoveredIndex), this);
      }
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
      y: (e.clientY - rect.top) * scaleY
    };
  }

  updateHoverState(x, y) {
    const prevHovered = this.hoveredIndex;
    this.hoveredIndex = this.getElementAtPosition(x, y);

    if (this.hoveredIndex !== -1) {
      this.canvas.style.cursor = 'pointer';
      this.updateTooltip(x, y, this.hoveredIndex);
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
    const cacheKey = `element-${x}-${y}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    let elementIndex = -1;
    
    if (this.type === 'line' || this.type === 'bar') {
      elementIndex = this.getAxisChartElement(x, y);
    } else if (this.type === 'pie' || this.type === 'doughnut') {
      elementIndex = this.getCircularChartElement(x, y);
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
      const pointRadius = 10;
      const segmentWidth = this.chartArea.width / Math.max(dataLength - 1, 1);

      for (let i = 0; i < dataLength; i++) {
        const pointX = this.chartArea.x + (i / Math.max(dataLength - 1, 1)) * this.chartArea.width;
        const pointY = this.getYPosition(dataset.data[i]);
        
        const distance = Math.sqrt(Math.pow(x - pointX, 2) + Math.pow(y - pointY, 2));
        if (distance <= pointRadius) {
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
    const radius = Math.min(this.width, this.height) / 2 - 40;
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

  getYPosition(value) {
    const dataset = this.data.datasets[0];
    const data = dataset.data;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    
    return this.chartArea.y + this.chartArea.height - ((value - min) / range) * this.chartArea.height;
  }

  updateTooltip(x, y, index) {
    const data = this.getDataAtPoint(index);
    if (!data) return;

    this.hideTooltip();

    this.tooltip = document.createElement('div');
    this.tooltip.className = 'chartmaster-tooltip';
    this.tooltip.innerHTML = `
      <strong>${data.label}</strong><br>
      Value: ${data.value}
      ${data.percentage ? `<br>Percentage: ${data.percentage}%` : ''}
    `;
    
    document.body.appendChild(this.tooltip);
    this.updateTooltipPosition(x, y);
  }

  updateTooltipPosition(x, y) {
    if (!this.tooltip) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const scrollX = window.pageXOffset;
    const scrollY = window.pageYOffset;
    
    let left = rect.left + x + scrollX;
    let top = rect.top + y + scrollY - this.tooltip.offsetHeight - 10;
    
    // Keep tooltip within viewport
    if (left < 10) left = 10;
    if (left + this.tooltip.offsetWidth > window.innerWidth - 10) {
      left = window.innerWidth - this.tooltip.offsetWidth - 10;
    }
    if (top < 10) top = rect.top + y + scrollY + 20;
    
    this.tooltip.style.left = left + 'px';
    this.tooltip.style.top = top + 'px';
  }

  hideTooltip() {
    if (this.tooltip) {
      this.tooltip.remove();
      this.tooltip = null;
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
        <span><strong>${data.label}</strong></span>
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
      <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e0e0e0;">
        <div class="data-point">
          <span>Average:</span>
          <span>${stats.average.toFixed(2)}</span>
        </div>
        <div class="data-point">
          <span>Median:</span>
          <span>${stats.median.toFixed(2)}</span>
        </div>
        <div class="data-point">
          <span>Min/Max:</span>
          <span>${stats.min}/${stats.max}</span>
        </div>
        <div class="data-point">
          <span>Total:</span>
          <span>${stats.total}</span>
        </div>
        <div class="data-point">
          <span>Data Points:</span>
          <span>${dataset.data.length}</span>
        </div>
      </div>
      ` : ''}
      ${this.options.detailedView.showRawData ? `
      <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e0e0e0;">
        <strong>All Data Points:</strong>
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
    this.positionDetailedView(e);
    
    this.detailedViewClickListener = (event) => {
      if (!this.detailedView.contains(event.target) && event.target !== this.canvas) {
        this.hideDetailedView();
      }
    };
    document.addEventListener('mousedown', this.detailedViewClickListener);
    
    if (this.options.onDetailedView) {
      this.options.onDetailedView(e, this.hoveredIndex, data, this);
    }
  }

  hideDetailedView() {
    if (this.detailedView) {
      this.detailedView.remove();
      this.detailedView = null;
    }
    if (this.detailedViewClickListener) {
      document.removeEventListener('mousedown', this.detailedViewClickListener);
      this.detailedViewClickListener = null;
    }
    this.detailedView = false;
  }

  positionDetailedView(e) {
    if (!this.detailedView) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const scrollX = window.pageXOffset;
    const scrollY = window.pageYOffset;
    
    let left = rect.left + (e.clientX - rect.left);
    let top = rect.top + (e.clientY - rect.top) + 20;
    
    if (left + this.detailedView.offsetWidth > window.innerWidth - 20) {
      left = window.innerWidth - this.detailedView.offsetWidth - 20;
    }
    if (top + this.detailedView.offsetHeight > window.innerHeight - 20) {
      top = rect.top + (e.clientY - rect.top) - this.detailedView.offsetHeight - 20;
    }
    
    this.detailedView.style.left = left + 'px';
    this.detailedView.style.top = top + 'px';
  }

  getDataAtPoint(index) {
    if (index === -1 || !this.data.datasets[0]) return null;
    
    const dataset = this.data.datasets[0];
    const label = this.data.labels[index];
    const value = dataset.data[index];
    
    let percentage = null;
    if (this.type === 'pie' || this.type === 'doughnut') {
      const total = dataset.data.reduce((sum, val) => sum + val, 0);
      percentage = ((value / total) * 100).toFixed(1);
    }
    
    return {
      label,
      value,
      percentage,
      color: Array.isArray(dataset.backgroundColor) 
        ? dataset.backgroundColor[index % dataset.backgroundColor.length]
        : dataset.backgroundColor || '#3b82f6'
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
    this.calculateChartArea();

    if (this.options.plugins.title.display) {
      this.drawTitle();
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
    }

    if (this.options.plugins.legend.display) {
      this.drawLegend();
    }

    this.drawAxes();
    this.drawGrid();
  }

  drawLineChart(progress) {
    const dataset = this.data.datasets[0];
    const data = dataset.data;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    this.drawAxisLabels(min, max);

    const points = [];
    const visibleCount = Math.ceil(data.length * progress);

    this.ctx.save();
    this.ctx.strokeStyle = dataset.borderColor || '#3b82f6';
    this.ctx.lineWidth = this.options.elements.line.borderWidth;
    this.ctx.beginPath();

    for (let i = 0; i < visibleCount; i++) {
      const x = this.chartArea.x + (i / Math.max(data.length - 1, 1)) * this.chartArea.width;
      const value = data[i];
      const y = this.chartArea.y + this.chartArea.height - ((value - min) / range) * this.chartArea.height;
      
      points.push({ x, y, index: i });

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

    // Fill area if enabled
    if (this.options.elements.line.fill) {
      this.ctx.globalAlpha = 0.2;
      this.ctx.fillStyle = dataset.backgroundColor || dataset.borderColor || '#3b82f6';
      this.ctx.lineTo(points[points.length - 1].x, this.chartArea.y + this.chartArea.height);
      this.ctx.lineTo(this.chartArea.x, this.chartArea.y + this.chartArea.height);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.globalAlpha = 1;
    }

    // Draw points
    points.forEach(point => {
      const isHovered = this.hoveredIndex === point.index;
      const radius = isHovered 
        ? this.options.elements.point.hoverRadius 
        : this.options.elements.point.radius;

      this.ctx.fillStyle = dataset.borderColor || '#3b82f6';
      this.ctx.beginPath();
      this.ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      this.ctx.fill();
    });

    this.ctx.restore();
  }

  drawBarChart(progress) {
    const dataset = this.data.datasets[0];
    const data = dataset.data;
    const max = Math.max(...data, 0);
    const min = Math.min(...data, 0);
    const range = max - min || 1;

    this.drawAxisLabels(min, max);

    const barWidth = this.chartArea.width / data.length * 0.7;
    const gap = this.chartArea.width / data.length * 0.15;

    this.ctx.save();

    data.forEach((value, i) => {
      const x = this.chartArea.x + (i / data.length) * this.chartArea.width + gap;
      const barHeight = ((value - min) / range) * this.chartArea.height * progress;
      const y = this.chartArea.y + this.chartArea.height - barHeight;

      const isHovered = this.hoveredIndex === i;
      const color = Array.isArray(dataset.backgroundColor)
        ? dataset.backgroundColor[i % dataset.backgroundColor.length]
        : dataset.backgroundColor || '#3b82f6';

      this.ctx.fillStyle = isHovered ? this.lightenColor(color, 20) : color;

      const radius = this.options.elements.bar.borderRadius;
      this.ctx.beginPath();
      this.ctx.moveTo(x + radius, y);
      this.ctx.lineTo(x + barWidth - radius, y);
      this.ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
      this.ctx.lineTo(x + barWidth, y + barHeight);
      this.ctx.lineTo(x, y + barHeight);
      this.ctx.lineTo(x, y + radius);
      this.ctx.quadraticCurveTo(x, y, x + radius, y);
      this.ctx.closePath();
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
    const radius = Math.min(this.width, this.height) / 2 - 40;
    const innerRadius = radius * 0.5;
    this.drawCircularChart(progress, innerRadius);
  }

  drawCircularChart(progress, innerRadius) {
    const dataset = this.data.datasets[0];
    const data = dataset.data;
    const total = data.reduce((sum, val) => sum + val, 0);
    
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const radius = Math.min(this.width, this.height) / 2 - 40;

    let currentAngle = -Math.PI / 2;

    this.ctx.save();

    data.forEach((value, i) => {
      const sliceAngle = (value / total) * Math.PI * 2 * progress;
      const isHovered = this.hoveredIndex === i;
      
      const offset = isHovered ? this.options.elements.arc.hoverOffset : 0;
      const midAngle = currentAngle + sliceAngle / 2;
      const offsetX = Math.cos(midAngle) * offset;
      const offsetY = Math.sin(midAngle) * offset;

      const color = Array.isArray(dataset.backgroundColor)
        ? dataset.backgroundColor[i % dataset.backgroundColor.length]
        : dataset.backgroundColor || '#3b82f6';

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

  drawTitle() {
    const title = this.options.plugins.title;
    this.ctx.save();
    this.ctx.font = `${title.font.weight || 'bold'} ${title.font.size}px ${title.font.family}`;
    this.ctx.fillStyle = title.color;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(title.text, this.width / 2, this.options.layout.padding.top);
    this.ctx.restore();
  }

  drawLegend() {
    const legend = this.options.plugins.legend;
    const dataset = this.data.datasets[0];
    const labels = this.data.labels;

    let legendY = this.height - this.options.layout.padding.bottom - 20;
    let legendX = this.width / 2;

    if (legend.position === 'top') {
      legendY = this.options.layout.padding.top + (this.options.plugins.title.display ? 40 : 0);
    }

    this.ctx.save();
    this.ctx.font = `${legend.labels.font.size}px ${legend.labels.font.family}`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    const totalWidth = labels.reduce((sum, label) => {
      return sum + this.ctx.measureText(label).width + 30;
    }, 0);

    let currentX = legendX - totalWidth / 2;

    labels.forEach((label, i) => {
      const color = Array.isArray(dataset.backgroundColor)
        ? dataset.backgroundColor[i % dataset.backgroundColor.length]
        : dataset.backgroundColor || '#3b82f6';

      this.ctx.fillStyle = color;
      this.ctx.fillRect(currentX, legendY - 6, 12, 12);

      this.ctx.fillStyle = legend.labels.color;
      this.ctx.fillText(label, currentX + 18, legendY);

      currentX += this.ctx.measureText(label).width + 30;
    });

    this.ctx.restore();
  }

  drawAxes() {
    if (!this.options.scales.x.display && !this.options.scales.y.display) return;

    this.ctx.save();
    this.ctx.strokeStyle = '#666';
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
    this.ctx.strokeStyle = yGrid.color;

    if (yGrid.display) {
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

    // Y-axis labels
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

    // X-axis labels
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
  }

  calculateChartArea() {
    const layout = this.options.layout.padding;
    const titleHeight = this.options.plugins.title.display ? 40 : 0;
    const legendHeight = this.options.plugins.legend.display ? 40 : 0;

    this.chartArea = {
      x: layout.left + 40,
      y: layout.top + titleHeight,
      width: this.width - layout.left - layout.right - 40,
      height: this.height - layout.top - layout.bottom - titleHeight - legendHeight - 40
    };
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
        return '#3b82f6';
      }
    } else {
      return '#3b82f6';
    }

    const amt = Math.round(2.55 * percent);
    r = Math.min(255, r + amt);
    g = Math.min(255, g + amt);
    b = Math.min(255, b + amt);

    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  easing(t, type) {
    const easings = {
      linear: t => t,
      easeInQuad: t => t * t,
      easeOutQuad: t => t * (2 - t),
      easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
      easeOutQuart: t => 1 - Math.pow(1 - t, 4),
      easeOutElastic: t => {
        const p = 0.3;
        return Math.pow(2, -10 * t) * Math.sin((t - p/4) * (2 * Math.PI) / p) + 1;
      }
    };

    return easings[type] ? easings[type](t) : easings.easeOutQuart(t);
  }

  update(newData) {
    this.cache.clear();
    if (newData.data) this.data = newData.data;
    if (newData.options) this.options = this.mergeOptions(newData.options);
    if (newData.type) this.type = newData.type;
    this.render();
  }

  destroy() {
    this.removeEventListeners();
    this.hideTooltip();
    this.hideDetailedView();
    this.clear();
    
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
    }
    
    const styles = document.getElementById('chartmaster-styles');
    if (styles) styles.remove();
  }

  removeEventListeners() {
    const events = ['mousemove', 'mouseleave', 'click', 'dblclick', 'touchstart', 'touchmove', 'touchend'];
    events.forEach(event => {
      this.canvas.removeEventListener(event, () => {});
    });
    window.removeEventListener('resize', () => {});
    
    if (this.detailedViewClickListener) {
      document.removeEventListener('mousedown', this.detailedViewClickListener);
    }
  }
}

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChartMaster;
}
if (typeof window !== 'undefined') {
  window.ChartMaster = ChartMaster;
}
