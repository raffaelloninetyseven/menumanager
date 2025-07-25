<?php
if (!defined('ABSPATH')) {
    exit;
}

$menus = MenuManager::get_menus();
$current_menu = null;
$menu_id = isset($_GET['menu_id']) ? intval($_GET['menu_id']) : 0;

if ($menu_id > 0) {
    $current_menu = MenuManager::get_menu($menu_id);
}
?>

<div class="wrap">
    <h1>Menu Manager</h1>
    
    <div class="menu-manager-container">
        <div class="menu-list">
            <h2>Menu Esistenti</h2>
            <button class="button button-primary" id="new-menu-btn">Nuovo Menu</button>
            
            <div class="menu-items">
                <?php foreach ($menus as $menu): ?>
                    <div class="menu-item <?php echo $menu_id == $menu->id ? 'active' : ''; ?>">
                        <a href="?page=menu-manager&menu_id=<?php echo $menu->id; ?>">
                            <strong><?php echo esc_html($menu->name); ?></strong>
                            <span class="menu-type"><?php echo $menu->type == 'pdf' ? 'PDF Caricato' : 'Personalizzato'; ?></span>
                            <span class="menu-date"><?php echo date('d/m/Y H:i', strtotime($menu->updated_at)); ?></span>
                        </a>
                        <button class="delete-menu" data-menu-id="<?php echo $menu->id; ?>">×</button>
                    </div>
                <?php endforeach; ?>
            </div>
        </div>
        
        <div class="menu-editor">
            <?php if ($current_menu || isset($_GET['new'])): ?>
                <form id="menu-form">
                    <input type="hidden" id="menu-id" value="<?php echo $current_menu ? $current_menu->id : 0; ?>">
                    
                    <div class="form-group">
                        <label for="menu-name">Nome Menu:</label>
                        <input type="text" id="menu-name" value="<?php echo $current_menu ? esc_attr($current_menu->name) : ''; ?>" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Tipo di Menu:</label>
                        <div class="radio-group">
                            <label>
                                <input type="radio" name="menu-type" value="custom" <?php echo !$current_menu || $current_menu->type == 'custom' ? 'checked' : ''; ?>>
                                Menu Personalizzato
                            </label>
                            <label>
                                <input type="radio" name="menu-type" value="pdf" <?php echo $current_menu && $current_menu->type == 'pdf' ? 'checked' : ''; ?>>
                                Carica PDF
                            </label>
                        </div>
                    </div>
                    
                    <div id="custom-menu-section" class="menu-section">
                        <h3>Impostazioni Menu Personalizzato</h3>
                        
                        <div class="settings-grid">
                            <div class="form-group">
                                <label for="bg-color">Colore Sfondo:</label>
                                <input type="text" id="bg-color" class="color-picker" value="#ffffff">
                            </div>
                            
                            <div class="form-group">
                                <label for="text-color">Colore Testo:</label>
                                <input type="text" id="text-color" class="color-picker" value="#333333">
                            </div>
                            
                            <div class="form-group">
                                <label for="font-family">Font:</label>
                                <select id="font-family">
                                    <option value="Arial">Arial</option>
                                    <option value="Times New Roman">Times New Roman</option>
                                    <option value="Georgia">Georgia</option>
                                    <option value="Helvetica">Helvetica</option>
                                    <option value="Verdana">Verdana</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label for="font-size">Dimensione Font:</label>
                                <input type="number" id="font-size" value="14" min="8" max="72">
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="menu-content">Contenuto Menu:</label>
                            <textarea id="menu-content" rows="20" placeholder="Inserisci il contenuto del menu qui..."><?php echo $current_menu ? esc_textarea($current_menu->custom_content) : ''; ?></textarea>
                        </div>
                        
                        <button type="button" id="generate-pdf-btn" class="button">Genera PDF</button>
                    </div>
                    
                    <div id="pdf-menu-section" class="menu-section">
                        <h3>Carica PDF</h3>
                        
                        <div class="upload-area">
                            <input type="file" id="pdf-upload" accept=".pdf" style="display: none;">
                            <button type="button" id="upload-pdf-btn" class="button">Seleziona PDF</button>
                            <div class="upload-info">
                                <?php if ($current_menu && $current_menu->pdf_url): ?>
                                    <p>PDF corrente: <a href="<?php echo esc_url($current_menu->pdf_url); ?>" target="_blank">Visualizza</a></p>
                                <?php else: ?>
                                    <p>Nessun PDF caricato</p>
                                <?php endif; ?>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" class="button button-primary">Salva Menu</button>
                        <a href="?page=menu-manager" class="button">Annulla</a>
                    </div>
                </form>
                
                <?php if ($current_menu): ?>
                    <div class="preview-section">
                        <h3>Anteprima</h3>
                        <div id="menu-preview">
                            <div class="flipbook" id="flipbook-preview">
                                <!-- Preview content will be loaded here -->
                            </div>
                        </div>
                    </div>
                <?php endif; ?>
                
            <?php else: ?>
                <div class="no-menu-selected">
                    <h2>Seleziona un menu da modificare o creane uno nuovo</h2>
                    <p>Usa il pannello a sinistra per gestire i tuoi menu.</p>
                </div>
            <?php endif; ?>
        </div>
    </div>
</div>

<script>
jQuery(document).ready(function($) {
    $('#new-menu-btn').click(function() {
        window.location.href = '?page=menu-manager&new=1';
    });
    
    // Color picker initialization
    $('.color-picker').wpColorPicker();
    
    // Menu type toggle
    $('input[name="menu-type"]').change(function() {
        if ($(this).val() === 'custom') {
            $('#custom-menu-section').show();
            $('#pdf-menu-section').hide();
        } else {
            $('#custom-menu-section').hide();
            $('#pdf-menu-section').show();
        }
    });
    
    // Initial toggle
    $('input[name="menu-type"]:checked').trigger('change');
    
    // Form submission
    $('#menu-form').submit(function(e) {
        e.preventDefault();
        
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
        
        $.post(menuManagerAjax.ajaxurl, formData, function(response) {
            if (response.success) {
                alert('Menu salvato con successo!');
                window.location.href = '?page=menu-manager&menu_id=' + response.data.menu_id;
            } else {
                alert('Errore nel salvataggio: ' + response.data);
            }
        });
    });
    
    // PDF upload
    $('#upload-pdf-btn').click(function() {
        $('#pdf-upload').click();
    });
    
    $('#pdf-upload').change(function() {
        var file = this.files[0];
        if (file) {
            var formData = new FormData();
            formData.append('action', 'upload_pdf');
            formData.append('nonce', menuManagerAjax.nonce);
            formData.append('menu_id', $('#menu-id').val());
            formData.append('pdf_file', file);
            
            $.ajax({
                url: menuManagerAjax.ajaxurl,
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                success: function(response) {
                    if (response.success) {
                        $('.upload-info').html('<p>PDF caricato: <a href="' + response.data.pdf_url + '" target="_blank">Visualizza</a></p>');
                        alert('PDF caricato con successo!');
                    } else {
                        alert('Errore nel caricamento: ' + response.data);
                    }
                }
            });
        }
    });
    
    // Generate PDF
    $('#generate-pdf-btn').click(function() {
        var menuId = $('#menu-id').val();
        if (!menuId) {
            alert('Salva prima il menu');
            return;
        }
        
        $.post(menuManagerAjax.ajaxurl, {
            action: 'generate_pdf',
            nonce: menuManagerAjax.nonce,
            menu_id: menuId
        }, function(response) {
            if (response.success) {
                alert('PDF generato con successo!');
                window.open(response.data.pdf_url, '_blank');
            } else {
                alert('Errore nella generazione del PDF: ' + response.data);
            }
        });
    });
    
    // Delete menu
    $('.delete-menu').click(function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (confirm('Sei sicuro di voler eliminare questo menu?')) {
            var menuId = $(this).data('menu-id');
            // Implementation for delete functionality
        }
    });
});
</script>