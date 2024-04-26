//import {ItemSFRPG} from "../../../../systems/sfrpg/module/item/item.js";
import {ActorSFRPG} from "../../../../systems/sfrpg/module/actor/actor.js";
import {ActorItemHelper, getFirstAcceptableStorageIndex, moveItemBetweenActorsAsync} from "../../../../systems/sfrpg/module/actor/actor-inventory-utils.js";
export function containsItems(t){
    return t&&t.system.container?.contents&&t.system.container.contents.length>0
}
export function getChildItems(t,e){
    return t&&containsItems(e)?t.filterItems((t=>e.system.container.contents.find((e=>e.id===t.id)))):[]
}
function nFormatter(num, digits) {
    var si = [
        { value: 1, symbol: "" },
        { value: 1E3, symbol: "k" },
        { value: 1E6, symbol: "M" },
        { value: 1E9, symbol: "G" },
        { value: 1E12, symbol: "T" },
        { value: 1E15, symbol: "P" },
        { value: 1E18, symbol: "E" }
    ];
    var rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
    var i;
    for (i = si.length - 1; i > 0; i--) {
        if (num >= si[i].value) {
            break;
        }
    }
    return (num / si[i].value).toFixed(digits).replace(rx, "$1") + si[i].symbol;
}
export class ActorHelper extends ActorItemHelper {
    constructor(t, e, n, o = {}) {
        super(t, e, n, o = {});
    }
    static byActor(actor){
        const tokens = actor.getActiveTokens();
        let tokenId = null;
        if(tokens.length > 0) tokenId = tokens[0].id;
        return new ActorHelper(actor.id,tokens,game?.scenes?.viewed?.id,{"actor": actor});
    }
    get itemPack() {
        return game.packs.get("world.juvencas-items");
    }
    async item(name) {
        const items = {
            soiled: "wBXCOFBVcc760FjQ",
            pee: "dkV4O741UrDLsPcP",
        }
        return await this.itemPack.getDocument(items[name]);
    }
    async addItem(item, amount = 1,target = null) {
        item = await this.item(item);

        let actElement = this.actor.items;
        if(target !== null){
            actElement = target.contents;
        }
        let found = actElement.find(i => i.name === item.name);
        if(!found) {
            const addedItems = await this.actor.createEmbeddedDocuments('Item', [item]);
            found = addedItems[0];
            const preferredStorageIndex = getFirstAcceptableStorageIndex(target,found);
            moveItemBetweenActorsAsync(this.actorHelper,found,this.actorHelper,target,1,preferredStorageIndex )
            amount -= 1;
        }
        if(amount > 0) {
            let newAmount = Number(found.system.quantity) + amount;
            await this.actorHelper.updateItem(found.id, {'quantity': newAmount });
        }
        return true;
    }
    get actorHelper() {
        return new ActorItemHelper(this.actor.id,this.actor.getActiveTokens()[0].id,game.scenes.viewed.id,{"actor": this.actor});
    }
    get actorUser() {
        const actorUser = game.users.find(user => user.character && user.character.id === this.actor.id);
        if (actorUser) return actorUser;
        return game.user;
    }

    message(targets, message, gmonly = false) {
        const gmList = game.users.filter((u) => u.isGM && u.id !== this.actorUser.id).map((u) => u.id);
        if (gmonly) {
            targets = gmList;
        } else {
            targets = targets.concat(gmList);
        }
        const chatData = {
            user: this.actorUser.id,
            speaker: ChatMessage.getSpeaker(),
            content: message,
            whisper: targets,
        };

        ChatMessage.create(chatData, {});
    }

    whisper(message, gmonly = false) {
        let list = [];
        if (!gmonly) {
            let user = this.actorUser;
            if (typeof user !== 'undefined' && user.id) {
                list.push(user.id);
            } else {
                console.log("Not received by user?");
                console.log(user);
                //message += " ERROR: This message was never received by user!";
            }
        }
        this.message(list, message, gmonly);
    }
    getModifier(target, modifier) {
        const foundMod = target.system.modifiers.find(mod => mod.name === modifier.name);
        return foundMod;
    }
    activateModifier(target, modifier){
        const modifiers = duplicate(target.system.modifiers);
        const foundMod = modifiers.find(mod => mod.name === modifier.name);

        if(foundMod){
            foundMod.enabled = true;
            target.update({"system.modifiers": modifiers});
        }
        else {
            target.addModifier(modifier)
        }
    }
    deactivateModifier(target, modifier) {
        const modifiers = duplicate(target.system.modifiers);
        const foundMod = modifiers.find(mod => mod.name === modifier.name);

        if(foundMod){
            foundMod.enabled = false;
            target.update({"system.modifiers": modifiers});
        }
    }
    removeModifier(target, modifier) {
        const filtered = target.system.modifiers.filter(mod => mod.name !== modifier.name);
        target.update({"system.modifiers": filtered});
    }
}

export class NanocyteActorHelper extends ActorHelper  {
    constructor(t, e, n, o = {}) {
        super(t, e, n, o = {});
    }
    static byActor(actor){
        const tokens = actor.getActiveTokens();
        let tokenId = null;
        if(tokens.length > 0) tokenId = tokens[0].id;
        return new NanocyteActorHelper(actor.id,tokens,game?.scenes?.viewed?.id,{"actor": actor});
    }
    get isNanocyte(){
        return !!this.actor.system.classes.nanocyte;
    }

    get nanocyteBaseMass(){
        return Math.pow(this.actor.system.classes.nanocyte.levels,2) * 1000;
    }

    updateNanocyteResources(){
        const type = "nanocyte";

        // Stability calc START
        let subType = "stability";
        const conditionItems = this.actor.items.filter(x => x.type === "actorResource" && x.system.type === type && x.system.subType === subType);
        if (conditionItems.length > 1) {
            console.log(`Found multiple actorResources matching ${type}.${subType} on actor ${this.name}, returning the first one.`);
        }
        if(conditionItems.length <= 0) return;

        let found = conditionItems[0];
        const nameGen = "Nanocyte Stability ("+ nFormatter(this.actor.system.currency.upb,2) + "/" + nFormatter(this.nanocyteBaseMass,2) + ")";
        let updates = {};

        if(found.name !== nameGen) {
            updates["name"] = nameGen;
        }
        const percentile = Math.floor( (this.actor.system.currency.upb * 100) / this.nanocyteBaseMass );

        const oldBaseVal = found.system.base
        if(oldBaseVal != percentile){
            updates["system.base"] = percentile;
        }
        if(Object.keys(updates) !== 0){
            found.update(updates);
        }
        // Stability calc END

        // Conditions START
        if(oldBaseVal <= 66){
            if(percentile > 66) {
                if (this.actor.system.conditions.fatigued) {
                    found.actor.update({"system.conditions.fatigued": false});
                }
            }
        }
        else {
            if(percentile <= 66) {
                if (!this.actor.system.conditions.fatigued) {
                    found.actor.update({"system.conditions.fatigued": true});
                }
            }
        }


        if(oldBaseVal <= 33){
            if(percentile > 33) {
                if (this.actor.system.conditions.exhausted) {
                    found.actor.update({"system.conditions.exhausted": false});
                }
            }
        }
        else {
            if(percentile <= 33) {
                if (!this.actor.system.conditions.exhausted) {
                    found.actor.update({"system.conditions.exhausted": true});
                }
            }
        }

        if(oldBaseVal <= 25){
            if(percentile > 25) {
                if (this.actor.system.conditions.unconscious) {
                    found.actor.update({"system.conditions.unconscious": false});
                }
            }
        }
        else {
            if(percentile <= 25) {
                if (!this.actor.system.conditions.unconscious) {
                    found.actor.update({"system.conditions.unconscious": true});
                }
            }
        }
        // Conditions END

    }


/*{
    "name": "Full Diapers",
    "modifier": "-5",
    "type": "circumstance",
    "modifierType": "constant",
    "effectType": "all-speeds",
    "valueAffected": "",
    "enabled": true,
    "source": "Diaper",
    "notes": "Really heavy, hu",
    "subtab": "misc",
    "condition": "",
    "max": -5
}*/
}
export class DiaperActorHelper extends ActorHelper {
    constructor(t, e, n, o = {}) {
        super(t, e, n, o = {});
    }
    static byActor(actor){
        const tokens = actor.getActiveTokens();
        let tokenId = null;
        if(tokens.length > 0) tokenId = tokens[0].id;
        return new DiaperActorHelper(actor.id,tokens,game?.scenes?.viewed?.id,{"actor": actor});
    }
    get diaper() {
        return this.actor.items.find(dp => dp.name === "Diaper" && dp.system.equipped);
    }
    get diaperCapacity(){

    }
    get diaperState() {

    }
    causeAccident() {
        this.actor.system.modifiers
    }
}
class DiapersActorSFRG extends ActorSFRPG  {
    constructor(e, t) {
        super(e, t)
    }







    /*
    getResource(type, subType) {
        if (!type || !subType) {
            return null;
        }

        const conditionItems = this.items.filter(x => x.type === "actorResource" && x.system.type === type && x.system.subType === subType);
        if (conditionItems.length > 1) {
            ui.notifications.warn(`Found multiple actorResources matching ${type}.${subType} on actor ${this.name}, returning the first one.`);
        }
        if(conditionItems.length <= 0) {
            ui.notifications.warn(`Could not find actorResources matching ${type}.${subType} on actor ${this.name}.`);
            return null;
        }
        const found = conditionItems[0];
        if(type === "nanocyte" && subType === "stability"){
            const nameGen = "Nanocyte Stability ("+ this.nanocyteBaseMass + ")";
            if(found.name !== nameGen) {
                found.update({
                    "name": nameGen
                });
            }
        }
        return conditionItems[0];
    }

    getResourceBaseValue(type, subType) {
        //if()
        const actorResource = this.getResource(type, subType);
        if (actorResource) {
            return actorResource.system.base;
        }
        return null;
    }
    setResourceRange(type,subType,max){
        const actorResource = this.getResource(type, subType);
        actorResource.update({
            "system.range.max": max
        });
    }
    let ExistingDiaper = targetActor.items.getName("Diaper");
    let targetItem = ExistingDiaper.contents.find(y => y.id = pee.id)
    if(targetItem){
        let newAmount = Number(targetItem.system.quantity) + 1;
        await helper.updateItem(targetItem.id, {'quantity': newAmount });
    }
    else {
    let addedItems = await targetActor.createEmbeddedDocuments('Item', [pee]);
    let addedItem = addedItems[0];
    const preferredStorageIndex = game.getFirstAcceptableStorageIndex(ExistingDiaper,addedItem);
    await game.moveItemBetweenActorsAsync(helper,addedItem,helper,ExistingDiaper,1,preferredStorageIndex )

 */

}