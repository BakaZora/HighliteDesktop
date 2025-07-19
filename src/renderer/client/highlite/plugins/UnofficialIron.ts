import { Plugin } from '../core/interfaces/highlite/plugin/plugin.class';
import { SettingsTypes } from '../core/interfaces/highlite/plugin/pluginSettings.interface';
import { DatabaseManager } from '../core/managers/highlite/databaseManager';

export class UnofficialIron extends Plugin {
    pluginName = 'Unofficial Iron';
    author = 'Zora';
    
    // Database configuration
    private static readonly DB_STORE_NAME = 'settings';
    private static readonly DB_KEY_PREFIX = 'unofficial_iron_';
    
    // Track login state and current user
    private isLoggedIn = false;
    private currentUsername = '';
    
    // Store default values for settings
    private defaultSettings = {
        sendRecieveData: false,
        isIron: false,
        isUltimate: false,
        isHardcore: false,
        groupNames: '',
        manualUpdate: false,
        uuid: '' // Hidden setting for user identification
    };

    constructor() {
        super();
        
        // Iron plugin settings
        this.settings.loginMessage = {
            text: 'Log in...',
            type: SettingsTypes.text,
            value: 'Please log in to access Iron settings',
            disabled: true,
            callback: () => {},
        };

        this.settings.sendRecieveData = {
            text: 'Show Helms in Chat',
            type: SettingsTypes.checkbox,
            value: this.defaultSettings.sendRecieveData,
            callback: () => this.onSettingChanged('sendRecieveData'),
        };

        this.settings.isIron = {
            text: 'I am an Iron',
            type: SettingsTypes.checkbox,
            value: this.defaultSettings.isIron,
            callback: () => this.onSettingChanged('isIron'),
        };

        this.settings.isUltimate = {
            text: 'I am Ultimate',
            type: SettingsTypes.checkbox,
            value: this.defaultSettings.isUltimate,
            callback: () => this.onSettingChanged('isUltimate'),
        };

        this.settings.isHardcore = {
            text: 'I am Hardcore',
            type: SettingsTypes.checkbox,
            value: this.defaultSettings.isHardcore,
            callback: () => this.onSettingChanged('isHardcore'),
        };

        this.settings.groupNames = {
            text: 'Group Mates',
            type: SettingsTypes.text,
            value: this.defaultSettings.groupNames,
            callback: () => this.onSettingChanged('groupNames'),
        };

        this.settings.manualUpdate = {
            text: 'Update Iron Status',
            type: SettingsTypes.button,
            value: this.defaultSettings.manualUpdate,
            callback: () => {
                this.log('Manual update requested');
                // Add manual update logic here if needed
            },
        };

        this.settings.uuid = {
            text: 'UUID', // Hidden setting
            type: SettingsTypes.text,
            value: this.defaultSettings.uuid,
            callback: () => this.onSettingChanged('uuid'),
            hidden: true, // Always hidden from UI
        };
        
        // Initially hide all settings except login message
        this.updateSettingsVisibility();
    }

    init(): void {
        this.log('Initializing Unofficial Iron plugin');
        // Initialize your plugin here
    }

    start(): void {
        this.log('Unofficial Iron plugin started');
    }

    stop(): void {
        this.log('Unofficial Iron plugin stopped');
    }


    /**
     * Update settings visibility based on login status
     */
    private updateSettingsVisibility(): void {
        if (this.isLoggedIn) {
            // Show iron settings, hide login message
            this.settings.loginMessage.hidden = true;
            this.settings.sendRecieveData.hidden = false;
            this.settings.isIron.hidden = false;
            this.settings.isUltimate.hidden = false;
            this.settings.isHardcore.hidden = false;
            this.settings.groupNames.hidden = false;
            this.settings.manualUpdate.hidden = false;
            this.settings.loginMessage.text = `Logged in as: ${this.currentUsername}`;
        } else {
            // Hide iron settings, show login message
            this.settings.loginMessage.hidden = false;
            this.settings.sendRecieveData.hidden = true;
            this.settings.isIron.hidden = true;
            this.settings.isUltimate.hidden = true;
            this.settings.isHardcore.hidden = true;
            this.settings.groupNames.hidden = true;
            this.settings.manualUpdate.hidden = true;
            this.settings.loginMessage.text = 'Please log in to access Iron settings';
            this.settings.loginMessage.value = 'Login required...';
        }
    }

    /**
     * Called when any setting changes - save to database
     */
    private onSettingChanged(settingName: string): void {
        if (!this.isLoggedIn) {
            this.log('Cannot save settings - not logged in');
            return;
        }

        const value = this.settings[settingName].value;
        this.log(`Setting changed: ${settingName} = ${value}`);
        
        // Save to database immediately
        this.saveUserSetting(settingName, value);
    }

    // Database operations for user-specific settings

    /**
     * Get database key for current user and setting
     */
    private getUserSettingKey(settingName: string): string {
        return `${UnofficialIron.DB_KEY_PREFIX}${this.currentUsername}_${settingName}`;
    }

    /**
     * Save a user setting to database
     */
    private async saveUserSetting(settingName: string, value: any): Promise<void> {
        try {
            const dbManager = document.highlite?.managers?.DatabaseManager as DatabaseManager;
            if (!dbManager || !dbManager.database) {
                this.log('Database not available');
                return;
            }

            const key = this.getUserSettingKey(settingName);
            await dbManager.database.put(UnofficialIron.DB_STORE_NAME, value, key);
            this.log(`Saved setting ${settingName} for user ${this.currentUsername}`);
        } catch (error) {
            console.error('Error saving user setting:', error);
        }
    }

    /**
     * Load all user settings from database
     */
    private async loadUserSettings(): Promise<void> {
        try {
            const dbManager = document.highlite?.managers?.DatabaseManager as DatabaseManager;
            if (!dbManager || !dbManager.database) {
                this.log('Database not available');
                return;
            }

            const settingNames = ['sendRecieveData', 'isIron', 'isUltimate', 'isHardcore', 'groupNames', 'uuid'];
            
            for (const settingName of settingNames) {
                try {
                    const key = this.getUserSettingKey(settingName);
                    const value = await dbManager.database.get(UnofficialIron.DB_STORE_NAME, key);
                    
                    if (value !== undefined) {
                        this.settings[settingName].value = value as any;
                        this.log(`Loaded setting ${settingName}: ${value}`);
                    }
                } catch (error) {
                    // Setting doesn't exist, use default
                    this.log(`No saved value for ${settingName}, using default`);
                }
            }
        } catch (error) {
            console.error('Error loading user settings:', error);
        }
    }

    /**
     * Reset settings to defaults
     */
    private resetSettingsToDefaults(): void {
        this.settings.sendRecieveData.value = this.defaultSettings.sendRecieveData;
        this.settings.isIron.value = this.defaultSettings.isIron;
        this.settings.isUltimate.value = this.defaultSettings.isUltimate;
        this.settings.isHardcore.value = this.defaultSettings.isHardcore;
        this.settings.groupNames.value = this.defaultSettings.groupNames;
        this.settings.manualUpdate.value = this.defaultSettings.manualUpdate;
        this.settings.uuid.value = this.defaultSettings.uuid;
    }

    // Game event hooks for login/logout management
    
    /**
     * Called when player logs in - load user-specific settings
     */
    SocketManager_loggedIn(): void {
        // Get the current username from the game
        const username = this.getCurrentUsername();
        if (!username) {
            this.log('Could not determine username');
            return;
        }

        this.isLoggedIn = true;
        this.currentUsername = username;
        
        this.log(`Player logged in: ${this.currentUsername}`);
        
        // Update UI visibility
        this.updateSettingsVisibility();
        
        // Load user's saved settings
        this.loadUserSettings().then(() => {
            this.log('User settings loaded');
            
            // Generate UUID if it doesn't exist
            this.ensureUUID();
            
            this.log('User setup complete');
        });
    }

    /**
     * Called when player logs out - hide settings and reset
     */
    SocketManager_handleLoggedOut(): void {
        this.log(`Player logged out: ${this.currentUsername}`);
        
        this.isLoggedIn = false;
        this.currentUsername = '';
        
        // Reset settings to defaults
        this.resetSettingsToDefaults();
        
        // Update UI visibility (hide iron settings)
        this.updateSettingsVisibility();
        
        this.log('User logged out, plugin cleaned up');
    }

    /**
     * Get current username from game state
     */
    private getCurrentUsername(): string {
        try {
            // This depends on how the game stores the current user
            // You may need to adjust this based on the actual game API
            const player = document.highlite?.gameHooks?.EntityManager?.Instance?.MainPlayer;
            return player?._name || player?.Name || 'unknown';
        } catch (error) {
            console.error('Error getting username:', error);
            return '';
        }
    }

    /**
     * Generate a simple UUID v4
     */
    private generateUUID(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Ensure the user has a UUID, generate one if they don't
     */
    private ensureUUID(): void {
        if (!this.settings.uuid.value || this.settings.uuid.value === '') {
            const newUUID = this.generateUUID();
            this.settings.uuid.value = newUUID;
            this.saveUserSetting('uuid', newUUID);
            this.log(`Generated new UUID for user ${this.currentUsername}: ${newUUID}`);
        } else {
            this.log(`Using existing UUID for user ${this.currentUsername}: ${this.settings.uuid.value}`);
        }
    }
}
