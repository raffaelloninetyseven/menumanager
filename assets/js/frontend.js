// Assicuriamoci che le funzioni siano disponibili globalmente
(function($) {
    
    // Configurazione PDF.js non appena il script è caricato
    function initPDFJS() {
        if (typeof pdfjsLib !== 'undefined' && !window.pdfJSConfigured) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';
            window.pdfJSConfigured = true;
        }
    }
    
    // Prova a configurare immediatamente o aspetta il caricamento
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPDFJS);
    } else {
        initPDFJS();
    }
    
    // Variabili globali per il controllo
    let currentPage = 1;
    let totalPages = 1;
    let pdfPages = [];
    let zoomLevel = 1;
    let isDragging = false;
    let startX, startY, scrollLeft, scrollTop;
    let currentContainer = null;
    
    // Funzione globale per caricare PDF (disponibile per i widget)
    window.loadMenuPDF = function(pdfUrl, container) {
        const loadingEl = container.find('.loading-spinner');
        loadingEl.text('Caricamento PDF...');
        
        if (typeof pdfjsLib === 'undefined') {
            loadingEl.text('Errore: PDF.js non disponibile');
            return;
        }
        
        // Assicurati che il worker sia configurato
        if (!window.pdfJSConfigured) {
            initPDFJS();
        }
        
        pdfjsLib.getDocument(pdfUrl).promise.then(function(pdf) {
            totalPages = pdf.numPages;
            updatePageInfo(container);
            
            const promises = [];
            for (let i = 1; i <= totalPages; i++) {
                promises.push(renderPage(pdf, i));
            }
            
            Promise.all(promises).then(function(pages) {
                pdfPages = pages;
                initializeFlipbook(container);
                loadingEl.hide();
            });
        }).catch(function(error) {
            console.error('Errore nel caricamento PDF:', error);
            loadingEl.text('Errore nel caricamento del menu: ' + error.message);
        });
    };
    
    function renderPage(pdf, pageNum) {
        return pdf.getPage(pageNum).then(function(page) {
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            return page.render({
                canvasContext: context,
                viewport: viewport
            }).promise.then(function() {
                return canvas.toDataURL();
            });
        });
    }
    
    function initializeFlipbook(container) {
        const flipbook = container.find('.menu-flipbook-container');
        flipbook.empty();
        
        // Crea un contenitore per le pagine
        const pagesContainer = $('<div class="pages-container"></div>');
        flipbook.append(pagesContainer);
        
        for (let i = 0; i < totalPages; i++) {
            const pageDiv = $('<div class="menu-page" data-page="' + (i + 1) + '"></div>');
            pageDiv.css({
                'background-image': 'url(' + pdfPages[i] + ')',
                'background-size': 'contain',
                'background-repeat': 'no-repeat',
                'background-position': 'center',
                'width': '100%',
                'height': '100%',
                'position': 'absolute',
                'top': '0',
                'left': '0',
                'display': i === 0 ? 'block' : 'none'
            });
            pagesContainer.append(pageDiv);
        }
        
        currentPage = 1;
        currentContainer = container;
        updatePageInfo(container);
        setupZoomAndPan(container);
        bindControls(container);
    }
    
    function setupZoomAndPan(container) {
        const pagesContainer = container.find('.pages-container');
        
        pagesContainer.on('mousedown', function(e) {
            if (zoomLevel > 1) {
                isDragging = true;
                startX = e.pageX;
                startY = e.pageY;
                scrollLeft = pagesContainer.scrollLeft();
                scrollTop = pagesContainer.scrollTop();
                pagesContainer.css('cursor', 'grabbing');
            }
        });
        
        $(document).on('mousemove', function(e) {
            if (!isDragging) return;
            e.preventDefault();
            const x = e.pageX;
            const y = e.pageY;
            const walkX = (x - startX) * 2;
            const walkY = (y - startY) * 2;
            pagesContainer.scrollLeft(scrollLeft - walkX);
            pagesContainer.scrollTop(scrollTop - walkY);
        });
        
        $(document).on('mouseup', function() {
            if (isDragging) {
                isDragging = false;
                container.find('.pages-container').css('cursor', zoomLevel > 1 ? 'grab' : 'default');
            }
        });
        
        pagesContainer.on('wheel', function(e) {
            e.preventDefault();
            if (e.originalEvent.deltaY < 0) {
                zoomIn(container);
            } else {
                zoomOut(container);
            }
        });
    }
    
    function bindControls(container) {
        container.find('.prev-page').off('click').on('click', function() {
            if (currentPage > 1) {
                goToPage(currentPage - 1, container);
            }
        });
        
        container.find('.next-page').off('click').on('click', function() {
            if (currentPage < totalPages) {
                goToPage(currentPage + 1, container);
            }
        });
        
        container.find('.zoom-in').off('click').on('click', function() {
            zoomIn(container);
        });
        
        container.find('.zoom-out').off('click').on('click', function() {
            zoomOut(container);
        });
        
        container.find('.fullscreen').off('click').on('click', function() {
            toggleFullscreen(container);
        });
    }
    
    function updatePageInfo(container) {
        container.find('.current-page').text(currentPage);
        container.find('.total-pages').text(totalPages);
        
        container.find('.prev-page').prop('disabled', currentPage <= 1);
        container.find('.next-page').prop('disabled', currentPage >= totalPages);
    }
    
    function zoomIn(container) {
        if (zoomLevel < 3) {
            zoomLevel += 0.2;
            applyZoom(container);
        }
    }
    
    function zoomOut(container) {
        if (zoomLevel > 0.5) {
            zoomLevel -= 0.2;
            applyZoom(container);
        }
    }
    
    function applyZoom(container) {
        container.find('.menu-page').css('transform', 'scale(' + zoomLevel + ')');
        container.find('.pages-container').css('cursor', zoomLevel > 1 ? 'grab' : 'default');
    }
    
    function goToPage(pageNum, container) {
        if (pageNum < 1 || pageNum > totalPages) return;
        
        container.find('.menu-page').hide();
        container.find('.menu-page[data-page="' + pageNum + '"]').show();
        
        currentPage = pageNum;
        updatePageInfo(container);
    }
    
    function toggleFullscreen(container) {
        const element = container.get(0);
        
        if (!document.fullscreenElement) {
            if (element.requestFullscreen) {
                element.requestFullscreen().catch(err => {
                    console.log('Fullscreen non supportato:', err);
                });
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }
    
    // Inizializzazione quando il DOM è pronto
    $(document).ready(function() {
        
        // Inizializza tutti i container flipbook esistenti
        $('.menu-viewer-container[data-mode="flipbook"]').each(function() {
            const container = $(this);
            const flipbook = container.find('.menu-flipbook-container');
            const pdfUrl = flipbook.data('pdf');
            
            if (pdfUrl && typeof window.loadMenuPDF === 'function') {
                window.loadMenuPDF(pdfUrl, container);
            }
        });
        
        // Controlli da tastiera
        $(document).on('keydown', function(e) {
            if (!currentContainer) return;
            
            switch(e.keyCode) {
                case 37: // Freccia sinistra
                    currentContainer.find('.prev-page').click();
                    break;
                case 39: // Freccia destra
                    currentContainer.find('.next-page').click();
                    break;
                case 187: // +
                    if (e.ctrlKey) {
                        e.preventDefault();
                        zoomIn(currentContainer);
                    }
                    break;
                case 189: // -
                    if (e.ctrlKey) {
                        e.preventDefault();
                        zoomOut(currentContainer);
                    }
                    break;
                case 70: // F
                    if (e.ctrlKey) {
                        e.preventDefault();
                        toggleFullscreen(currentContainer);
                    }
                    break;
            }
        });
        
        // Gestione resize finestra
        $(window).on('resize', function() {
            if (currentContainer) {
                applyZoom(currentContainer);
            }
        });
    });
    
})(jQuery);