(function($) {
    'use strict';
    
    function initPDFJS() {
        if (typeof pdfjsLib !== 'undefined' && !window.pdfJSConfigured) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';
            window.pdfJSConfigured = true;
        }
    }
    
    let viewers = new Map();
    
    class MenuViewer {
        constructor(container, pdfUrl, isDouble = false) {
            this.container = container;
            this.pdfUrl = pdfUrl;
            this.isDouble = isDouble;
            this.pdf = null;
            this.currentPage = 1;
            this.totalPages = 1;
            this.pages = [];
            this.canvases = [];
            this.isLoading = false;
            
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
            } catch (error) {
                console.error('Errore viewer:', error);
                this.showError('Errore nel caricamento del PDF');
            } finally {
                this.isLoading = false;
            }
        }
        
        async loadPDF() {
            if (typeof pdfjsLib === 'undefined') {
                throw new Error('PDF.js non disponibile');
            }
            
            initPDFJS();
            
            try {
                console.log('Caricamento PDF:', this.pdfUrl);
                
                const loadingTask = pdfjsLib.getDocument({
                    url: this.pdfUrl,
                    cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/cmaps/',
                    cMapPacked: true,
                    disableAutoFetch: false,
                    disableStream: false,
                    disableRange: false
                });
                
                loadingTask.onProgress = (progress) => {
                    if (progress.total > 0) {
                        const percent = Math.round((progress.loaded / progress.total) * 100);
                        this.showLoading(`Caricamento PDF... ${percent}%`);
                    }
                };
                
                this.pdf = await loadingTask.promise;
                this.totalPages = this.pdf.numPages;
                
                console.log('PDF caricato con successo:', {
                    pages: this.totalPages,
                    url: this.pdfUrl
                });
                
                if (this.isDouble && this.currentPage === 1) {
                    this.currentPage = 2;
                }
                
            } catch (error) {
                console.error('Errore caricamento PDF:', error);
                throw new Error(`Impossibile caricare il PDF: ${error.message}`);
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
            // Il loading viene rimosso in setupContainer
        }
        
        async preloadPages() {
            console.log('Precaricamento pagine:', this.totalPages);
            
            for (let i = 1; i <= this.totalPages; i++) {
                try {
                    this.showLoading(`Caricamento pagina ${i}/${this.totalPages}...`);
                    await this.loadAndRenderPage(i);
                } catch (error) {
                    console.warn(`Errore pagina ${i}:`, error);
                }
            }
            
            console.log('Precaricamento completato');
        }
        
        async loadAndRenderPage(pageNum) {
            try {
                const page = await this.pdf.getPage(pageNum);
                this.pages[pageNum] = page;
                
                const canvas = await this.renderPageToCanvas(page);
                this.canvases[pageNum] = canvas;
                
                return canvas;
            } catch (error) {
                console.error(`Errore caricamento pagina ${pageNum}:`, error);
                return null;
            }
        }
        
        async renderPageToCanvas(page) {
            try {
                const containerWidth = this.container.find('.menu-flipbook-container').width() || 800;
                const containerHeight = this.container.find('.menu-flipbook-container').height() || 600;
                
                let scale = 1.5;
                const viewport = page.getViewport({ scale: 1 });
                const widthScale = (containerWidth - 40) / viewport.width;
                const heightScale = (containerHeight - 120) / viewport.height;
                scale = Math.min(widthScale, heightScale, 2.5);
                
                if (this.isDouble) {
                    scale *= 0.8;
                }
                
                const finalViewport = page.getViewport({ scale });
                
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = finalViewport.height;
                canvas.width = finalViewport.width;
                
                console.log(`Rendering pagina con scale: ${scale}, dimensioni: ${canvas.width}x${canvas.height}`);
                
                const renderContext = {
                    canvasContext: context,
                    viewport: finalViewport
                };
                
                await page.render(renderContext).promise;
                return canvas;
            } catch (error) {
                console.error('Errore rendering canvas:', error);
                throw error;
            }
        }
        
        setupContainer() {
            const flipbook = this.container.find('.menu-flipbook-container');
            flipbook.empty();
            
            const pagesContainer = $('<div class="pages-container"></div>');
            flipbook.append(pagesContainer);
        }
        
        renderCurrentPages() {
            const pagesContainer = this.container.find('.pages-container');
            if (!pagesContainer.length) return;
            
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
                'max-width': '100%',
                'max-height': '100%',
                'width': 'auto',
                'height': 'auto',
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
                        'max-width': '100%',
                        'max-height': '100%',
                        'width': 'auto',
                        'height': 'auto'
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
                    'max-width': '100%',
                    'max-height': '100%',
                    'width': 'auto',
                    'height': 'auto'
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
                const leftPage = this.currentPage > 1 ? this.currentPage - 1 : '';
                const rightPage = this.currentPage;
                
                currentSpan.text(leftPage || rightPage);
                if (currentEndSpan.length && leftPage) {
                    currentEndSpan.text(rightPage);
                } else if (currentEndSpan.length) {
                    currentEndSpan.text('');
                }
            } else {
                currentSpan.text(this.currentPage);
            }
            
            totalSpan.text(this.totalPages);
            
            const maxSlider = this.isDouble ? Math.ceil(this.totalPages / 2) + 1 : this.totalPages;
            const sliderValue = this.isDouble ? Math.ceil(this.currentPage / 2) : this.currentPage;
            
            slider.attr('max', maxSlider).val(sliderValue);
            
            const progressPercent = maxSlider > 1 ? ((sliderValue - 1) / (maxSlider - 1)) * 100 : 0;
            progress.css('width', Math.max(0, Math.min(100, progressPercent)) + '%');
            
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
            
            this.setupTouchEvents();
        }
        
        setupTouchEvents() {
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
                    <div style="margin-top: 10px; font-size: 12px; opacity: 0.7;">
                        <a href="${this.pdfUrl}" target="_blank" style="color: #2563eb;">Apri PDF direttamente</a>
                    </div>
                </div>
            `);
        }
        
        destroy() {
            this.container.find('.prev-page, .next-page, .page-slider').off();
            this.container.find('.pages-container').off();
        }
    }
    
    window.initMenuViewer = function(container, pdfUrl, isDouble = false) {
        const viewerId = container.attr('id') || 'viewer_' + Date.now();
        
        if (viewers.has(viewerId)) {
            viewers.get(viewerId).destroy();
            viewers.delete(viewerId);
        }
        
        const viewer = new MenuViewer(container, pdfUrl, isDouble);
        viewers.set(viewerId, viewer);
        
        return viewer;
    };
    
    $(document).on('keydown', function(e) {
        const activeContainer = $('.menu-viewer-container:visible').first();
        if (!activeContainer.length) return;
        
        const viewerId = activeContainer.attr('id') || 'viewer_' + Date.now();
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
    
    $(document).ready(function() {
        function waitForPDFJS() {
            if (typeof pdfjsLib === 'undefined') {
                setTimeout(waitForPDFJS, 100);
                return;
            }
            
            console.log('PDF.js caricato, inizializzazione viewer...');
            initPDFJS();
            
            $('.menu-viewer-container[data-mode="single"], .menu-viewer-container[data-mode="double"]').each(function() {
                const container = $(this);
                const flipbook = container.find('.menu-flipbook-container');
                const pdfUrl = flipbook.data('pdf');
                const isDouble = container.data('mode') === 'double';
                
                console.log('Trovato container:', {
                    pdfUrl: pdfUrl,
                    isDouble: isDouble,
                    hasContainer: container.length > 0
                });
                
                if (pdfUrl && !container.data('viewer-initialized')) {
                    container.data('viewer-initialized', true);
                    
                    setTimeout(() => {
                        try {
                            console.log('Inizializzazione viewer per:', pdfUrl);
                            window.initMenuViewer(container, pdfUrl, isDouble);
                        } catch (error) {
                            console.error('Errore inizializzazione:', error);
                            flipbook.html(`
                                <div class="loading-container">
                                    <div style="font-size: 48px; margin-bottom: 16px; color: #ef4444;">❌</div>
                                    <div class="loading-text">Errore: ${error.message}</div>
                                    <div style="margin-top: 10px; font-size: 12px; opacity: 0.7;">
                                        <a href="${pdfUrl}" target="_blank" style="color: #2563eb;">Apri PDF direttamente</a>
                                    </div>
                                </div>
                            `);
                        }
                    }, 500);
                } else if (!pdfUrl) {
                    console.warn('Nessun URL PDF trovato per il container');
                    flipbook.html(`
                        <div class="loading-container">
                            <div class="loading-text">Nessun PDF configurato</div>
                        </div>
                    `);
                }
            });
        }
        
        waitForPDFJS();
    });
    
})(jQuery);