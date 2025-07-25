<?php if (!defined('ABSPATH')) exit; ?>

<div class="wrap">
    <h1>Menu Manager</h1>
    
    <div class="menu-manager-admin">
        <div class="admin-header">
            <button id="add-new-menu" class="button button-primary">Aggiungi Nuovo Menu</button>
        </div>
        
        <div class="menus-list">
            <table class="wp-list-table widefat fixed striped">
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>PDF</th>
                        <th>Periodo Attivo</th>
                        <th>Ruoli Utente</th>
                        <th>Stato</th>
                        <th>Azioni</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($menus)): ?>
                        <tr>
                            <td colspan="6">Nessun menu caricato</td>
                        </tr>
                    <?php else: ?>
                        <?php foreach ($menus as $menu): ?>
                            <tr data-menu-id="<?php echo $menu->id; ?>">
                                <td><?php echo esc_html($menu->name); ?></td>
                                <td>
                                    <a href="<?php echo esc_url($menu->pdf_url); ?>" target="_blank">Visualizza PDF</a>
                                </td>
                                <td>
                                    <?php 
                                    if ($menu->start_date || $menu->end_date) {
                                        echo $menu->start_date ? date('d/m/Y', strtotime($menu->start_date)) : 'Sempre';
                                        echo ' - ';
                                        echo $menu->end_date ? date('d/m/Y', strtotime($menu->end_date)) : 'Sempre';
                                    } else {
                                        echo 'Sempre attivo';
                                    }
                                    ?>
                                </td>
                                <td>
                                    <?php 
                                    echo $menu->user_roles ? str_replace(',', ', ', $menu->user_roles) : 'Tutti gli utenti';
                                    ?>
                                </td>
                                <td>
                                    <span class="status-badge <?php echo $menu->is_active ? 'active' : 'inactive'; ?>">
                                        <?php echo $menu->is_active ? 'Attivo' : 'Inattivo'; ?>
                                    </span>
                                </td>
                                <td>
                                    <button class="button edit-menu" data-menu-id="<?php echo $menu->id; ?>">Modifica</button>
                                    <button class="button button-link-delete delete-menu" data-menu-id="<?php echo $menu->id; ?>">Elimina</button>
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
                <input type="text" id="menu-name" name="name" required>
            </div>
            
            <div class="form-row">
                <label for="pdf-upload">File PDF *</label>
                <div class="upload-area">
                    <input type="file" id="pdf-upload" accept=".pdf" style="display: none;">
                    <input type="hidden" id="pdf-url" name="pdf_url">
                    <button type="button" id="upload-btn" class="button">Seleziona PDF</button>
                    <div id="upload-status"></div>
                </div>
            </div>
            
            <div class="form-row">
                <div class="date-range">
                    <div class="date-field">
                        <label for="start-date">Data Inizio</label>
                        <input type="datetime-local" id="start-date" name="start_date">
                    </div>
                    <div class="date-field">
                        <label for="end-date">Data Fine</label>
                        <input type="datetime-local" id="end-date" name="end_date">
                    </div>
                </div>
            </div>
            
            <div class="form-row">
                <label>Ruoli Utente Autorizzati</label>
                <div class="user-roles">
                    <?php 
                    global $wp_roles;
                    $roles = $wp_roles->get_names();
                    foreach ($roles as $role_key => $role_name): ?>
                        <label class="role-checkbox">
                            <input type="checkbox" name="user_roles[]" value="<?php echo $role_key; ?>">
                            <?php echo $role_name; ?>
                        </label>
                    <?php endforeach; ?>
                </div>
                <small>Lascia vuoto per permettere l'accesso a tutti gli utenti</small>
            </div>
            
            <div class="form-row">
                <label class="toggle-label">
                    <input type="checkbox" id="is-active" name="is_active" checked>
                    Menu Attivo
                </label>
            </div>
            
            <div class="modal-actions">
                <button type="button" class="button" id="cancel-btn">Annulla</button>
                <button type="submit" class="button button-primary" id="save-btn">Salva Menu</button>
            </div>
        </form>
    </div>
</div>