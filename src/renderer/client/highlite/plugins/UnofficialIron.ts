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
        uuid: '',
        hasDied: false // Track if user has died in hardcore mode
    };

    constructor() {
        super();
        
        // Iron plugin settings
        this.settings.loginMessage = {
            text: 'Log in...',
            type: SettingsTypes.text,
            value: 'Please log in.',
            disabled: false,
            callback: () => {},
        };

        this.settings.alertMessage = {
            text: 'Alert!',
            type: SettingsTypes.text,
            value: 'If you enable "Show Helm icons in chat", your username and iron settings will be sent to and stored in a remote database.',
            disabled: false,
            hidden: false,
            callback: () => {},
        };

        this.settings.disclaimerMessage = {
            text: 'Disclaimer!',
            type: SettingsTypes.text,
            value: 'This plugin relies on player trust! It\'s entirely possible to get around restrictions even when using this plugin.',
            disabled: false,
            hidden: false,
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
            callback: () => {
                this.onSettingChanged('isIron');
                // Update settings visibility when Iron status changes
                this.updateSettingsVisibility();
            }
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
            disabled: false, // Will be set dynamically on login
            callback: () => this.onSettingChanged('isHardcore'),
        };

        this.settings.groupNames = {
            text: 'Group Mates',
            type: SettingsTypes.text,
            value: this.defaultSettings.groupNames,
            callback: () => this.onSettingChanged('groupNames'),
        };

        this.settings.updateButton = {
            text: 'Update Status',
            type: SettingsTypes.button,
            value: this.defaultSettings.manualUpdate,
            callback: () => {
                //TODO: Manually call get and post logic to DB
            },
        };

        this.settings.uuid = {
            text: 'UUID', // Hidden setting
            type: SettingsTypes.text,
            value: this.defaultSettings.uuid,
            callback: () => this.onSettingChanged('uuid'),
            hidden: true, // Always hidden from UI
        };

        this.settings.hasDied = {
            text: 'Hardcore Death Status', // Hidden setting
            type: SettingsTypes.checkbox,
            value: this.defaultSettings.hasDied,
            callback: () => this.onSettingChanged('hasDied'),
            hidden: true, // Always hidden from UI
        };
        
        // Initially hide all settings except login message
        this.updateSettingsVisibility();
    }

    init(): void {
        this.log('Initializing Unofficial Iron plugin');
    }

    start(): void {
        this.log('Unofficial Iron plugin started');
        this.updateSettingsVisibility();
    }

    stop(): void {
        this.log('Unofficial Iron plugin stopped');
    }


    // Update settings visibility based on login status
    private updateSettingsVisibility(): void {
        if (this.isLoggedIn) {
            // Show iron settings, hide login message
            this.settings.loginMessage.hidden = true;
            this.settings.alertMessage.hidden = false;
            this.settings.disclaimerMessage.hidden = false;
            this.settings.sendRecieveData.hidden = false;
            this.settings.isIron.hidden = false;
            // Ensure bottom 4 options are shown if iron is enabled
            const ironEnabled = this.settings.isIron.value === true;
            this.settings.isUltimate.hidden = !ironEnabled;
            this.settings.isHardcore.hidden = !ironEnabled;
            this.settings.groupNames.hidden = !ironEnabled;
            this.settings.updateButton.hidden = !ironEnabled;
        } else {
            // Hide iron settings, show login message
            this.settings.loginMessage.hidden = false;
            this.settings.alertMessage.hidden = true;
            this.settings.disclaimerMessage.hidden = true;
            this.settings.sendRecieveData.hidden = true;
            this.settings.isIron.hidden = true;
            this.settings.isUltimate.hidden = true;
            this.settings.isHardcore.hidden = true;
            this.settings.groupNames.hidden = true;
            this.settings.updateButton.hidden = true;
        }
    }

    // Called when any setting changes - save to database
    private onSettingChanged(settingName: string): void {
        if (!this.isLoggedIn) {
            this.log('Cannot save settings - not logged in');
            return;
        }

        const value = this.settings[settingName].value;
        this.log(`Setting changed: ${settingName} = ${value}`);
        
        // Save to database immediately
        this.saveUserSetting(settingName, value);

        // Update hardcore disabled state when relevant settings change
        if (settingName === 'hasDied') {
            this.updateHardcoreDisabledState();
            
            // Update the settings UI to reflect the disabled state change
            const settingsManager = document.highlite?.managers?.SettingsManager;
            if (settingsManager && typeof settingsManager.updatePluginSettingsUI === 'function') {
                settingsManager.updatePluginSettingsUI(this);
            }
        }
    }

    // Database operations for user-specific settings

    // Get database key for current user and setting
    private getUserSettingKey(settingName: string): string {
        return `${UnofficialIron.DB_KEY_PREFIX}${this.currentUsername}_${settingName}`;
    }

    // Save a user setting to database
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

    // Load all user settings from database
    private async loadUserSettings(): Promise<void> {
        try {
            const dbManager = document.highlite?.managers?.DatabaseManager as DatabaseManager;
            if (!dbManager || !dbManager.database) {
                this.log('Database not available');
                return;
            }

            const settingNames = ['sendRecieveData', 'isIron', 'isUltimate', 'isHardcore', 'groupNames', 'uuid', 'hasDied'];
            
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

            // Update hardcore disabled state based on loaded hasDied value
            if (this.settings.hasDied.value) {
                this.settings.isHardcore.disabled = true;
            }

            // Always update visibility of bottom 4 options based on isIron after loading settings
            this.updateSettingsVisibility();
        } catch (error) {
            console.error('Error loading user settings:', error);
        }
    }

    // Reset settings to defaults
    private resetSettingsToDefaults(): void {
        this.settings.sendRecieveData.value = this.defaultSettings.sendRecieveData;
        this.settings.isIron.value = this.defaultSettings.isIron;
        this.settings.isUltimate.value = this.defaultSettings.isUltimate;
        this.settings.isHardcore.value = this.defaultSettings.isHardcore;
        this.settings.groupNames.value = this.defaultSettings.groupNames;
        this.settings.updateButton.value = this.defaultSettings.manualUpdate;
        this.settings.uuid.value = this.defaultSettings.uuid;
        this.settings.hasDied.value = this.defaultSettings.hasDied;

        // Reset hardcore disabled state
        this.settings.isHardcore.disabled = false;
        
        // Update the settings UI to reflect the changes
        const settingsManager = document.highlite?.managers?.SettingsManager;
        if (settingsManager && typeof settingsManager.updatePluginSettingsUI === 'function') {
            settingsManager.updatePluginSettingsUI(this);
        }

        // After resetting settings to defaults, update visibility to match isIron value
        this.updateSettingsVisibility();
    }

    // Game event hooks for login/logout management
    
    // Called when player logs in - load user-specific settings
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
        
        // Load user's saved settings
        this.loadUserSettings().then(() => {
            this.log('User settings loaded');
            
            // Generate UUID if it doesn't exist
            this.ensureUUID();
            
            // Update the settings UI to reflect the loaded values
            const settingsManager = document.highlite?.managers?.SettingsManager;
            if (settingsManager && typeof settingsManager.updatePluginSettingsUI === 'function') {
                settingsManager.updatePluginSettingsUI(this);
            }
            
            // Always update visibility of bottom 4 options based on isIron after loading settings
            this.updateSettingsVisibility();

            this.log('User setup complete');
        });
    }

    // Called when player logs out - hide settings and reset
    SocketManager_handleLoggedOut(): void {
        this.log(`Player logged out: ${this.currentUsername}`);
        
        this.isLoggedIn = false;
        this.currentUsername = '';
        
        // Reset settings to defaults
        this.resetSettingsToDefaults();
        
        // Update UI visibility (hide iron settings)
        this.updateSettingsVisibility();
    }

    // Get current username from game state
    private getCurrentUsername(): string {
        try {
            const player = document.highlite?.gameHooks?.EntityManager?.Instance?.MainPlayer;
            return player?._name || player?.Name || 'unknown';
        } catch (error) {
            console.error('Error getting username:', error);
            return '';
        }
    }

    // Generate a simple UUID v4
    private generateUUID(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // Ensure the user has a UUID, generate one if they don't
    private ensureUUID(): void {
        if (!this.settings.uuid.value || this.settings.uuid.value === '') {
            const newUUID = this.generateUUID();
            this.settings.uuid.value = newUUID;
            this.saveUserSetting('uuid', newUUID);
        }
    }

    // Handle player death - disable hardcore permanently if they were in hardcore mode
    private handlePlayerDeath(): void {
        if (!this.isLoggedIn) {
            return;
        }

        // Mark that user has died in hardcore mode
        this.settings.hasDied.value = true;
        this.saveUserSetting('hasDied', true);
        
        // Turn off hardcore and disable it
        this.settings.isHardcore.value = false;
        this.settings.isHardcore.disabled = true;
        
        // Save the hardcore setting change
        this.saveUserSetting('isHardcore', false);
        
        // Update the settings UI
        const settingsManager = document.highlite?.managers?.SettingsManager;
        if (settingsManager && typeof settingsManager.updatePluginSettingsUI === 'function') {
            settingsManager.updatePluginSettingsUI(this);
        }
    }
}



//TODO:
// POST to database function, called every 5 minutes while logged in and showing helms is true. 
// -Also called on death (after updating settings). 
// -Called with manual button too that puts it in 5 min cooldown
// send all settings to the database, including uuid as key
// 
// GET from database function, called every 5 minutes while logged in and show helms is true
// get call to database, returns a list of usernames and their iron status (IM, HCIM, UIM, HCUIM, GIM, HCCGIM, UGIM, HCUGIM
// different helmet icon and colour per iron status:
// - regular irons = full helm // group irons = med helm. 
// - iron = iron // hardcore = pig iron // ultimate = silver // hcuim = palladium
//
// insert helmet next to username in chat for player
// look at incoming chat messages, if player is in the list of irons, insert helmet next to their name based on the above rules
