(function($) {
    'use strict';
    
    function initPDFJS() {
        if (typeof pdfjsLib !== 'undefined' && !window.pdfJSConfigured) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';
            window.pdfJSConfigured = true;
        }
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPDFJS);
    } else {
        initPDFJS();
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
            
            this.init();
        }
        
        async init() {
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
                this.showError('Errore nel caricamento: ' + error.message);
            }
        }
        
        async loadPDF() {
            if (typeof pdfjsLib === 'undefined') {
                throw new Error('PDF.js non disponibile');
            }
            
            if (!window.pdfJSConfigured) {
                initPDFJS();
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
                throw new Error('Impossibile caricare il PDF: ' + error.message);
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
            // Non rimuovere il loading qui, verrà rimosso da renderCurrentPages
        }
        
        async preloadPages() {
            const promises = [];
            for (let i = 1; i <= this.totalPages; i++) {
                promises.push(this.loadAndRenderPage(i));
            }
            await Promise.all(promises);
        }
        
        async loadAndRenderPage(pageNum) {
            try {
                const page = await this.pdf.getPage(pageNum);
                this.pages[pageNum] = page;
                
                const canvas = await this.renderPageToCanvas(page);
                this.canvases[pageNum] = canvas;
            } catch (error) {
                console.error(`Errore caricamento pagina ${pageNum}:`, error);
            }
        }
        
        async renderPageToCanvas(page) {
            const scale = 1.5;
            const viewport = page.getViewport({ scale });
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;
            
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
                'object-fit': 'contain'
            });
            
            pageDiv.append(canvasClone);
            this.container.find('.pages-container').append(pageDiv);
        }
        
        renderDoublePages() {
            const pagesContainer = this.container.find('.pages-container');
            
            // Pagina sinistra
            if (this.currentPage > 1) {
                const leftCanvas = this.canvases[this.currentPage - 1];
                if (leftCanvas) {
                    const leftDiv = $('<div class="menu-page double-left"></div>');
                    const leftClone = leftCanvas.cloneNode(true);
                    $(leftClone).css({
                        'width': '100%',
                        'height': '100%',
                        'object-fit': 'contain'
                    });
                    leftDiv.append(leftClone);
                    pagesContainer.append(leftDiv);
                }
            }
            
            // Pagina destra
            const rightCanvas = this.canvases[this.currentPage];
            if (rightCanvas) {
                const rightDiv = $('<div class="menu-page double-right"></div>');
                const rightClone = rightCanvas.cloneNode(true);
                $(rightClone).css({
                    'width': '100%',
                    'height': '100%',
                    'object-fit': 'contain'
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
            
            // Aggiorna slider
            const maxSlider = this.isDouble ? Math.ceil(this.totalPages / 2) : this.totalPages;
            const sliderValue = this.isDouble ? Math.ceil(this.currentPage / 2) : this.currentPage;
            
            slider.attr('max', maxSlider).val(sliderValue);
            
            // Aggiorna progress bar
            const progressPercent = maxSlider > 1 ? ((sliderValue - 1) / (maxSlider - 1)) * 100 : 0;
            progress.css('width', progressPercent + '%');
            
            // Aggiorna pulsanti
            if (this.isDouble) {
                prevBtn.prop('disabled', this.currentPage <= 2);
                nextBtn.prop('disabled', this.currentPage >= this.totalPages);
            } else {
                prevBtn.prop('disabled', this.currentPage <= 1);
                nextBtn.prop('disabled', this.currentPage >= this.totalPages);
            }
        }
        
        bindEvents() {
            // Pulsanti navigazione
            this.container.find('.prev-page').off('click').on('click', () => {
                this.goToPreviousPage();
            });
            
            this.container.find('.next-page').off('click').on('click', () => {
                this.goToNextPage();
            });
            
            // Slider
            this.container.find('.page-slider').off('input change').on('input change', (e) => {
                const value = parseInt($(e.target).val());
                let targetPage;
                
                if (this.isDouble) {
                    targetPage = (value - 1) * 2 + 2; // Pagina destra
                    if (targetPage > this.totalPages) {
                        targetPage = this.totalPages;
                    }
                } else {
                    targetPage = value;
                }
                
                this.goToPage(targetPage);
            });
            
            // Touch/swipe support
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
                    
                    // Solo se lo swipe orizzontale è predominante
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
                </div>
            `);
        }
        
        destroy() {
            this.container.find('.prev-page, .next-page, .page-slider').off();
            this.container.find('.pages-container').off();
        }
    }
    
    // Funzione globale per inizializzare il viewer
    window.initMenuViewer = function(container, pdfUrl, isDouble = false) {
        const viewerId = container.attr('id') || 'viewer_' + Date.now();
        
        // Rimuovi viewer esistente
        if (viewers.has(viewerId)) {
            viewers.get(viewerId).destroy();
            viewers.delete(viewerId);
        }
        
        const viewer = new MenuViewer(container, pdfUrl, isDouble);
        viewers.set(viewerId, viewer);
        
        return viewer;
    };
    
    // Controlli da tastiera globali
    $(document).on('keydown', function(e) {
        const activeContainer = $('.menu-viewer-container:visible').first();
        if (!activeContainer.length) return;
        
        const viewerId = activeContainer.attr('id') || 'viewer_' + Date.now();
        const activeViewer = viewers.get(viewerId);
        if (!activeViewer) return;
        
        switch(e.keyCode) {
            case 37: // Freccia sinistra
                e.preventDefault();
                activeViewer.goToPreviousPage();
                break;
            case 39: // Freccia destra
                e.preventDefault();
                activeViewer.goToNextPage();
                break;
            case 32: // Spazio
                e.preventDefault();
                activeViewer.goToNextPage();
                break;
        }
    });
    
    // Auto-inizializzazione per widget esistenti
    $(document).ready(function() {
        // Aspetta che PDF.js sia completamente caricato
        function checkAndInit() {
            if (typeof pdfjsLib === 'undefined') {
                setTimeout(checkAndInit, 100);
                return;
            }
            
            $('.menu-viewer-container[data-mode="single"], .menu-viewer-container[data-mode="double"]').each(function() {
                const container = $(this);
                const flipbook = container.find('.menu-flipbook-container');
                const pdfUrl = flipbook.data('pdf');
                const isDouble = container.data('mode') === 'double';
                
                if (pdfUrl) {
                    console.log('Inizializzazione viewer:', {
                        pdfUrl: pdfUrl,
                        isDouble: isDouble,
                        container: container.length
                    });
                    
                    try {
                        window.initMenuViewer(container, pdfUrl, isDouble);
                    } catch (error) {
                        console.error('Errore inizializzazione viewer:', error);
                        
                        // Fallback: mostra errore
                        flipbook.html(`
                            <div class="loading-container">
                                <div style="font-size: 48px; margin-bottom: 16px; color: #ef4444;">❌</div>
                                <div class="loading-text">Errore: ${error.message}</div>
                                <div style="margin-top: 10px; font-size: 12px; opacity: 0.7;">
                                    <a href="${pdfUrl}" target="_blank">Apri PDF direttamente</a>
                                </div>
                            </div>
                        `);
                    }
                }
            });
        }
        
        checkAndInit();
    });
    
})(jQuery);