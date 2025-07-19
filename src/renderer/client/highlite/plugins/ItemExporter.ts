import { Plugin } from '../core/interfaces/highlite/plugin/plugin.class';
import { SettingsTypes } from '../core/interfaces/highlite/plugin/pluginSettings.interface';

export class ItemExporter extends Plugin {
    pluginName = 'Item Exporter';
    author = 'Highlite User';

    constructor() {
        super();
        
        // Add a button to export item mappings
        this.settings.exportItems = {
            text: 'Export Item IDs',
            type: SettingsTypes.button,
            value: false,
            callback: () => {
                this.exportItemMappings();
            },
        };
    }

    init(): void {
        this.log('Initializing Item Exporter plugin');
    }

    start(): void {
        this.log('Item Exporter plugin started');
    }

    stop(): void {
        this.log('Item Exporter plugin stopped');
    }

    /**
     * Export item mappings as JSON in the format { "id": "name" }
     */
    private exportItemMappings(): void {
        try {
            const ItemDefMap = document.highlite?.gameHooks?.ItemDefMap?.ItemDefMap;
            if (!ItemDefMap) {
                this.error('ItemDefMap not available. Make sure you are logged into the game.');
                return;
            }

            const itemMappings: Record<string, string> = {};
            
            // Iterate through all items
            ItemDefMap.forEach((itemDef: any, itemId: number) => {
                if (itemDef) {
                    // Use the capitalized name if available, otherwise fall back to regular name
                    const itemName = itemDef._nameCapitalized || itemDef._name || `Item ${itemId}`;
                    itemMappings[itemId.toString()] = itemName;
                }
            });

            // Create and download the file
            const jsonString = JSON.stringify(itemMappings, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = 'item_mappings.json';
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            URL.revokeObjectURL(url);
            
            this.log(`Successfully exported ${Object.keys(itemMappings).length} item mappings to item_mappings.json`);
        } catch (error) {
            this.error('Error exporting item mappings:', error);
        }
    }
}
