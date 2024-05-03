import {DocumentBrowserSFRPG} from "../../../../systems/sfrpg/module/packs/document-browser.js";
import {betterPackLoader} from "./betterPackloader.js";


export function initializeNanoforge() {
    const equipmentBrowser = getEquipmentBrowser();
    equipmentBrowser.initializeSettings(["equipment"]);
}
export function openShop(compendiums,priceModifier = 1.0, title ="Shop", type = "shop", allowReopen = false) {
    const browser = getEquipmentBrowser();
    browser.forceReload = true;
    browser.options.compendiums = compendiums;
    browser.options.priceModifier = priceModifier;
    browser.options.title = title;
    browser.options.type = type;
    browser.options.shopReopen = allowReopen;
    browser.render(true);
}
export function makeShopLink(actor, text, compendiums,priceModifier = 1.0, title ="Shop", type = "shop", allowReopen = false) {
    const compendiumsJson = JSON.stringify(compendiums);
    const reopenStr = allowReopen ? "true" : "false";
    const content = `${text}<button class="flox_open_shop" data-compendiums='${compendiumsJson}' data-price-modifier="${priceModifier}"
      data-shop-type="${type}" data-shop-name="${title}"
      data-shop-reopen="${reopenStr}">Open</button>`;

    const chatData = {
        user: actor.id,
        speaker: ChatMessage.getSpeaker(),
        content: content
    };

    ChatMessage.create(chatData, {});
}

export function openShopFromEvent(event) {
    // Access the target element from the event object
    const t = event.target;

    // Retrieve each attribute and handle them according to their types
    const compendiumsData = t.getAttribute('data-compendiums');
    const priceModifier = parseFloat(t.getAttribute('data-price-modifier'));
    const shopType = t.getAttribute('data-shop-type');
    const shopName = t.getAttribute('data-shop-name');
    const shopReopen = t.getAttribute('data-shop-reopen') === "true";
    openShop(JSON.parse(compendiumsData),priceModifier,shopName,shopType,shopReopen);
}

const equipmentTypes = {
    "ammunition"   : "SFRPG.Items.Categories.Ammunition",
    "augmentation" : "SFRPG.Items.Categories.Augmentations",
    "consumable"   : "SFRPG.Items.Categories.Consumables",
    "container"    : "SFRPG.Items.Categories.Containers",
    "equipment"    : "SFRPG.Items.Categories.Equipment",
    "fusion"       : "SFRPG.Items.Categories.WeaponFusions",
    "goods"        : "SFRPG.Items.Categories.Goods",
    "hybrid"       : "SFRPG.Items.Categories.HybridItems",
    "magic"        : "SFRPG.Items.Categories.MagicItems",
    "shield"       : "SFRPG.Items.Categories.Shields",
    "technological": "SFRPG.Items.Categories.TechnologicalItems",
    "upgrade"      : "SFRPG.Items.Categories.ArmorUpgrades",
    "weapon"       : "SFRPG.Items.Categories.Weapons",
    "weaponAccessory": "SFRPG.Items.Categories.WeaponAccessories"
};

class EquipmentBrowserSFRPG extends DocumentBrowserSFRPG {

    static get defaultOptions() {
        const options = super.defaultOptions;
        options.title = "Item Selection";
        options.shopType = "shop";
        options.priceModifier = 1.0;
        options.template = "modules/juvencas-flox/templates/document-browser.hbs"
        options.shopReopen = false;
        return options;
    }

    _onDragStart(t, e) {
        const price = $(t.currentTarget).attr("data-system-price");
        const i = $(t.currentTarget).attr("data-entry-uuid"), s = {type: this.entityType, uuid: i,price: price,
                compendiums: this.options.compendiums, priceModifier: this.options.priceModifier,
                shopType: this.options.shopType, shopName: this.options.title, shopReopen: this.options.shopReopen ? "true" : "false"},
            n = JSON.stringify(s);
        t.dataTransfer.setData("text/plain", n)
    }

    getConfigurationProperties() {
        return {
            label: this.options.title,
            settings: "equipmentBrowser"
        };
    }

    getPacksToLoad() {

        return this.options.compendiums;
        //return Object.entries(this.settings);
    }

    allowedItem(item) {
        const keys = Object.keys(equipmentTypes);
        return (keys.includes(item.type));
    }

    getSortingMethods() {
        const sortingMethods = super.getSortingMethods();
        sortingMethods["level"] = {
            name: game.i18n.format("SFRPG.Browsers.EquipmentBrowser.BrowserSortMethodLevel"),
            method: this._sortByLevel
        };
        sortingMethods["price"] = {
            name: 'price',
            method: this._sortByPrice
        };
        return sortingMethods;
    }

    _sortByPrice(elementA, elementB) {
        const aVal = parseInt($(elementA).find('input[name=price]')
            .val());
        const bVal = parseInt($(elementB).find('input[name=price]')
            .val());
        if (aVal < bVal) return -1;
        if (aVal > bVal) return 1;

        if (aVal === bVal) {
            const aName = $(elementA).find('.item-name a')[0].innerHTML;
            const bName = $(elementB).find('.item-name a')[0].innerHTML;
            if (aName < bName) return -1;
            if (aName > bName) return 1;
            return 0;
        }
    }

    _sortByLevel(elementA, elementB) {
        const aVal = parseInt($(elementA).find('input[name=level]')
            .val());
        const bVal = parseInt($(elementB).find('input[name=level]')
            .val());
        if (aVal < bVal) return -1;
        if (aVal > bVal) return 1;

        if (aVal === bVal) {
            const aName = $(elementA).find('.item-name a')[0].innerHTML;
            const bName = $(elementB).find('.item-name a')[0].innerHTML;
            if (aName < bName) return -1;
            if (aName > bName) return 1;
            return 0;
        }
    }

    getFilters() {
        const filters = {
            equipmentTypes: {
                label: game.i18n.format("SFRPG.Browsers.EquipmentBrowser.ItemType"),
                content: equipmentTypes,
                filter: (element, filters) => { return this._filterItemType(element, filters); },
                activeFilters: this.filters?.equipmentTypes?.activeFilters || [],
                type: "multi-select"
            }
        };

        if ((this.filters?.equipmentTypes?.activeFilters || []).includes("weapon")) {
            filters.weaponTypes = {
                label: game.i18n.format("SFRPG.Browsers.EquipmentBrowser.WeaponType"),
                content: CONFIG.SFRPG.weaponTypes,
                filter: (element, filters) => { return this._filterWeaponType(element, filters); },
                activeFilters: this.filters.weaponTypes?.activeFilters || [],
                type: "multi-select"
            };

            filters.weaponCategories = {
                label: game.i18n.format("SFRPG.Browsers.EquipmentBrowser.WeaponCategories"),
                content: CONFIG.SFRPG.weaponCategories,
                filter: (element, filters) => { return this._filterWeaponCategory(element, filters); },
                activeFilters: this.filters.weaponCategories?.activeFilters || [],
                type: "multi-select"
            };
        }

        if ((this.filters?.equipmentTypes?.activeFilters || []).includes("equipment")) {
            filters.armorTypes = {
                label: game.i18n.format("SFRPG.Browsers.EquipmentBrowser.EquipmentType"),
                content: CONFIG.SFRPG.armorTypes,
                filter: (element, filters) => { return this._filterArmorType(element, filters); },
                activeFilters: this.filters.armorTypes?.activeFilters || [],
                type: "multi-select"
            };
        }

        if ((this.filters?.equipmentTypes?.activeFilters || []).includes("augmentation")) {
            filters.augmentationTypes = {
                label: game.i18n.format("SFRPG.Browsers.EquipmentBrowser.EquipmentType"),
                content: CONFIG.SFRPG.augmentationTypes,
                filter: (element, filters) => { return this._filterAugmentationType(element, filters); },
                activeFilters: this.filters.augmentationTypes?.activeFilters || [],
                type: "multi-select"
            };
        }

        return filters;
    }

    getTags() {
        return {
            level: {
                name: game.i18n.localize("SFRPG.Browsers.EquipmentBrowser.BrowserSortMethodLevel"),
                dataKey: "level",
                sortValue: "level"
            },
            price: {
                name: "Price",
                dataKey: "price",
                sortValue: "price"
            },
        };
    }

    onFiltersUpdated(html) {
        this.refreshFilters = true;
        super.onFiltersUpdated(html);
    }

    _filterItemType(element, filters) {
        const itemUuid = element.dataset.entryUuid;
        const item = this.items.get(itemUuid);
        return item && filters.includes(item.type);
    }

    _filterWeaponType(element, filters) {
        const itemUuid = element.dataset.entryUuid;
        const item = this.items.get(itemUuid);
        return item && (item.type !== "weapon" || filters.includes(item.system.weaponType));
    }

    _filterWeaponCategory(element, filters) {
        const itemUuid = element.dataset.entryUuid;
        const item = this.items.get(itemUuid);
        return item && (item.type !== "weapon" || filters.includes(item.system.weaponCategory || "uncategorized"));
    }

    _filterArmorType(element, filters) {
        const itemUuid = element.dataset.entryUuid;
        const item = this.items.get(itemUuid);
        return item && (item.type !== "equipment" || filters.includes(item.system.armor?.type));
    }

    _filterAugmentationType(element, filters) {
        const itemUuid = element.dataset.entryUuid;
        const item = this.items.get(itemUuid);
        return item && (item.type !== "augmentation" || filters.includes(item.system?.type));
    }
    async getData() {
        null != this.items && 1 != this.forceReload || (this.items = await this.loadItems(), this.forceReload = !1, this.sortingMethods = this.getSortingMethods()), this.filters && !this.refreshFilters || (this.refreshFilters = !1, this.filters = this.getFilters());
        const t = {};
        return t.defaultSortMethod = this.getDefaultSortMethod(), t.tags = this.getTags(), t.items = this.items, t.sortingMethods = this.sortingMethods, t.filters = this.filters, t
    }
    async loadItems() {
        console.log("Starfinder | Flox Compendium Browser | Started loading items");
        const t = new Map;
        for await(const {pack: e, content: i} of betterPackLoader.loadPacks(this.entityType, this._loadedPacks)) {
            console.log(`Starfinder | Flox Compendium Browser | ${e.metadata.label} - ${i.length} entries found`);
            for (const s of i) {

                const i = {
                    uuid: `Compendium.${e.collection}.${s._id}`,
                    img: s.img,
                    name: s.name,
                    system: structuredClone(s.system),
                    type: s.type
                };

                i.system.price = s.system.price * this.options.priceModifier;
                this.allowedItem(s) && t.set(i.uuid, i)
            }
        }
        return console.log("Starfinder | Flox Compendium Browser | Finished loading items"), t
    }
    openSettings() {
        let content = '<h2>Shop/Forge Browser</h2>';
        content += '<p>The list of items is automatically generated. No settings required.</p>';

        const d = new Dialog({
            title: 'Equipment Browser settings',
            content: `${content}<br>`,
            buttons: {
                save: {
                    icon: '<i class="fas fa-check"></i>',
                    label: 'Save',
                    callback: html => {}
                }
            },
            default: 'save',
            close: html => {
                this.forceReload = true;
            }
        }, {
            width: '300px'
        });
        d.render(true);
    }

    /**
     * @typedef  {object} FilterObjectEquipment
     * @property {string[]} equipmentTypes Drawn from SFRPG.itemTypes
     * @property {string[]} weaponTypes Drawn from SFRPG.weaponTypes
     * @property {string[]} weaponCategories Drawn from SFRPG.weaponCategories
     * @see {config.js}
     */
    /**
     * Prepare the filter object before calling the parent method
     * @param {FilterObjectEquipment} filters A filter object
     */
    renderWithFilters(filters = {}) {
        const filterObject = filters;

        if (Array.isArray(filterObject.equipmentTypes)) {
            filterObject.equipmentTypes = filterObject.equipmentTypes.map(i => i === "armor" ? "equipment" : i);
        } else {
            if (filterObject.equipmentTypes === "armor") filterObject.equipmentTypes = "equipment";
        }

        return super.renderWithFilters(filterObject);
    }
}

let _equipmentBrowser = null;
export function getEquipmentBrowser() {
    if (!_equipmentBrowser) {
        _equipmentBrowser = new EquipmentBrowserSFRPG();
    }
    return _equipmentBrowser;
}