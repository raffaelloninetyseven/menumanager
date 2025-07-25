<?php if (!defined('ABSPATH')) exit; ?>

<div class="wrap">
    <h1>Menu Manager - Dashboard</h1>
    
    <div class="menu-manager-admin">
        <div class="admin-header">
            <button id="add-new-menu" class="button button-primary button-large">
                <span class="dashicons dashicons-plus-alt" style="vertical-align: middle; margin-right: 5px;"></span>
                Aggiungi Nuovo Menu
            </button>
        </div>
        
        <div class="menus-list">
            <table class="wp-list-table widefat fixed striped">
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>PDF</th>
                        <th>Periodo Attivo</th>
                        <th>Stato</th>
                        <th>Priorità</th>
                        <th>Azioni</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($menus)): ?>
                        <tr>
                            <td colspan="6" style="text-align: center; padding: 30px;">
                                <div style="opacity: 0.7;">
                                    <span class="dashicons dashicons-food" style="font-size: 48px; display: block; margin-bottom: 10px;"></span>
                                    <p>Nessun menu caricato</p>
                                    <p><em>Clicca su "Aggiungi Nuovo Menu" per iniziare</em></p>
                                </div>
                            </td>
                        </tr>
                    <?php else: ?>
                        <?php foreach ($menus as $menu): ?>
                            <tr data-menu-id="<?php echo esc_attr($menu->id); ?>">
                                <td><strong><?php echo esc_html($menu->name); ?></strong></td>
                                <td>
                                    <?php if ($menu->pdf_url): ?>
                                        <a href="<?php echo esc_url($menu->pdf_url); ?>" target="_blank" class="button button-small">
                                            <span class="dashicons dashicons-pdf"></span> Visualizza PDF
                                        </a>
                                    <?php else: ?>
                                        <span style="color: #999;">Nessun PDF</span>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <?php 
                                    if ($menu->start_date || $menu->end_date) {
                                        echo $menu->start_date ? date('d/m/Y H:i', strtotime($menu->start_date)) : 'Sempre';
                                        echo '<br>↓<br>';
                                        echo $menu->end_date ? date('d/m/Y H:i', strtotime($menu->end_date)) : 'Sempre';
                                    } else {
                                        echo '<span style="color: #28a745;">Sempre attivo</span>';
                                    }
                                    ?>
                                </td>
                                <td>
                                    <span class="status-badge <?php echo $menu->is_active ? 'active' : 'inactive'; ?>">
                                        <?php echo $menu->is_active ? 'Attivo' : 'Inattivo'; ?>
                                    </span>
                                </td>
                                <td>
                                    <span class="priority-badge"><?php echo esc_html($menu->priority); ?></span>
                                </td>
                                <td>
                                    <div class="button-group">
                                        <button class="button edit-menu" data-menu-id="<?php echo esc_attr($menu->id); ?>">
                                            <span class="dashicons dashicons-edit"></span> Modifica
                                        </button>
                                        <button class="button button-link-delete delete-menu" data-menu-id="<?php echo esc_attr($menu->id); ?>">
                                            <span class="dashicons dashicons-trash"></span> Elimina
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<!-- Modal per aggiungere/modificare menu -->
<div id="menu-modal" class="menu-modal" style="display: none;">
    <div class="modal-content">
        <div class="modal-header">
            <h2 id="modal-title">Aggiungi Nuovo Menu</h2>
            <span class="close">&times;</span>
        </div>
        
        <form id="menu-form">
            <input type="hidden" id="menu-id" name="menu_id">
            
            <div class="form-row">
                <label for="menu-name">Nome Menu *</label>
                <input type="text" id="menu-name" name="name" required placeholder="Es: Menu Primavera 2025">
            </div>
            
            <div class="form-row">
                <label for="pdf-upload">File PDF *</label>
                <div class="upload-area">
                    <input type="file" id="pdf-upload" accept=".pdf" style="display: none;">
                    <input type="hidden" id="pdf-url" name="pdf_url">
                    <button type="button" id="upload-btn" class="button">
                        <span class="dashicons dashicons-upload"></span> Seleziona PDF
                    </button>
                    <p>oppure trascina un file PDF qui</p>
                    <div id="upload-status"></div>
                </div>
            </div>
            
            <div class="form-row">
                <div class="date-range">
                    <div class="date-field">
                        <label for="start-date">Data/Ora Inizio</label>
                        <input type="datetime-local" id="start-date" name="start_date">
                    </div>
                    <div class="date-field">
                        <label for="end-date">Data/Ora Fine</label>
                        <input type="datetime-local" id="end-date" name="end_date">
                    </div>
                </div>
                <small style="color: #666;">Lascia vuoto per menu sempre attivo</small>
            </div>
            
            <div class="form-row">
                <label class="toggle-label">
                    <input type="checkbox" id="is-active" name="is_active" checked>
                    Menu Attivo
                </label>
            </div>
            
            <div class="form-row">
                <label for="priority">Priorità</label>
                <input type="number" id="priority" name="priority" value="0" min="0" max="100">
                <small style="color: #666;">I menu con priorità maggiore vengono mostrati per primi</small>
            </div>
            
            <div class="modal-actions">
                <button type="button" class="button" id="cancel-btn">Annulla</button>
                <button type="submit" class="button button-primary" id="save-btn">
                    <span class="dashicons dashicons-yes"></span> Salva Menu
                </button>
            </div>
        </form>
    </div>
</div>