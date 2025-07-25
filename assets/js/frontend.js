jQuery(document).ready(function($) {
    
    // Initialize all flipbooks on the page
    $('.menu-flipbook').each(function() {
        var $flipbook = $(this);
        var flipbookId = $flipbook.attr('id');
        
        if (!flipbookId) {
            flipbookId = 'flipbook-' + Math.random().toString(36).substr(2, 9);
            $flipbook.attr('id', flipbookId);
        }
        
        // Initialize Turn.js
        $flipbook.turn({
            width: $flipbook.parent().width(),
            height: $flipbook.height(),
            elevation: 50,
            gradients: true,
            autoCenter: true,
            duration: 1000,
            pages: $flipbook.children('.menu-page').length,
            when: {
                turning: function(event, page, view) {
                    // Page turning event
                },
                turned: function(event, page, view) {
                    // Page turned event
                }
            }
        });
        
        // Add navigation controls
        if ($flipbook.children('.menu-page').length > 1) {
            addNavigationControls($flipbook);
        }
        
        // Make responsive
        makeResponsive($flipbook);
    });
    
    // Handle window resize
    $(window).resize(function() {
        $('.menu-flipbook').each(function() {
            makeResponsive($(this));
        });
    });
    
    function addNavigationControls($flipbook) {
        var $container = $flipbook.parent();
        
        // Add navigation buttons
        var $navContainer = $('<div class="flipbook-navigation"></div>');
        var $prevBtn = $('<button class="flipbook-btn flipbook-prev" title="Pagina precedente">‹</button>');
        var $nextBtn = $('<button class="flipbook-btn flipbook-next" title="Pagina successiva">›</button>');
        var $pageInfo = $('<span class="flipbook-page-info"></span>');
        
        $navContainer.append($prevBtn, $pageInfo, $nextBtn);
        $container.append($navContainer);
        
        // Update page info
        function updatePageInfo() {
            var currentPage = $flipbook.turn('page');
            var totalPages = $flipbook.turn('pages');
            $pageInfo.text(currentPage + ' / ' + totalPages);
            
            $prevBtn.prop('disabled', currentPage <= 1);
            $nextBtn.prop('disabled', currentPage >= totalPages);
        }
        
        // Event handlers
        $prevBtn.click(function() {
            $flipbook.turn('previous');
        });
        
        $nextBtn.click(function() {
            $flipbook.turn('next');
        });
        
        // Update on page turn
        $flipbook.bind('turned', function() {
            updatePageInfo();
        });
        
        // Initial update
        updatePageInfo();
    }
    
    function makeResponsive($flipbook) {
        var $container = $flipbook.parent();
        var containerWidth = $container.width();
        var containerHeight = $flipbook.data('original-height') || $flipbook.height();
        
        // Store original height if not stored
        if (!$flipbook.data('original-height')) {
            $flipbook.data('original-height', containerHeight);
        }
        
        // Calculate new dimensions maintaining aspect ratio
        var aspectRatio = containerHeight / containerWidth;
        var newWidth = Math.min(containerWidth, 800);
        var newHeight = newWidth * aspectRatio;
        
        // Update flipbook size
        if ($flipbook.turn('is')) {
            $flipbook.turn('size', newWidth, newHeight);
        }
    }
    
    // Add keyboard navigation
    $(document).keydown(function(e) {
        if ($('.menu-flipbook:visible').length > 0) {
            var $activeFlipbook = $('.menu-flipbook:visible').first();
            
            switch(e.which) {
                case 37: // Left arrow
                    e.preventDefault();
                    $activeFlipbook.turn('previous');
                    break;
                case 39: // Right arrow
                    e.preventDefault();
                    $activeFlipbook.turn('next');
                    break;
            }
        }
    });
    
    // Add touch/swipe support for mobile
    if ('ontouchstart' in window) {
        $('.menu-flipbook').each(function() {
            var $flipbook = $(this);
            var startX = 0;
            var startY = 0;
            
            $flipbook.on('touchstart', function(e) {
                startX = e.originalEvent.touches[0].clientX;
                startY = e.originalEvent.touches[0].clientY;
            });
            
            $flipbook.on('touchend', function(e) {
                var endX = e.originalEvent.changedTouches[0].clientX;
                var endY = e.originalEvent.changedTouches[0].clientY;
                
                var deltaX = endX - startX;
                var deltaY = endY - startY;
                
                // Check if horizontal swipe
                if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
                    if (deltaX > 0) {
                        // Swipe right - previous page
                        $flipbook.turn('previous');
                    } else {
                        // Swipe left - next page
                        $flipbook.turn('next');
                    }
                }
            });
        });
    }
    
    // Add fullscreen functionality
    function addFullscreenButton($flipbook) {
        var $container = $flipbook.parent();
        var $fullscreenBtn = $('<button class="flipbook-fullscreen" title="Schermo intero">⛶</button>');
        
        $container.append($fullscreenBtn);
        
        $fullscreenBtn.click(function() {
            toggleFullscreen($container[0]);
        });
    }
    
    function toggleFullscreen(element) {
        if (!document.fullscreenElement) {
            element.requestFullscreen().catch(err => {
                // Fullscreen error handled silently
            });
        } else {
            document.exitFullscreen();
        }
    }
    
    // Add fullscreen buttons to all flipbooks
    $('.menu-flipbook').each(function() {
        if (document.fullscreenEnabled) {
            addFullscreenButton($(this));
        }
    });
    
    // Handle fullscreen changes
    document.addEventListener('fullscreenchange', function() {
        $('.menu-flipbook').each(function() {
            makeResponsive($(this));
        });
    });
});