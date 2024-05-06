import {ActorSheetSFRPG} from "../../../../systems/sfrpg/module/actor/sheet/base.js";
import {
    RPC
} from "../../../../systems/sfrpg/module/rpc.js";
import {
    ActorItemHelper,
    containsItems,
    getFirstAcceptableStorageIndex,
    moveItemBetweenActorsAsync,
    initializeRemoteInventory
} from "../../../../systems/sfrpg/module/actor/actor-inventory-utils.js";
import {
    InputDialog
} from "../../../../systems/sfrpg/module/apps/input-dialog.js";

import {
    SFRPG
} from "../../../../systems/sfrpg/module/config.js";
import {
    ItemSFRPG
} from "../../../../systems/sfrpg/module/item/item.js";

import {ActorSheetSFRPGCharacter} from "../../../../systems/sfrpg/module/actor/sheet/character.js";
import {NanocyteActorHelper} from "./diapers.js";
import {makeShopLink} from "./browser.js";


export class FixedActorSheetSFRPG extends ActorSheetSFRPG {
    constructor(...e) {
        super(...e);
    }
    async processDroppedData(e, t) {
        const s = new ActorItemHelper(this.actor.id, this.token?.id, this.token?.parent?.id, {
            actor: this.actor
        });

        let price = t.price;
        let shopType = t.shopType;
        let shopName = t.shopName;

        if (!ActorItemHelper.IsValidHelper(s))
            return void ui.notifications.warn(game.i18n.format("SFRPG.ActorSheet.Inventory.Interface.DragToExternalTokenError"));
        let i = null;
        if (i = "ItemCollection" !== t.type ? (await Item.fromDropData(t)).toObject() : t.items[0], "class" === i.type) {
            const e = s.findItem((e => "class" === e.type && e.name === i.name));
            if (e) {
                const t = {};
                return t["system.levels"] = e.system.levels + 1,
                    e.update(t),
                    e
            }
        }
        if (!this.acceptedItemTypes.includes(i.type))
            return void ui.notifications.error(game.i18n.format("SFRPG.InvalidItem", {
                name: SFRPG.itemTypes[i.type],
                target: SFRPG.actorTypes[this.actor.type]
            }));
        let a = null;
        if (e) {
            const t = $(e.target).parents(".item").attr("data-item-id");
            a = s.getItem(t)
        }
        if ("ItemCollection" !== t.type) {
            if (!t.uuid.includes("Actor")) {
                if (i.system.modifiers) {
                    const e = i.system.modifiers;
                    for (const t of e) {
                        const e = t.modifier;
                        if (e)
                            try {
                                const i = Roll.create(e, s.actor.system);
                                t.max = await i.evaluate({
                                    maximize: !0
                                }).total
                            } catch {
                                t.max = 0
                            }
                        else
                            t.max = 0
                    }
                }
                if ("spell" === i.type && game.settings.get("sfrpg", "scalingCantrips") && ItemSFRPG._onScalingCantripDrop(i, s), "effect" === i.type) {
                    const {
                        context: e
                    } = t;
                    e && (i.system.context = e)
                }
                const e = await s.createItem(i);
                if (e.length > 0) {
                    const t = s.getItem(e[0].id);
                    if (a) {
                        let e = [];
                        a.system.container?.contents && (e = duplicate(a.system.container?.contents || []));
                        const i = getFirstAcceptableStorageIndex(a, t) || 0;
                        e.push({
                            id: t.id,
                            index: i
                        });
                        const r = {
                            id: a.id,
                            "system.container.contents": e
                        };
                        await s.updateItem(a.id, r)
                    }
                    return t
                }
                return null
            } {
                const r = fromUuidSync(t.uuid)?.actor || await(fromUuid(t.uuid)?.actor),
                    n = r.isToken ? r.token.id : null,
                    o = r.isToken ? r.token.parent.id : null,
                    l = new ActorItemHelper(r.id, n, o);
                if (!ActorItemHelper.IsValidHelper(l))
                    return void ui.notifications.warn(game.i18n.format("SFRPG.ActorSheet.Inventory.Interface.DragFromExternalTokenError"));
                const c = l.getItem(i._id);
                if (e.shiftKey)
                    InputDialog.show(game.i18n.format("SFRPG.ActorSheet.Inventory.Interface.AmountToTransferTitle"), game.i18n.format("SFRPG.ActorSheet.Inventory.Interface.AmountToTransferMessage"), {
                        amount: {
                            name: game.i18n.format("SFRPG.ActorSheet.Inventory.Interface.AmountToTransferLabel"),
                            label: game.i18n.format("SFRPG.ActorSheet.Inventory.Interface.AmountToTransferInfo", {
                                max: c.system.quantity
                            }),
                            placeholder: c.system.quantity,
                            validator: e => {
                                const t = Number(e);
                                return !Number.isNaN(t) && (!(t < 1) && !(t > c.system.quantity))
                            }
                        }
                    }, (t => {
                        const i = moveItemBetweenActorsAsync(l, c, s, a, t.amount);
                        i === c && this._onSortItem(e, i)
                    }));
                else {
                    const t = await moveItemBetweenActorsAsync(l, c, s, a);
                    if (t === c)
                        return await this._onSortItem(e, t)
                }
            }
        } else {
            const e = {
                target: s.toObject(),
                source: {
                    actorId: null,
                    tokenId: t.tokenId,
                    sceneId: t.sceneId
                },
                draggedItems: t.items,
                containerId: a ? a.id : null
            };
            "errorRecipientNotAvailable" === RPC.sendMessageTo("gm", "dragItemFromCollectionToPlayer", e) && ui.notifications.warn(game.i18n.format("SFRPG.ActorSheet.Inventory.Interface.ItemCollectionPickupNoGMError"))
        }
    }
}
export class FixedActorSheetSFRPGCharacter extends ActorSheetSFRPGCharacter {
    constructor(...e) {
        super(...e);
    }
    static freeTypes = [
        "actorResource",
        "feat",
        "spell",
        "effect",
        "archetypes",
        "class",
        "race",
        "theme",
        "asi"
    ];


    async triggerBuy(item,data){
        if (data.uuid === undefined || !data.uuid.startsWith('Compendium')) return;
        if(this.constructor.freeTypes.includes(item.type)) return;

        const compendiums = JSON.stringify(data.compendiums);

        const t = {};

        let act;
        let cost;
        if(data.shopType === "nanoforge"){
            act = "Forged";

            if(data.price > 0) {
                t["system.currency.upb"] = this.actor.system.currency.upb - data.price;
                cost = `${data.price} UPBs`;
            }
            else {
                cost = `free`;
            }
        } else if(data.shopType === "free" || data.price === undefined || data.price <= 0){
            act = "Got";
            cost = `free`;
            return; // Don't display buying for free for now
        }
        else {
            if(data.price > 0) {
                act = "Bought";
                t["system.currency.credit"] = this.actor.system.currency.credit - data.price;
                cost = `${data.price} Credits`;
            }
            else {
                act = "Got";
                cost = `free`;
            }
        }
        this.actor.update(t);

        const finalText = `${act} ${item.name} for ${cost}`;
        if(data.shopReopen === "true") {
            makeShopLink(this.actor,finalText,compendiums,data.priceModifier,data.shopName,data.shopType,data.shopReopen === "true");
        }
        else {
            const chatData = {
                user: this.actor.id,
                speaker: ChatMessage.getSpeaker(),
                content: finalText
            };

            ChatMessage.create(chatData, {});
        }
        //game.user.isGM
    }
    getCompendiumName(fullItemName) {
        // Split the full item name by the dot character
        const parts = fullItemName.split('.');

        if (parts[0] !== 'Compendium') return undefined

        // Assuming the compendium name always starts from the second part and ends before the last two parts
        // We join the middle parts which represent the compendium name
        return parts.slice(1, parts.length - 2).join('.');
    }

    async processDroppedData(e, t) {
        const s = new ActorItemHelper(this.actor.id, this.token?.id, this.token?.parent?.id, {
            actor: this.actor
        });
        const originalDate = structuredClone(t);
        if (!ActorItemHelper.IsValidHelper(s))
            return void ui.notifications.warn(game.i18n.format("SFRPG.ActorSheet.Inventory.Interface.DragToExternalTokenError"));
        let i = null;
        if (i = "ItemCollection" !== t.type ? (await Item.fromDropData(t)).toObject() : t.items[0], "class" === i.type) {
            const e = s.findItem((e => "class" === e.type && e.name === i.name));
            if (e) {
                const t = {};
                return t["system.levels"] = e.system.levels + 1,
                    e.update(t),
                    e
            }
        }
        if (!this.acceptedItemTypes.includes(i.type))
            return void ui.notifications.error(game.i18n.format("SFRPG.InvalidItem", {
                name: SFRPG.itemTypes[i.type],
                target: SFRPG.actorTypes[this.actor.type]
            }));
        let a = null;
        if (e) {
            const t = $(e.target).parents(".item").attr("data-item-id");
            a = s.getItem(t)
        }
        if ("ItemCollection" !== t.type) {
            if (!t.uuid.includes("Actor")) {
                if (i.system.modifiers) {
                    const e = i.system.modifiers;
                    for (const t of e) {
                        const e = t.modifier;
                        if (e)
                            try {
                                const i = Roll.create(e, s.actor.system);
                                t.max = await i.evaluate({
                                    maximize: !0
                                }).total
                            } catch {
                                t.max = 0
                            }
                        else
                            t.max = 0
                    }
                }
                if ("spell" === i.type && game.settings.get("sfrpg", "scalingCantrips") && ItemSFRPG._onScalingCantripDrop(i, s), "effect" === i.type) {
                    const {
                        context: e
                    } = t;
                    e && (i.system.context = e)
                }
                const e = await s.createItem(i);
                if (e.length > 0) {
                    const t = s.getItem(e[0].id);
                    try {
                        if (a) {
                            let e = [];
                            a.system.container?.contents && (e = duplicate(a.system.container?.contents || []));
                            const i = getFirstAcceptableStorageIndex(a, t) || 0;
                            e.push({
                                id: t.id,
                                index: i
                            });
                            const r = {
                                id: a.id,
                                "system.container.contents": e
                            };
                            await s.updateItem(a.id, r)
                        }
                    } catch (error) {
                        console.error("Error while processing moving to container:", error);
                    }

                    await this.triggerBuy(t,originalDate);
                    return t
                }
                return null
            } {
                const r = fromUuidSync(t.uuid)?.actor || await(fromUuid(t.uuid)?.actor),
                    n = r.isToken ? r.token.id : null,
                    o = r.isToken ? r.token.parent.id : null,
                    l = new ActorItemHelper(r.id, n, o);
                if (!ActorItemHelper.IsValidHelper(l))
                    return void ui.notifications.warn(game.i18n.format("SFRPG.ActorSheet.Inventory.Interface.DragFromExternalTokenError"));
                const c = l.getItem(i._id);
                if (e.shiftKey)
                    InputDialog.show(game.i18n.format("SFRPG.ActorSheet.Inventory.Interface.AmountToTransferTitle"), game.i18n.format("SFRPG.ActorSheet.Inventory.Interface.AmountToTransferMessage"), {
                        amount: {
                            name: game.i18n.format("SFRPG.ActorSheet.Inventory.Interface.AmountToTransferLabel"),
                            label: game.i18n.format("SFRPG.ActorSheet.Inventory.Interface.AmountToTransferInfo", {
                                max: c.system.quantity
                            }),
                            placeholder: c.system.quantity,
                            validator: e => {
                                const t = Number(e);
                                return !Number.isNaN(t) && (!(t < 1) && !(t > c.system.quantity))
                            }
                        }
                    }, (t => {
                        const i = moveItemBetweenActorsAsync(l, c, s, a, t.amount);
                        this.triggerBuy(t,originalDate);
                        i === c && this._onSortItem(e, i)
                    }));
                else {
                    const t = await moveItemBetweenActorsAsync(l, c, s, a);
                    await this.triggerBuy(t,originalDate);
                    if (t === c)
                        return await this._onSortItem(e, t)
                }
            }
        } else {
            if(!RPC.rpc.callbacks["dragItemToCollection"]) {
                initializeRemoteInventory();
            }
            const e = {
                target: s.toObject(),
                source: {
                    actorId: null,
                    tokenId: t.tokenId,
                    sceneId: t.sceneId
                },
                draggedItems: t.items,
                containerId: a ? a.id : null
            };
            "errorRecipientNotAvailable" === RPC.sendMessageTo("gm", "dragItemFromCollectionToPlayer", e) && ui.notifications.warn(game.i18n.format("SFRPG.ActorSheet.Inventory.Interface.ItemCollectionPickupNoGMError"))
        }
    }
}
