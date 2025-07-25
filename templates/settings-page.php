<?php if (!defined('ABSPATH')) exit; ?>

<div class="wrap">
    <h1>Menu Manager - Impostazioni</h1>
    
    <div class="menu-manager-settings">
        <form id="settings-form" method="post">
            <?php wp_nonce_field('menu_manager_settings', 'settings_nonce'); ?>
            
            <table class="form-table" role="presentation">
                <tbody>
                    <tr>
                        <th scope="row">
                            <label for="menu_capability">Permessi di gestione menu</label>
                        </th>
                        <td>
                            <select name="menu_capability" id="menu_capability">
                                <option value="manage_options" <?php selected(isset($settings['menu_capability']) ? $settings['menu_capability'] : 'manage_options', 'manage_options'); ?>>
                                    Solo Amministratori (manage_options)
                                </option>
                                <option value="edit_pages" <?php selected(isset($settings['menu_capability']) ? $settings['menu_capability'] : '', 'edit_pages'); ?>>
                                    Editor e superiori (edit_pages)
                                </option>
                                <option value="edit_posts" <?php selected(isset($settings['menu_capability']) ? $settings['menu_capability'] : '', 'edit_posts'); ?>>
                                    Autore e superiori (edit_posts)
                                </option>
                                <option value="read" <?php selected(isset($settings['menu_capability']) ? $settings['menu_capability'] : '', 'read'); ?>>
                                    Tutti gli utenti registrati (read)
                                </option>
                            </select>
                            <p class="description">
                                Seleziona chi può accedere alla gestione dei menu. Gli amministratori hanno sempre accesso alle impostazioni.
                            </p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">
                            <label>Ruoli autorizzati</label>
                        </th>
                        <td>
                            <fieldset>
                                <legend class="screen-reader-text">
                                    <span>Ruoli autorizzati a gestire i menu</span>
                                </legend>
                                
                                <?php 
                                global $wp_roles;
                                $roles = $wp_roles->get_names();
                                $selected_roles = isset($settings['allowed_roles']) ? $settings['allowed_roles'] : array('administrator');
                                
                                foreach ($roles as $role_key => $role_name): ?>
                                    <label style="display: block; margin-bottom: 8px;">
                                        <input type="checkbox" 
                                               name="allowed_roles[]" 
                                               value="<?php echo esc_attr($role_key); ?>"
                                               <?php checked(in_array($role_key, $selected_roles)); ?>>
                                        <?php echo esc_html($role_name); ?>
                                    </label>
                                <?php endforeach; ?>
                                
                                <p class="description">
                                    Seleziona i ruoli che possono gestire i menu. Questa impostazione funziona insieme al permesso sopra.
                                </p>
                            </fieldset>
                        </td>
                    </tr>
                </tbody>
            </table>
            
            <div class="settings-info">
                <h3>Informazioni sui permessi</h3>
                <div class="notice notice-info inline">
                    <p><strong>Come funzionano i permessi:</strong></p>
                    <ul style="margin-left: 20px;">
                        <li>Il <strong>permesso di gestione</strong> definisce la capacità WordPress richiesta</li>
                        <li>I <strong>ruoli autorizzati</strong> sono un filtro aggiuntivo sui ruoli specifici</li>
                        <li>Un utente deve soddisfare <strong>entrambi</strong> i criteri per accedere</li>
                        <li>Gli <strong>amministratori</strong> hanno sempre accesso alle impostazioni</li>
                    </ul>
                </div>
            </div>
            
            <?php submit_button('Salva Impostazioni', 'primary', 'save_settings'); ?>
        </form>
    </div>
</div>

<style>
.menu-manager-settings {
    max-width: 800px;
}

.settings-info {
    margin-top: 30px;
    padding: 20px 0;
    border-top: 1px solid #ddd;
}

.settings-info h3 {
    margin-top: 0;
}

.settings-info ul {
    list-style-type: disc;
}

.form-table th {
    width: 200px;
    padding: 20px 10px 20px 0;
}

.form-table td {
    padding: 15px 10px;
}

fieldset label {
    font-weight: normal;
}
</style>

<script type="text/javascript">
jQuery(document).ready(function($) {
    $('#save_settings').on('click', function(e) {
        e.preventDefault();
        
        var formData = $('#settings-form').serialize();
        formData += '&action=save_settings&nonce=' + menuManagerAdmin.nonce;
        
        $(this).prop('disabled', true).text('Salvataggio...');
        
        $.ajax({
            url: menuManagerAdmin.ajax_url,
            type: 'POST',
            data: formData,
            success: function(response) {
                if (response.success) {
                    alert('Impostazioni salvate con successo!');
                    location.reload();
                } else {
                    alert('Errore: ' + response.data);
                }
            },
            error: function() {
                alert('Errore nel salvare le impostazioni');
            },
            complete: function() {
                $('#save_settings').prop('disabled', false).text('Salva Impostazioni');
            }
        });
    });
});