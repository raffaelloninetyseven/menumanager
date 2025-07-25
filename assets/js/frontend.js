jQuery(document).ready(function($) {
    
    let currentPage = 1;
    let totalPages = 1;
    let pdfPages = [];
    let zoomLevel = 1;
    let isDragging = false;
    let startX, startY, scrollLeft, scrollTop;
    
    $('.menu-viewer-container[data-mode="flipbook"]').each(function() {
        const container = $(this);
        const flipbook = container.find('#menu-flipbook');
        const pdfUrl = flipbook.data('pdf');
        
        if (pdfUrl) {
            loadPDF(pdfUrl, container);
        }
    });
    
    function loadPDF(pdfUrl, container) {
        const loadingEl = container.find('.loading-spinner');
        loadingEl.text('Caricamento PDF...');
        
        pdfjsLib.getDocument(pdfUrl).promise.then(function(pdf) {
            totalPages = pdf.numPages;
            updatePageInfo();
            
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
            loadingEl.text('Errore nel caricamento del menu');
        });
    }
    
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
        const flipbook = container.find('#menu-flipbook');
        flipbook.empty();
        
        for (let i = 0; i < Math.ceil(totalPages / 2); i++) {
            const pageDiv = $('<div class="flipbook-page"></div>');
            
            if (pdfPages[i * 2]) {
                const leftPage = $('<div class="page-content"></div>');
                leftPage.css('background-image', `url(${pdfPages[i * 2]})`);
                pageDiv.append(leftPage);
            }
            
            if (pdfPages[i * 2 + 1]) {
                const rightPage = $('<div class="page-content"></div>');
                rightPage.css('background-image', `url(${pdfPages[i * 2 + 1]})`);
                pageDiv.append(rightPage);
            }
            
            flipbook.append(pageDiv);
        }
        
        if (typeof $.fn.turn !== 'undefined') {
            flipbook.turn({
                width: flipbook.width(),
                height: flipbook.height(),
                autoCenter: true,
                gradients: true,
                elevation: 50
            });
            
            flipbook.bind('turned', function(event, page) {
                currentPage = page;
                updatePageInfo();
            });
        } else {
            showSimplePages(flipbook);
        }
        
        setupZoomAndPan(flipbook);
    }
    
    function showSimplePages(flipbook) {
        flipbook.find('.flipbook-page').hide();
        flipbook.find('.flipbook-page').eq(0).show();
        
        currentPage = 1;
        updatePageInfo();
    }
    
    function setupZoomAndPan(flipbook) {
        const page = flipbook.find('.page-content').first();
        
        page.on('mousedown', function(e) {
            if (zoomLevel > 1) {
                isDragging = true;
                startX = e.pageX - page.offset().left;
                startY = e.pageY - page.offset().top;
                scrollLeft = page.scrollLeft();
                scrollTop = page.scrollTop();
            }
        });
        
        $(document).on('mousemove', function(e) {
            if (!isDragging) return;
            e.preventDefault();
            const x = e.pageX - page.offset().left;
            const y = e.pageY - page.offset().top;
            const walkX = (x - startX) * 2;
            const walkY = (y - startY) * 2;
            page.scrollLeft(scrollLeft - walkX);
            page.scrollTop(scrollTop - walkY);
        });
        
        $(document).on('mouseup', function() {
            isDragging = false;
        });
        
        page.on('wheel', function(e) {
            e.preventDefault();
            if (e.originalEvent.deltaY < 0) {
                zoomIn();
            } else {
                zoomOut();
            }
        });
    }
    
    function updatePageInfo() {
        $('#current-page').text(currentPage);
        $('#total-pages').text(Math.ceil(totalPages / 2));
        
        $('#prev-page').prop('disabled', currentPage <= 1);
        $('#next-page').prop('disabled', currentPage >= Math.ceil(totalPages / 2));
    }
    
    function zoomIn() {
        if (zoomLevel < 3) {
            zoomLevel += 0.2;
            applyZoom();
        }
    }
    
    function zoomOut() {
        if (zoomLevel > 0.5) {
            zoomLevel -= 0.2;
            applyZoom();
        }
    }
    
    function applyZoom() {
        $('.page-content').css('transform', `scale(${zoomLevel})`);
        $('.page-content').toggleClass('zoomed', zoomLevel > 1);
    }
    
    function goToPage(pageNum) {
        const flipbook = $('#menu-flipbook');
        
        if (typeof flipbook.turn === 'function') {
            flipbook.turn('page', pageNum);
        } else {
            flipbook.find('.flipbook-page').hide();
            flipbook.find('.flipbook-page').eq(pageNum - 1).show();
            currentPage = pageNum;
            updatePageInfo();
        }
    }
    
    function toggleFullscreen() {
        const container = $('.menu-viewer-container').get(0);
        
        if (!document.fullscreenElement) {
            container.requestFullscreen().catch(err => {
                console.log('Fullscreen non supportato:', err);
            });
        } else {
            document.exitFullscreen();
        }
    }
    
    $('#prev-page').on('click', function() {
        if (currentPage > 1) {
            goToPage(currentPage - 1);
        }
    });
    
    $('#next-page').on('click', function() {
        if (currentPage < Math.ceil(totalPages / 2)) {
            goToPage(currentPage + 1);
        }
    });
    
    $('#zoom-in').on('click', zoomIn);
    $('#zoom-out').on('click', zoomOut);
    $('#fullscreen').on('click', toggleFullscreen);
    
    $(document).on('keydown', function(e) {
        switch(e.keyCode) {
            case 37: // Freccia sinistra
                $('#prev-page').click();
                break;
            case 39: // Freccia destra
                $('#next-page').click();
                break;
            case 187: // +
                if (e.ctrlKey) {
                    e.preventDefault();
                    zoomIn();
                }
                break;
            case 189: // -
                if (e.ctrlKey) {
                    e.preventDefault();
                    zoomOut();
                }
                break;
            case 70: // F
                if (e.ctrlKey) {
                    e.preventDefault();
                    toggleFullscreen();
                }
                break;
        }
    });
    
    $(window).on('resize', function() {
        if ($('#menu-flipbook').data('turn')) {
            $('#menu-flipbook').turn('resize');
        }
    });
});