jQuery(document).ready(function($) {
    
    let currentMenuId = null;
    
    $('#add-new-menu').on('click', function() {
        resetForm();
        $('#modal-title').text('Aggiungi Nuovo Menu');
        $('#menu-modal').show();
    });
    
    $('.edit-menu').on('click', function() {
        const menuId = $(this).data('menu-id');
        loadMenuData(menuId);
        $('#modal-title').text('Modifica Menu');
        $('#menu-modal').show();
    });
    
    $('.delete-menu').on('click', function() {
        const menuId = $(this).data('menu-id');
        
        if (confirm('Sei sicuro di voler eliminare questo menu?')) {
            deleteMenu(menuId);
        }
    });
    
    $('.close, #cancel-btn').on('click', function() {
        $('#menu-modal').hide();
        resetForm();
    });
    
    $(window).on('click', function(e) {
        if ($(e.target).hasClass('menu-modal')) {
            $('#menu-modal').hide();
            resetForm();
        }
    });
    
    $('#upload-btn').on('click', function() {
        $('#pdf-upload').click();
    });
    
    $('#pdf-upload').on('change', function() {
        const file = this.files[0];
        
        if (file && file.type === 'application/pdf') {
            uploadPDF(file);
        } else {
            showUploadStatus('Seleziona un file PDF valido', 'error');
        }
    });
    
    // Drag and drop per upload
    $('.upload-area').on('dragover dragenter', function(e) {
        e.preventDefault();
        e.stopPropagation();
        $(this).addClass('dragover');
    });
    
    $('.upload-area').on('dragleave drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        $(this).removeClass('dragover');
        
        if (e.type === 'drop') {
            const files = e.originalEvent.dataTransfer.files;
            if (files.length > 0 && files[0].type === 'application/pdf') {
                uploadPDF(files[0]);
            } else {
                showUploadStatus('Seleziona un file PDF valido', 'error');
            }
        }
    });
    
    $('#menu-form').on('submit', function(e) {
        e.preventDefault();
        saveMenu();
    });
    
    function resetForm() {
        $('#menu-form')[0].reset();
        $('#menu-id').val('');
        $('#pdf-url').val('');
        $('#upload-status').html('');
        $('input[name="user_roles[]"]').prop('checked', false);
        currentMenuId = null;
    }
    
    function uploadPDF(file) {
        const formData = new FormData();
        formData.append('pdf_file', file);
        formData.append('action', 'upload_menu');
        formData.append('nonce', menuManagerAdmin.nonce);
        
        showUploadStatus('<div class="spinner"></div> Caricamento in corso...', 'loading');
        $('#upload-btn').prop('disabled', true);
        
        $.ajax({
            url: menuManagerAdmin.ajax_url,
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function(response) {
                if (response.success) {
                    $('#pdf-url').val(response.data.url);
                    showUploadStatus('✓ PDF caricato con successo', 'success');
                } else {
                    showUploadStatus('✗ ' + response.data, 'error');
                }
            },
            error: function() {
                showUploadStatus('✗ Errore nel caricamento', 'error');
            },
            complete: function() {
                $('#upload-btn').prop('disabled', false);
            }
        });
    }
    
    function showUploadStatus(message, type) {
        const statusEl = $('#upload-status');
        statusEl.html(message);
        statusEl.removeClass('success error loading').addClass(type);
    }
    
    function saveMenu() {
        const formData = $('#menu-form').serialize();
        const actionData = formData + '&action=save_menu_config&nonce=' + menuManagerAdmin.nonce;
        
        if (!$('#pdf-url').val()) {
            alert('Carica un file PDF prima di salvare');
            return;
        }
        
        $('#save-btn').prop('disabled', true).text('Salvataggio...');
        
        $.ajax({
            url: menuManagerAdmin.ajax_url,
            type: 'POST',
            data: actionData,
            success: function(response) {
                if (response.success) {
                    alert('Menu salvato con successo!');
                    location.reload();
                } else {
                    alert('Errore: ' + response.data);
                }
            },
            error: function() {
                alert('Errore nel salvare il menu');
            },
            complete: function() {
                $('#save-btn').prop('disabled', false).text('Salva Menu');
            }
        });
    }
    
    function loadMenuData(menuId) {
        currentMenuId = menuId;
        
        $.ajax({
            url: menuManagerAdmin.ajax_url,
            type: 'POST',
            data: {
                action: 'get_menu_data',
                menu_id: menuId,
                nonce: menuManagerAdmin.nonce
            },
            success: function(response) {
                if (response.success) {
                    const menu = response.data;
                    
                    $('#menu-id').val(menu.id);
                    $('#menu-name').val(menu.name);
                    $('#pdf-url').val(menu.pdf_url);
                    
                    if (menu.start_date) {
                        const startDate = new Date(menu.start_date);
                        const startISO = startDate.toISOString().slice(0, 16);
                        $('#start-date').val(startISO);
                    }
                    
                    if (menu.end_date) {
                        const endDate = new Date(menu.end_date);
                        const endISO = endDate.toISOString().slice(0, 16);
                        $('#end-date').val(endISO);
                    }
                    
                    $('#is-active').prop('checked', menu.is_active == 1);
                    
                    if (menu.user_roles) {
                        const roles = menu.user_roles.split(',');
                        roles.forEach(function(role) {
                            $(`input[name="user_roles[]"][value="${role.trim()}"]`).prop('checked', true);
                        });
                    }
                    
                    if (menu.pdf_url) {
                        showUploadStatus('✓ PDF già caricato', 'success');
                    }
                } else {
                    alert('Errore nel caricare i dati del menu');
                }
            },
            error: function() {
                alert('Errore nel caricare i dati del menu');
            }
        });
    }
    
    function deleteMenu(menuId) {
        $.ajax({
            url: menuManagerAdmin.ajax_url,
            type: 'POST',
            data: {
                action: 'delete_menu',
                menu_id: menuId,
                nonce: menuManagerAdmin.nonce
            },
            success: function(response) {
                if (response.success) {
                    $(`tr[data-menu-id="${menuId}"]`).fadeOut(function() {
                        $(this).remove();
                    });
                    alert('Menu eliminato con successo');
                } else {
                    alert('Errore nell\'eliminare il menu');
                }
            },
            error: function() {
                alert('Errore nell\'eliminare il menu');
            }
        });
    }
    
    // Validazione in tempo reale
    $('#menu-name').on('input', function() {
        const name = $(this).val().trim();
        if (name.length < 3) {
            $(this).css('border-color', '#dc3545');
        } else {
            $(this).css('border-color', '#28a745');
        }
    });
    
    $('#start-date, #end-date').on('change', function() {
        const startDate = new Date($('#start-date').val());
        const endDate = new Date($('#end-date').val());
        
        if (startDate && endDate && startDate >= endDate) {
            alert('La data di fine deve essere successiva alla data di inizio');
            $('#end-date').val('');
        }
    });
});