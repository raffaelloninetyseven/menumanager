(function($) {
    'use strict';
    
    let isInitialized = false;
    let viewers = new Map();
    
    function initPDFJS() {
        if (typeof pdfjsLib !== 'undefined' && !window.pdfJSConfigured) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';
            window.pdfJSConfigured = true;
            console.log('PDF.js configurato correttamente');
        }
    }
    
    class MenuViewer {
        constructor(container, pdfUrl, isDouble = false) {
            this.container = container;
            this.pdfUrl = pdfUrl;
            this.isDouble = isDouble;
            this.pdf = null;
            this.currentPage = 1;
            this.totalPages = 1;
            this.canvases = [];
            this.isLoading = false;
            this.uniqueId = 'viewer_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            console.log('Creazione viewer:', {
                id: this.uniqueId,
                url: this.pdfUrl,
                isDouble: this.isDouble
            });
            
            this.init();
        }
        
        async init() {
            if (this.isLoading) return;
            this.isLoading = true;
            
            try {
                this.showLoading('Caricamento PDF...');
                await this.loadPDF();
                this.showLoading('Preparazione pagine...');
                await this.preloadPages();
                this.setupContainer();
                this.bindEvents();
                this.renderCurrentPages();
                this.hideLoading();
                console.log('Viewer inizializzato con successo');
            } catch (error) {
                console.error('Errore viewer:', error);
                this.showError('Errore nel caricamento: ' + error.message);
            } finally {
                this.isLoading = false;
            }
        }
        
        async loadPDF() {
            if (typeof pdfjsLib === 'undefined') {
                throw new Error('PDF.js non disponibile');
            }
            
            try {
                const loadingTask = pdfjsLib.getDocument({
                    url: this.pdfUrl,
                    cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/cmaps/',
                    cMapPacked: true
                });
                
                this.pdf = await loadingTask.promise;
                this.totalPages = this.pdf.numPages;
                
                console.log('PDF caricato:', {
                    url: this.pdfUrl,
                    pages: this.totalPages
                });
            } catch (error) {
                console.error('Errore caricamento PDF:', error);
                throw new Error('Impossibile caricare il PDF');
            }
        }
        
        showLoading(message) {
            const flipbook = this.container.find('.menu-flipbook-container');
            flipbook.html(`
                <div class="loading-container">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">${message}</div>
                </div>
            `);
        }
        
        hideLoading() {
            
        }
        
        async preloadPages() {
            console.log('Precaricamento pagine:', this.totalPages);
            
            for (let i = 1; i <= this.totalPages; i++) {
                try {
                    const page = await this.pdf.getPage(i);
                    const canvas = await this.renderPageToCanvas(page);
                    this.canvases[i] = canvas;
                } catch (error) {
                    console.error(`Errore caricamento pagina ${i}:`, error);
                }
            }
            
            console.log('Precaricamento completato');
        }
        
        async renderPageToCanvas(page) {
            const containerWidth = this.container.find('.menu-flipbook-container').width() || 600;
            const containerHeight = this.container.find('.menu-flipbook-container').height() || 800;
            
            let targetWidth = containerWidth;
            if (this.isDouble) {
                targetWidth = (containerWidth - 40) / 2;
            } else {
                targetWidth = containerWidth - 40;
            }
            
            const viewport = page.getViewport({ scale: 1 });
            const scale = Math.min(
                targetWidth / viewport.width,
                (containerHeight - 40) / viewport.height
            );
            
            const finalViewport = page.getViewport({ scale });
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = finalViewport.height;
            canvas.width = finalViewport.width;
            
            await page.render({
                canvasContext: context,
                viewport: finalViewport
            }).promise;
            
            console.log('Pagina renderizzata:', {
                scale: scale,
                width: canvas.width,
                height: canvas.height
            });
            
            return canvas;
        }
        
        setupContainer() {
            const flipbook = this.container.find('.menu-flipbook-container');
            flipbook.empty();
            
            const pagesContainer = $('<div class="pages-container"></div>');
            flipbook.append(pagesContainer);
            
            this.updateControls();
        }
        
        renderCurrentPages() {
            const pagesContainer = this.container.find('.pages-container');
            pagesContainer.empty();
            
            if (this.isDouble) {
                this.renderDoublePages();
            } else {
                this.renderSinglePage();
            }
            
            this.updateControls();
        }
        
        renderSinglePage() {
            const canvas = this.canvases[this.currentPage];
            if (!canvas) return;
            
            const pageDiv = $('<div class="menu-page single"></div>');
            const canvasClone = canvas.cloneNode(true);
            
            $(canvasClone).css({
                'width': '100%',
                'height': '100%',
                'object-fit': 'contain',
                'display': 'block'
            });
            
            pageDiv.append(canvasClone);
            this.container.find('.pages-container').append(pageDiv);
        }
        
        renderDoublePages() {
            const pagesContainer = this.container.find('.pages-container');
            
            if (this.currentPage > 1) {
                const leftCanvas = this.canvases[this.currentPage - 1];
                if (leftCanvas) {
                    const leftDiv = $('<div class="menu-page double-left"></div>');
                    const leftClone = leftCanvas.cloneNode(true);
                    $(leftClone).css({
                        'width': '100%',
                        'height': '100%',
                        'object-fit': 'contain',
                        'display': 'block'
                    });
                    leftDiv.append(leftClone);
                    pagesContainer.append(leftDiv);
                }
            }
            
            const rightCanvas = this.canvases[this.currentPage];
            if (rightCanvas) {
                const rightDiv = $('<div class="menu-page double-right"></div>');
                const rightClone = rightCanvas.cloneNode(true);
                $(rightClone).css({
                    'width': '100%',
                    'height': '100%',
                    'object-fit': 'contain',
                    'display': 'block'
                });
                rightDiv.append(rightClone);
                pagesContainer.append(rightDiv);
            }
        }
        
        updateControls() {
            const currentSpan = this.container.find('.current-page');
            const currentEndSpan = this.container.find('.current-page-end');
            const totalSpan = this.container.find('.total-pages');
            const slider = this.container.find('.page-slider');
            const progress = this.container.find('.page-progress');
            const prevBtn = this.container.find('.prev-page');
            const nextBtn = this.container.find('.next-page');
            
            if (this.isDouble) {
                const leftPage = this.currentPage > 1 ? this.currentPage - 1 : this.currentPage;
                const rightPage = this.currentPage;
                
                currentSpan.text(leftPage);
                if (currentEndSpan.length && leftPage !== rightPage) {
                    currentEndSpan.text(rightPage);
                } else if (currentEndSpan.length) {
                    currentEndSpan.text('');
                }
            } else {
                currentSpan.text(this.currentPage);
            }
            
            totalSpan.text(this.totalPages);
            
            const maxSlider = this.isDouble ? Math.ceil(this.totalPages / 2) : this.totalPages;
            const sliderValue = this.isDouble ? Math.ceil(this.currentPage / 2) : this.currentPage;
            
            slider.attr('max', maxSlider).val(sliderValue);
            
            const progressPercent = maxSlider > 1 ? ((sliderValue - 1) / (maxSlider - 1)) * 100 : 0;
            progress.css('width', progressPercent + '%');
            
            if (this.isDouble) {
                prevBtn.prop('disabled', this.currentPage <= 2);
                nextBtn.prop('disabled', this.currentPage >= this.totalPages);
            } else {
                prevBtn.prop('disabled', this.currentPage <= 1);
                nextBtn.prop('disabled', this.currentPage >= this.totalPages);
            }
        }
        
        bindEvents() {
            this.container.find('.prev-page').off('click').on('click', () => {
                this.goToPreviousPage();
            });
            
            this.container.find('.next-page').off('click').on('click', () => {
                this.goToNextPage();
            });
            
            this.container.find('.page-slider').off('input change').on('input change', (e) => {
                const value = parseInt($(e.target).val());
                let targetPage;
                
                if (this.isDouble) {
                    targetPage = (value - 1) * 2 + 2;
                    if (targetPage > this.totalPages) {
                        targetPage = this.totalPages;
                    }
                } else {
                    targetPage = value;
                }
                
                this.goToPage(targetPage);
            });
            
            let startX = 0;
            let startY = 0;
            
            this.container.find('.pages-container').off('touchstart touchend')
                .on('touchstart', (e) => {
                    const touch = e.originalEvent.touches[0];
                    startX = touch.clientX;
                    startY = touch.clientY;
                })
                .on('touchend', (e) => {
                    const touch = e.originalEvent.changedTouches[0];
                    const endX = touch.clientX;
                    const endY = touch.clientY;
                    const diffX = startX - endX;
                    const diffY = startY - endY;
                    
                    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
                        if (diffX > 0) {
                            this.goToNextPage();
                        } else {
                            this.goToPreviousPage();
                        }
                    }
                });
        }
        
        goToPage(pageNum) {
            if (pageNum < 1 || pageNum > this.totalPages) return;
            
            this.currentPage = pageNum;
            this.renderCurrentPages();
        }
        
        goToNextPage() {
            let nextPage;
            
            if (this.isDouble) {
                nextPage = Math.min(this.totalPages, this.currentPage + 2);
            } else {
                nextPage = Math.min(this.totalPages, this.currentPage + 1);
            }
            
            this.goToPage(nextPage);
        }
        
        goToPreviousPage() {
            let prevPage;
            
            if (this.isDouble) {
                prevPage = Math.max(2, this.currentPage - 2);
            } else {
                prevPage = Math.max(1, this.currentPage - 1);
            }
            
            this.goToPage(prevPage);
        }
        
        showError(message) {
            const flipbook = this.container.find('.menu-flipbook-container');
            flipbook.html(`
                <div class="loading-container">
                    <div style="font-size: 48px; margin-bottom: 16px; color: #ef4444;">❌</div>
                    <div class="loading-text">${message}</div>
                    <div style="margin-top: 10px;">
                        <a href="${this.pdfUrl}" target="_blank" class="download-btn" style="font-size: 14px;">Apri PDF direttamente</a>
                    </div>
                </div>
            `);
        }
        
        destroy() {
            this.container.find('.prev-page, .next-page, .page-slider').off();
            this.container.find('.pages-container').off();
            viewers.delete(this.uniqueId);
        }
    }
    
    window.initMenuViewer = function(container, pdfUrl, isDouble = false) {
        if (!container || !pdfUrl) {
            console.error('Container o PDF URL mancante');
            return null;
        }
        
        const containerId = container.attr('id') || container.data('viewer-id') || 'viewer_' + Date.now();
        container.attr('data-viewer-id', containerId);
        
        if (viewers.has(containerId)) {
            console.log('Distruzione viewer esistente:', containerId);
            viewers.get(containerId).destroy();
        }
        
        console.log('Creazione nuovo viewer:', containerId);
        const viewer = new MenuViewer(container, pdfUrl, isDouble);
        viewers.set(containerId, viewer);
        
        return viewer;
    };
    
    $(document).on('keydown', function(e) {
        const activeContainer = $('.menu-viewer-container:visible').first();
        if (!activeContainer.length) return;
        
        const viewerId = activeContainer.data('viewer-id');
        const activeViewer = viewers.get(viewerId);
        if (!activeViewer) return;
        
        switch(e.keyCode) {
            case 37:
                e.preventDefault();
                activeViewer.goToPreviousPage();
                break;
            case 39:
                e.preventDefault();
                activeViewer.goToNextPage();
                break;
            case 32:
                e.preventDefault();
                activeViewer.goToNextPage();
                break;
        }
    });
    
    function initializeWidgets() {
        console.log('=== INIZIALIZZAZIONE WIDGET AUTOMATICA ===');
        
        $('.menu-viewer-container[data-mode="single"], .menu-viewer-container[data-mode="double"]').each(function() {
            const container = $(this);
            
            if (container.data('initialized')) {
                console.log('Widget già inizializzato, skip');
                return;
            }
            
            const flipbook = container.find('.menu-flipbook-container');
            const pdfUrl = flipbook.data('pdf');
            const isDouble = container.data('mode') === 'double';
            
            console.log('Dati widget:', {
                container: container.length,
                flipbook: flipbook.length,
                pdfUrl: pdfUrl,
                isDouble: isDouble,
                mode: container.data('mode')
            });
            
            if (!pdfUrl) {
                console.log('❌ Nessun PDF URL trovato per il widget');
                flipbook.html(`
                    <div class="loading-container">
                        <div style="font-size: 48px; margin-bottom: 16px; color: #ef4444;">❌</div>
                        <div class="loading-text">Nessun PDF configurato</div>
                    </div>
                `);
                return;
            }
            
            console.log('✅ Inizializzazione widget per PDF:', pdfUrl);
            container.data('initialized', true);
            
            try {
                const viewer = window.initMenuViewer(container, pdfUrl, isDouble);
                console.log('✅ Viewer creato:', viewer);
            } catch (error) {
                console.error('❌ Errore inizializzazione widget:', error);
                flipbook.html(`
                    <div class="loading-container">
                        <div style="font-size: 48px; margin-bottom: 16px; color: #ef4444;">❌</div>
                        <div class="loading-text">Errore: ${error.message}</div>
                        <div style="margin-top: 10px;">
                            <a href="${pdfUrl}" target="_blank" class="download-btn">Apri PDF direttamente</a>
                        </div>
                    </div>
                `);
            }
        });
        
        // Debug container presenti
        console.log('Container trovati:', $('.menu-viewer-container').length);
        console.log('Container con data-mode:', $('.menu-viewer-container[data-mode]').length);
    }
    
    function waitForPDFJS(callback, attempts = 0) {
        if (typeof pdfjsLib !== 'undefined') {
            initPDFJS();
            callback();
        } else if (attempts < 50) {
            setTimeout(() => waitForPDFJS(callback, attempts + 1), 100);
        } else {
            console.error('PDF.js non è stato caricato dopo 5 secondi');
        }
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            waitForPDFJS(initializeWidgets);
        });
    } else {
        waitForPDFJS(initializeWidgets);
    }
    
    $(window).on('elementor/frontend/init', function() {
        console.log('Elementor frontend inizializzato');
        setTimeout(() => {
            waitForPDFJS(initializeWidgets);
        }, 500);
    });
    
})(jQuery);