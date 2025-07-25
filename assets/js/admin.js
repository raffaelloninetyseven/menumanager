jQuery(document).ready(function($) {
    
    // Prevent multiple initializations
    if (window.menuManagerInitialized) {
        return;
    }
    window.menuManagerInitialized = true;
    
    // Remove any existing event listeners first
    $(document).off('.menuManager');
    $('#menu-form').off('.menuManager');
    
    // Initialize color pickers
    $('.color-picker').wpColorPicker({
        change: function() {
            updatePreview();
        }
    });
    
    // Menu type toggle
    $('input[name="menu-type"]').on('change.menuManager', function() {
        if ($(this).val() === 'custom') {
            $('#custom-menu-section').slideDown();
            $('#pdf-menu-section').slideUp();
        } else {
            $('#custom-menu-section').slideUp();
            $('#pdf-menu-section').slideDown();
        }
    });
    
    // Initial toggle
    $('input[name="menu-type"]:checked').trigger('change');
    
    // Real-time preview updates
    $('#menu-content, #font-family, #font-size').on('input.menuManager change.menuManager', function() {
        updatePreview();
    });
    
    // New menu button
    $('#new-menu-btn').on('click.menuManager', function() {
        window.location.href = '?page=menu-manager&new=1';
    });
    
    // Form submission
    $('#menu-form').on('submit.menuManager', function(e) {
        e.preventDefault();
        saveMenu();
    });
    
    // PDF upload handling with single event binding
    $('#upload-pdf-btn').on('click.menuManager', function() {
        $('#pdf-upload').trigger('click');
    });
    
    $('#pdf-upload').on('change.menuManager', function() {
        if (this.files && this.files[0]) {
            handlePDFUpload(this.files[0]);
            $(this).val(''); // Clear input immediately
        }
    });
    
    // Generate PDF button
    $('#generate-pdf-btn').on('click.menuManager', function() {
        generatePDF();
    });
    
    // Delete menu buttons with event delegation
    $(document).on('click.menuManager', '.delete-menu', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        var $btn = $(this);
        if ($btn.hasClass('deleting')) return; // Prevent double clicks
        
        var menuId = $btn.data('menu-id');
        var menuName = $btn.closest('.menu-item').find('strong').text();
        
        showConfirmDialog('Sei sicuro di voler eliminare il menu "' + menuName + '"?', function() {
            deleteMenu(menuId);
        });
    });
    
    // Auto-save functionality
    var autoSaveTimer;
    $('#menu-content').on('input.menuManager', function() {
        clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(function() {
            if ($('#menu-id').val() > 0) {
                autoSaveMenu();
            }
        }, 5000);
    });
    
    // Drag and drop for PDF upload
    var $uploadArea = $('.upload-area');
    
    $uploadArea.on('dragover.menuManager dragenter.menuManager', function(e) {
        e.preventDefault();
        e.stopPropagation();
        $(this).addClass('drag-over');
    });
    
    $uploadArea.on('dragleave.menuManager', function(e) {
        e.preventDefault();
        e.stopPropagation();
        $(this).removeClass('drag-over');
    });
    
    $uploadArea.on('drop.menuManager', function(e) {
        e.preventDefault();
        e.stopPropagation();
        $(this).removeClass('drag-over');
        
        var files = e.originalEvent.dataTransfer.files;
        if (files.length > 0 && files[0].type === 'application/pdf') {
            handlePDFUpload(files[0]);
        } else {
            showNotice('Errore: Seleziona un file PDF valido', 'error');
        }
    });
    
    // Keyboard shortcuts
    $(document).on('keydown.menuManager', function(e) {
        if (e.ctrlKey || e.metaKey) {
            switch(e.which) {
                case 83: // Ctrl+S - Save
                    e.preventDefault();
                    saveMenu();
                    break;
                case 78: // Ctrl+N - New
                    e.preventDefault();
                    window.location.href = '?page=menu-manager&new=1';
                    break;
            }
        }
    });
    
    // Functions
    function saveMenu() {
        var $form = $('#menu-form');
        if ($form.hasClass('saving')) return; // Prevent double save
        
        $form.addClass('saving loading');
        
        var formData = {
            action: 'save_menu_settings',
            nonce: menuManagerAjax.nonce,
            menu_id: $('#menu-id').val(),
            name: $('#menu-name').val(),
            type: $('input[name="menu-type"]:checked').val(),
            custom_content: $('#menu-content').val(),
            settings: {
                bg_color: $('#bg-color').val(),
                text_color: $('#text-color').val(),
                font_family: $('#font-family').val(),
                font_size: $('#font-size').val()
            }
        };
        
        $.post(menuManagerAjax.ajaxurl, formData)
            .done(function(response) {
                if (response.success) {
                    showNotice('Menu salvato con successo!', 'success');
                    if ($('#menu-id').val() == 0) {
                        setTimeout(function() {
                            window.location.href = '?page=menu-manager&menu_id=' + response.data.menu_id;
                        }, 1000);
                    }
                    $('#menu-id').val(response.data.menu_id);
                    updatePreview();
                } else {
                    showNotice('Errore nel salvataggio: ' + response.data, 'error');
                }
            })
            .fail(function() {
                showNotice('Errore di connessione', 'error');
            })
            .always(function() {
                $form.removeClass('saving loading');
            });
    }
    
    function autoSaveMenu() {
        if ($('#menu-name').val().trim() === '' || $('#menu-form').hasClass('saving')) return;
        
        var formData = {
            action: 'save_menu_settings',
            nonce: menuManagerAjax.nonce,
            menu_id: $('#menu-id').val(),
            name: $('#menu-name').val(),
            type: $('input[name="menu-type"]:checked').val(),
            custom_content: $('#menu-content').val(),
            settings: {
                bg_color: $('#bg-color').val(),
                text_color: $('#text-color').val(),
                font_family: $('#font-family').val(),
                font_size: $('#font-size').val()
            }
        };
        
        $.post(menuManagerAjax.ajaxurl, formData)
            .done(function(response) {
                if (response.success) {
                    showNotice('Salvato automaticamente', 'success', 2000);
                    $('#menu-id').val(response.data.menu_id);
                }
            });
    }
    
    function handlePDFUpload(file) {
        if (!file || file.type !== 'application/pdf') {
            showNotice('Errore: Seleziona un file PDF valido', 'error');
            return;
        }
        
        if (file.size > 10 * 1024 * 1024) {
            showNotice('Errore: Il file è troppo grande (max 10MB)', 'error');
            return;
        }
        
        var $uploadArea = $('.upload-area');
        if ($uploadArea.hasClass('uploading')) return; // Prevent double upload
        
        var menuId = $('#menu-id').val();
        if (!menuId || menuId == 0) {
            showNotice('Salva prima il menu per caricare il PDF', 'error');
            return;
        }
        
        var formData = new FormData();
        formData.append('action', 'upload_pdf');
        formData.append('nonce', menuManagerAjax.nonce);
        formData.append('menu_id', menuId);
        formData.append('pdf_file', file);
        
        $uploadArea.addClass('uploading loading');
        
        $.ajax({
            url: menuManagerAjax.ajaxurl,
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function(response) {
                if (response.success) {
                    var deleteBtn = '<button type="button" class="delete-pdf-btn" data-pdf-url="' + response.data.pdf_url + '" data-menu-id="' + menuId + '">Elimina PDF</button>';
                    $('.upload-info').html('<p>PDF caricato: <a href="' + response.data.pdf_url + '" target="_blank">Visualizza</a> ' + deleteBtn + '</p>');
                    showNotice('PDF caricato con successo!', 'success');
                } else {
                    showNotice('Errore nel caricamento: ' + response.data, 'error');
                }
            },
            error: function() {
                showNotice('Errore di connessione durante il caricamento', 'error');
            },
            complete: function() {
                $uploadArea.removeClass('uploading loading');
            }
        });
    }
    
    function generatePDF() {
        var $btn = $('#generate-pdf-btn');
        if ($btn.hasClass('generating')) return; // Prevent double generation
        
        var menuId = $('#menu-id').val();
        if (!menuId || menuId == 0) {
            showNotice('Salva prima il menu per generare il PDF', 'error');
            return;
        }
        
        if ($('#menu-content').val().trim() === '') {
            showNotice('Inserisci del contenuto prima di generare il PDF', 'error');
            return;
        }
        
        $btn.addClass('generating loading').prop('disabled', true);
        
        $.post(menuManagerAjax.ajaxurl, {
            action: 'generate_pdf',
            nonce: menuManagerAjax.nonce,
            menu_id: menuId
        })
        .done(function(response) {
            if (response.success) {
                showNotice('PDF generato con successo!', 'success');
                window.open(response.data.pdf_url, '_blank');
            } else {
                showNotice('Errore nella generazione del PDF: ' + response.data, 'error');
            }
        })
        .fail(function() {
            showNotice('Errore di connessione', 'error');
        })
        .always(function() {
            $btn.removeClass('generating loading').prop('disabled', false);
        });
    }
    
    function deleteMenu(menuId) {
        $.post(menuManagerAjax.ajaxurl, {
            action: 'delete_menu',
            nonce: menuManagerAjax.nonce,
            menu_id: menuId
        })
        .done(function(response) {
            if (response.success) {
                showNotice('Menu eliminato con successo!', 'success');
                setTimeout(function() {
                    window.location.href = '?page=menu-manager';
                }, 1000);
            } else {
                showNotice('Errore nell\'eliminazione: ' + response.data, 'error');
            }
        })
        .fail(function() {
            showNotice('Errore di connessione', 'error');
        });
    }
    
    // Delete PDF button with event delegation
    $(document).on('click.menuManager', '.delete-pdf-btn', function() {
        var $btn = $(this);
        if ($btn.hasClass('deleting')) return; // Prevent double delete
        
        var pdfUrl = $btn.data('pdf-url');
        var menuId = $btn.data('menu-id');
        
        $btn.addClass('deleting');
        
        showConfirmDialog('Sei sicuro di voler eliminare questo PDF?', function() {
            deletePDF(pdfUrl, menuId);
        }, function() {
            $btn.removeClass('deleting');
        });
    });
    
    function deletePDF(pdfUrl, menuId) {
        $.post(menuManagerAjax.ajaxurl, {
            action: 'delete_pdf',
            nonce: menuManagerAjax.nonce,
            menu_id: menuId,
            pdf_url: pdfUrl
        })
        .done(function(response) {
            if (response.success) {
                $('.upload-info').html('<p>Nessun PDF caricato</p>');
                showNotice('PDF eliminato con successo!', 'success');
            } else {
                showNotice('Errore nell\'eliminazione del PDF: ' + response.data, 'error');
            }
        })
        .fail(function() {
            showNotice('Errore di connessione', 'error');
        })
        .always(function() {
            $('.delete-pdf-btn').removeClass('deleting');
        });
    }
    
    // Custom confirmation dialog
    function showConfirmDialog(message, onConfirm, onCancel) {
        // Remove existing dialogs
        $('.menu-confirm-dialog').remove();
        
        var $dialog = $('<div class="menu-confirm-dialog">' +
            '<div class="confirm-overlay"></div>' +
            '<div class="confirm-box">' +
            '<div class="confirm-content">' +
            '<div class="confirm-icon">⚠</div>' +
            '<div class="confirm-message">' + message + '</div>' +
            '<div class="confirm-buttons">' +
            '<button class="confirm-btn confirm-yes">Conferma</button>' +
            '<button class="confirm-btn confirm-no">Annulla</button>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '</div>');
        
        $('body').append($dialog);
        
        // Button handlers - use one() to prevent multiple bindings
        $dialog.find('.confirm-yes').one('click', function() {
            $dialog.remove();
            if (onConfirm) onConfirm();
        });
        
        $dialog.find('.confirm-no, .confirm-overlay').one('click', function() {
            $dialog.remove();
            if (onCancel) onCancel();
        });
        
        // ESC key
        var escHandler = function(e) {
            if (e.which === 27) { // ESC
                $dialog.remove();
                $(document).off('keydown', escHandler);
                if (onCancel) onCancel();
            }
        };
        $(document).on('keydown', escHandler);
    }
    
    function updatePreview() {
        var content = $('#menu-content').val();
        var bgColor = $('#bg-color').val();
        var textColor = $('#text-color').val();
        var fontFamily = $('#font-family').val();
        var fontSize = $('#font-size').val();
        
        if (!content || content.trim() === '') {
            $('#flipbook-preview').html('<div class="flipbook-loading">Inserisci del contenuto per vedere l\'anteprima</div>');
            return;
        }
        
        var pages = splitContentToPages(content);
        var pagesHtml = '';
        
        pages.forEach(function(pageContent, index) {
            pagesHtml += '<div class="menu-page" style="' +
                'background-color: ' + bgColor + ';' +
                'color: ' + textColor + ';' +
                'font-family: ' + fontFamily + ';' +
                'font-size: ' + fontSize + 'px;' +
                '">' +
                '<div class="page-content">' + escapeHtml(pageContent).replace(/\n/g, '<br>') + '</div>' +
                '</div>';
        });
        
        $('#flipbook-preview').html(pagesHtml);
        
        setTimeout(function() {
            var $preview = $('#flipbook-preview');
            if ($preview.turn('is')) {
                $preview.turn('destroy');
            }
            $preview.turn({
                width: $preview.width(),
                height: 400,
                elevation: 50,
                gradients: true,
                autoCenter: true,
                duration: 600
            });
        }, 100);
    }
    
    function splitContentToPages(content, charsPerPage = 1500) {
        content = content.trim();
        if (!content) return [''];
        
        var pages = [];
        var lines = content.split('\n');
        var currentPage = '';
        var currentLength = 0;
        
        lines.forEach(function(line) {
            var lineLength = line.length;
            
            if (currentLength + lineLength > charsPerPage && currentPage.trim() !== '') {
                pages.push(currentPage.trim());
                currentPage = line + '\n';
                currentLength = lineLength;
            } else {
                currentPage += line + '\n';
                currentLength += lineLength;
            }
        });
        
        if (currentPage.trim() !== '') {
            pages.push(currentPage.trim());
        }
        
        return pages.length > 0 ? pages : [''];
    }
    
    function escapeHtml(text) {
        var map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, function(m) { return map[m]; });
    }
    
    function showNotice(message, type, duration = 4000) {
        $('.menu-notice').remove();
        
        var $notice = $('<div class="menu-manager-popup notice menu-notice notice-' + type + '">' +
            '<div class="popup-content">' +
            '<span class="popup-icon">' + (type === 'success' ? '✓' : '⚠') + '</span>' +
            '<span class="popup-message">' + message + '</span>' +
            '<button class="popup-close" type="button">×</button>' +
            '</div>' +
            '</div>');
        
        $('body').append($notice);
        
        $notice.css({
            'position': 'fixed',
            'top': '20px',
            'right': '20px',
            'z-index': '999999',
            'max-width': '400px',
            'animation': 'slideInRight 0.3s ease'
        });
        
        $notice.find('.popup-close').one('click', function() {
            $notice.fadeOut(function() {
                $(this).remove();
            });
        });
        
        setTimeout(function() {
            $notice.fadeOut(function() {
                $(this).remove();
            });
        }, duration);
    }
    
    // Load existing menu data if editing
    var currentMenuId = $('#menu-id').val();
    if (currentMenuId > 0) {
        loadMenuSettings(currentMenuId);
    }
    
    function loadMenuSettings(menuId) {
        var currentMenu = window.menuManagerData;
        if (currentMenu && currentMenu.settings) {
            var settings = JSON.parse(currentMenu.settings);
            $('#bg-color').val(settings.bg_color || '#ffffff').trigger('change');
            $('#text-color').val(settings.text_color || '#333333').trigger('change');
            $('#font-family').val(settings.font_family || 'Arial');
            $('#font-size').val(settings.font_size || 14);
            
            $('#bg-color').wpColorPicker('color', settings.bg_color || '#ffffff');
            $('#text-color').wpColorPicker('color', settings.text_color || '#333333');
            
            setTimeout(updatePreview, 500);
        }
    }
    
    // Initial preview update
    if ($('#menu-content').val().trim() !== '') {
        setTimeout(updatePreview, 1000);
    }
});