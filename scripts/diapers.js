//import {ItemSFRPG} from "../../../../systems/sfrpg/module/item/item.js";
//import {ActorSFRPG} from "../../../../systems/sfrpg/module/actor/actor.js";
import {ActorSheetSFRPG} from "../../../../systems/sfrpg/module/actor/sheet/base.js";


import {ActorItemHelper, getFirstAcceptableStorageIndex, moveItemBetweenActorsAsync} from "../../../../systems/sfrpg/module/actor/actor-inventory-utils.js";
export function containsItems(t){
    return t&&t.system.container?.contents&&t.system.container.contents.length>0
}
export function getChildItems(t,e){
    return t&&containsItems(e)?t.filterItems((t=>e.system.container.contents.find((e=>e.id===t.id)))):[]
}
export function getRandomKey(obj) {
    const itemNames = Object.keys(obj);
    if (itemNames.length === 0) {
        throw new Error("Object is empty");
    }
    return itemNames[Math.floor(Math.random() * itemNames.length)];
}
export function getRandomValue(obj) {
    return obj[getRandomKey(obj)];
}
String.prototype.formatUnicorn = String.prototype.formatUnicorn ||
    function () {
        "use strict";
        var str = this.toString();
        if (arguments.length) {
            var t = typeof arguments[0];
            var key;
            var args = ("string" === t || "number" === t) ?
                Array.prototype.slice.call(arguments)
                : arguments[0];

            for (key in args) {
                str = str.replace(new RegExp("\\{" + key + "\\}", "gi"), args[key]);
            }
        }

        return str;
    };
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
        super(t, e, n, o);
    }
    static byActor(actor){
        if(actor?.ownership === undefined || game?.user?.id === undefined) return undefined;
        if(actor.ownership[game.user.id] !== 3 && game?.user?.isGM !== true) return undefined;

        const tokens = actor.getActiveTokens();
        let tokenId = null;
        if(tokens.length > 0) tokenId = tokens[0].id;
        return new this(actor.id,tokenId,game?.scenes?.viewed?.id,{"actor": actor});
    }
    get itemPack() {
        return game.packs.get("juvencas-flox.juvencas-items");
    }
    async item(name) {
        const items = {

        }

        return await this.itemPack.getDocument(items[name]);
    }
    async addItem(item, amount = 1,target = null) {
        item = await this.item(item);

        let actElement = this.actor.items;
        if(target?.contents !== undefined){
            actElement = target.contents;
        }
        let found = actElement.find(i => i.name === item.name && (i.parentItem === undefined || i.parentItem === target));
        if(!found) {
            const addedItems = await this.actor.createEmbeddedDocuments('Item', [item]);
            found = addedItems[0];
            amount -= 1;
            try {
                const preferredStorageIndex = getFirstAcceptableStorageIndex(target,found);
                moveItemBetweenActorsAsync(this.actorHelper,found,this.actorHelper,target,1,preferredStorageIndex)
            }
            catch (e) {}
        }
        if(amount > 0) {
            let newAmount = Number(found.system.quantity) + amount;
            await this.actorHelper.updateItem(found.id, {'quantity': newAmount });
        }
        return true;
    }
    async getItems(item,target){
        item = await this.item(item);

        let actElement = this.actor.items;
        if(target?.contents !== undefined){
            actElement = target.contents;
        }
        return actElement.filter(i => i.name === item.name);
    }
    get actorHelper() {
        return new ActorItemHelper(this.actor.id,this.actor.getActiveTokens()[0].id,game.scenes.viewed.id,{"actor": this.actor});
    }
    get actorUser() {
        const actorUser = game.users.find(user => user.character && user.character.id === this.actor.id);
        if (actorUser) return actorUser;
        return game.user;
    }
    get unconscious(){
        return this?.actor?.system?.conditions?.unconscious === true;
    }

    getActorResource(type,subType){
        const conditionItems = this.actor.items.filter(x => x.type === "actorResource" && x.system.type === type && x.system.subType === subType);
        if (conditionItems.length > 1) {
            console.log(`Found multiple actorResources matching ${type}.${subType} on actor ${this.name}, returning the first one.`);
        }
        if(conditionItems.length <= 0) return undefined;
        return conditionItems[0];
    }
    getActorResourceInstance(type,subType){
        const resourceList =  this.actor?.system?.resources;
        if(resourceList === undefined) return undefined;
        if(resourceList[type] === undefined) return undefined;
        return resourceList[type][subType];
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
        super(t, e, n, o);
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
        let found = this.getActorResource(type,subType);
        if(found === undefined) return; // Stability calc will only work with stability existing

        const nameGen = "Nanocyte Stability ("+ nFormatter(this.actor.system.currency.upb,2) + "/" + nFormatter(this.nanocyteBaseMass,2) + ")";
        let updates = {};

        if(found.name !== nameGen) {
            updates["name"] = nameGen;
        }
        const percentile = Math.floor( (this.actor.system.currency.upb * 100) / this.nanocyteBaseMass );

        const oldBaseVal = found.system.base
        if(oldBaseVal !== percentile){
            updates["system.base"] = percentile;
        }
        if(Object.keys(updates).length > 0){
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
        super(t, e, n, o);
    }
    static PEE = "Pee";
    static POO = "Poop";
    static CUM = "Cum";
    static WATER = "Water";

    static POO_ALLOWED_POTTY_TRAINING = "Stinky";
    static CUM_ALLOWED_POTTY_TRAINING = "Naughty";

    static DIAPER_STATE_KEY = "protection.state";
    static DIAPER_CAPACITY_KEY = "protection.capacity";
    static POTTY_TRAINING_KEY = "potty.training";

    static CUM_PREVENTION = "Caged";

    static DIRTY_CLOTH = "Soiled Cloth";

    static STATE_CONCENTRATING = "concentrating";
    static items = {
        // Fluids
        [this.PEE]: "dkV4O741UrDLsPcP",
        [this.POO]: "F8njSFNStuMBqCzG",
        [this.CUM]: "4tLWbPTmzDnxOC8X",
        [this.WATER]: "I6sgq423yMtlp4cg",

        // Additional Trainings
        [this.POO_ALLOWED_POTTY_TRAINING]: "7ptWGtpU7hnLoIHf",
        [this.CUM_ALLOWED_POTTY_TRAINING]: "4UO4QD4eje9LFXYQ",

        // Buffs/Debuffs
        [this.DIRTY_CLOTH]: "a5WzbEPn0gyEO3AM",
    }

    async item(name) {
        if (!(name in this.constructor.items)) {
            throw new Error(`Item ${name} not found in items list`);
        }
        return await this.itemPack.getDocument(this.constructor.items[name]);
    }
    static getItemCapacity(item){
        let capacity = 0;
        item.system.modifiers.forEach(mod => {
            if(mod.enabled && mod.effectType === "actor-resource" && mod.valueAffected === DiaperActorHelper.DIAPER_CAPACITY_KEY){
                capacity = mod.max;
            }
        });
        return capacity;
    }

    static canWetTypes = [
        "container",
        "equipment",
        "goods",
        "hybrid",
        "magic",
        "shield",
        "technological"
    ];
    get wetableCloth(){
        const items = [];
        this.actor.system.allModifiers.forEach(mod => {
           if(mod.enabled && mod.effectType === "actor-resource" && mod.valueAffected === DiaperActorHelper.DIAPER_CAPACITY_KEY){
               if(DiaperActorHelper.canWetTypes.includes(mod.item.type)) {
                   if(mod.item.parent === this.actor) {
                       items.push({"item": mod.item, "max": mod.max});
                   }
               }
           }
        });
        items.sort((a, b) => b.max - a.max); // high first
        return items;
    }
    get diaper(){
        const clothing = this.wetableCloth;
        if(!clothing[0]) return undefined;
        return clothing[0].item;
    }
    get diaperProtectionLevel(){
        const clothing = this.wetableCloth;
        if(!clothing[0]) return 0;
        return clothing[0].max;
    }
    get diaperWetness(){
        const diaper = this.diaper;
        if(!diaper) return 0;
        return this.constructor.fluidAmount(diaper);
    }
    async wetCloth(itemName,toAdd, target){
        if(target.max === undefined){
            target = {"item": target, "max": this.constructor.getItemCapacity(target)};
        }
        const diff = target.max - this.constructor.fluidAmount(target);
        if(diff > 0){
            const reallyToAdd = Math.min(diff,toAdd);
            await this.addItem(itemName, reallyToAdd, target.item);

            return toAdd-reallyToAdd;
        }

        return toAdd;
    }
    static fluids(target) {
        if(target.filter === undefined) target = this.targetToContentList(target);
        return target.filter(dp => dp.name === this.PEE || dp.name === this.POO
            || dp.name === this.CUM || dp.name === this.WATER);
    }
    static fluidAmount(target){
        return this.amount(this.fluids(target))
    }
    static targetToContentList(target){
        let targetList = [];
        if(target?.item !== undefined) target = target.item;
        if(target?.contents !== undefined) targetList = target.contents;
        else if (target?.items !== undefined) targetList = target.items;
        return targetList;
    }
    static amount(target){
        if(target.forEach === undefined) target = this.targetToContentList(target);
        let amount = 0;
        target.forEach(item => amount += Number(item.system.quantity));
        return amount;
    }
    updateDiaperStateResources() {
        const diaperWetness = this.diaperWetness;
        const diaperProtection = this.diaperProtectionLevel;
        const allFluids = this.allFluidsCount;
        const allProtection = this.protectionLevel;
        const clothWetness = allFluids - diaperWetness;
        const clothProtection = allProtection - diaperProtection;

        // Diaper Capacity calc START
        const diaperCapacityUpdates = {};

        const [diaperTypeStr, diaperCapacityStr] = this.constructor.DIAPER_CAPACITY_KEY.split(".");
        const dpCapacity = this.getActorResource(diaperTypeStr,diaperCapacityStr);

        if(dpCapacity !== undefined){
            const diaperCapacityNameGen = `Protection Capacity (Diaper: ${diaperWetness}/${diaperProtection}, Cloth: ${clothWetness}/${clothProtection})`;
            if(dpCapacity.name !== diaperCapacityNameGen && diaperCapacityNameGen){
                diaperCapacityUpdates["name"] = diaperCapacityNameGen;
            }
            if (Object.keys(diaperCapacityUpdates).length > 0) {
                dpCapacity.update(diaperCapacityUpdates);
            }
        }
        // Diaper Capacity calc END

        // Diaper State calc END
        let diaperStateUpdates = {};
        const [diaperStateTypeStr, diaperStateStr] = this.constructor.DIAPER_STATE_KEY.split(".");
        const dpState = this.getActorResource(diaperStateTypeStr,diaperStateStr);
        if(dpState !== undefined) {
            let diaperCapacityPercent = 1;
            if(diaperProtection > 0){
                diaperCapacityPercent = diaperWetness / diaperProtection;
            }
            if(diaperCapacityPercent >= 1){
                if(clothProtection > 0) {
                    diaperCapacityPercent = ((clothWetness / clothProtection) / 2) + diaperCapacityPercent;
                }
                else if(allFluids > allProtection){
                    diaperCapacityPercent = 2;
                }
            }

            const diaperCapacity = Math.floor(100 - (diaperCapacityPercent * 100));
            const oldBaseVal = dpState.system.base;
            if (oldBaseVal !== diaperCapacity && !isNaN(Number(diaperCapacity))) {
                diaperStateUpdates["system.base"] = diaperCapacity;
            }
            if (Object.keys(diaperStateUpdates).length > 0) {
                dpState.update(diaperStateUpdates);
                diaperStateUpdates = {};
            }

            const diaperStateCombTrack = this.getCombatTrackerData(dpState);
            const diaperStateNameGen = "Protection State (" + diaperStateCombTrack.title + ")";
            if (dpState.name !== diaperStateNameGen && diaperStateNameGen) {
                diaperStateUpdates["name"] = diaperStateNameGen;
                if(diaperStateCombTrack.image) {
                    diaperStateUpdates["img"] = diaperStateCombTrack.image;
                }
            }

            if (Object.keys(diaperStateUpdates).length > 0) {
                dpState.update(diaperStateUpdates);
            }
        }
        // Diaper State calc END
    }

    getCombatTrackerData(resource){
        const o = this.actor.getResourceComputedValue(resource.system.type, resource.system.subType);
        let s = ""
            , c = resource.img
            , i = o;
        if (resource.system.combatTracker.displayAbsoluteValue && (i = Math.abs(i)),
            resource.system.combatTracker.visualization)
            for (const e of resource.system.combatTracker.visualization)
                switch (e.mode) {
                    case "eq":
                        o === e.value && (s = e.title || s,
                            c = e.image || c);
                        break;
                    case "neq":
                        o !== e.value && (s = e.title || s,
                            c = e.image || c);
                        break;
                    case "gt":
                        o > e.value && (s = e.title || s,
                            c = e.image || c);
                        break;
                    case "gte":
                        o >= e.value && (s = e.title || s,
                            c = e.image || c);
                        break;
                    case "lt":
                        o < e.value && (s = e.title || s,
                            c = e.image || c);
                        break;
                    case "lte":
                        o <= e.value && (s = e.title || s,
                            c = e.image || c)
                }
        return { title: s, image: c };
    }

    static scaleValue(x, upperLimit, lowerLimit) {
        const slope = 200 / (lowerLimit - upperLimit);
        const intercept = 100 - slope * upperLimit;
        return slope * x + intercept;
    }
    requirePottyTraining(){
        if(this.pottyTraining) return true;
        console.log("Macro | " + this.actor.name + " is not able to have pee accidents!");
        return false;
    }

    get pottyTraining() {
        const [diaperTypeStr, diaperCapacityStr] = this.constructor.DIAPER_CAPACITY_KEY.split(".");
        return this.getActorResourceInstance(diaperTypeStr,diaperCapacityStr);
    }
    requirePoopPottyTraining(){
        if(this.poopPottyTraining) return true;
        console.log("Macro | " + this.actor.name + " is not able to have poopy accidents!");
        return false;
    }
    get poopPottyTraining() {
        return this.actor.items.find(i => i.name === this.constructor.POO_ALLOWED_POTTY_TRAINING)
    }
    requireCumPottyTraining(){
        if(this.cumPottyTraining) return true;
        console.log("Macro | " + this.actor.name + " is not able to have cum accidents!");
        return false;
    }
    get cumPottyTraining() {
        return this.actor.items.find(i => i.name === this.constructor.CUM_ALLOWED_POTTY_TRAINING)
    }
    get protectionLevel(){
        const capacity = this.pottyTraining;
        if(capacity?.value !== undefined) return capacity.value;
        return 0;
    }
    accidentAllowed(type){
        if(type === this.constructor.PEE) return !!this.pottyTraining;
        if(type === this.constructor.POO) return !!this.poopPottyTraining;
        if(type === this.constructor.CUM) return !!this.cumPottyTraining;
        if(type === this.constructor.WATER) return !!this.cumPottyTraining;
        throw Error("Accident Type unknown: " + type);
    }

    get allFluidsCount() {
        return this.constructor.fluidAmount(this.actor);
    }

    checkModifierImpact(modifiers){
        const found = modifiers.filter(m => m.enabled && m.item && this.constructor.sourceToItemName(m) === this.constructor.DIAPER_STATE_KEY);
        found.forEach(m => this.rollPottyCheck(m));
    }
    static sourceToName(source){
        if(source.name) {
            return source.name;
        }
        else {
            return source;
        }
    }
    static accidentResults = {
        [this.DIAPER_STATE_KEY]: {[this.PEE]: 40,[this.POO]: 20},
        [this.POO_ALLOWED_POTTY_TRAINING]: {[this.POO]: 100},
        [this.CUM_ALLOWED_POTTY_TRAINING]: {[this.CUM]: 100}
    }
    static actorResourceToName(resource){
        if(resource.type !== "actorResource") {
            console.log(resource);
            throw Error("Not an actorResource");
        }
        return `${resource.system.type}.${resource.system.subType}`;
    }
    static sourceToItemName(source){
        if(source.item?.type === "actorResource"){
            return this.actorResourceToName(source.item);
        }
        else if(source.item?.name !== undefined) {
            return source.item?.name;
        }
        else if(source.name) {
            return source.name;
        }
        else {
            return source;
        }
    }
    async rollPottyCheck(source,effectAmount = 1){
        const sourceName = this.constructor.sourceToItemName(source);
        console.log(`Potty check for ${sourceName}`)
        let accidentMap;
        if(this.constructor.accidentResults[sourceName]){
            accidentMap = this.constructor.accidentResults[sourceName];
            console.log("Found AccidentMap for "+sourceName);
        }
        else {
            accidentMap = this.constructor.accidentResults[this.constructor.DIAPER_STATE_KEY];
            console.log("Selecting default AccidentMap for "+sourceName);
        }
        var hadAccident = false;
        for (const [accidentType, accidentChance] of Object.entries(accidentMap)) {
            if( (Math.random() * 100.0) <= accidentChance){
                var amountMultiply = Math.ceil(Math.random() * 4);
                if(this.accidentAllowed(accidentType)){
                    await this.accidentManager(accidentType,effectAmount * amountMultiply, undefined, source);
                    hadAccident = true;
                    break;
                }
                else if(this.accidentAllowed(this.constructor.PEE)){
                    await this.accidentManager(this.constructor.WATER,effectAmount * amountMultiply * 2, undefined, source);
                    hadAccident = true;
                    break;
                }
                else if(this.accidentAllowed(this.constructor.WATER)){
                    await this.accidentManager(this.constructor.WATER,effectAmount * amountMultiply * 2, undefined, source);
                    hadAccident = true;
                    break;
                }
                else {
                    throw Error("No valid accident type found for "+ this.actor.name);
                }
            }
        }
    }

    get isConscious(){
        return true;
    }
    async accidentManager(itemName, amount, subType = undefined, source) {
        if(subType === undefined) subType = this.isConscious ? "normal" : "dream";
        if (amount > 0) {
            /*if(this.protectionLevel > this.diaperFluidsCount) {
                const toAdd = Math.min(this.protectionLevel-this.diaperFluidsCount,amount);
                amount -= toAdd;*/

            for (const itm of this.wetableCloth) {
                amount = await this.wetCloth(itemName, amount, itm);
                if(amount <= 0) {
                    await this.informAboutAccident(itemName,subType, source);
                    return;
                }
            }

            if(amount > 0){
                await this.addItem(itemName, amount);
                await this.informAboutAccident(itemName,"accident", source);
            }
            /*if(amount > 0) {
                console.log(`Macro | wetManager failed to execute request. ${amount} left in request.`);
            }*/
        }
        return false;
    }

    static informsMsg = {
        [this.DIAPER_STATE_KEY]: {
            normal: ["{name} was concentrating really hard on what they are doing.","What was that?", "Is that...","Momentarily distracted {name} forgot something...","This is trifficult!"]
        },
        [this.STATE_CONCENTRATING]: {
            normal: ["{name} was concentrating really hard on what they are doing.","What was that?", "Is that...","Momentarily distracted {name} forgot something...","This is trifficult!"],
            dream: ["Deep in a slumber.","While sleeping."]
        },
        [this.PEE]: {
            normal: ["{name} pauses their adventure, looking 🌧 momentarily puzzled 🌧, but then continues with a contented grin.",
                "A warm glow seems to emanate from {name}, and they look more 🌧 relaxed 🌧 than before.", "You hear a surprised noise from {name} as their diaper is getting 🌧 warm 🌧.",
                "{name}'s cheeks turn a slight shade of pink as they momentarily shift from 🌧 foot to foot 🌧.",
                "{name} momentarily glances down, then up with a reassured smile as if a 🌧 mild inconvenience 🌧 was smoothly handled by their diaper."],
            dream: ["A gentle, warm spring bubbles up in {name}'s dreamland, surrounding them with 🌧 soothing warmth 🌧.","In one of {name}'s dreams it seams to 🌧 rain 🌧.",
                "A very big, 🌧 warm lake 🌧. {name} feels happy and relaxed.", "{name} feels fuzzy and warm.", "Unnoticed by {name}, a 🌧 containment breach 🌧 occurred under the blankie.",
                "{name} dreams of floating down a peaceful river, basking in the gentle warmth of the sun.","{name} dreams of exploring a lush, alien planet with streams of 🌧 liquid gold 🌧 that feel pleasantly warm.",
                "In the dreamspace, {name} visits a thermal moon where geysers burst with soothing, 🌧 warm vapors 🌧."],
            accident: ["Oops! Looks like {name}'s diapers had 🌧 containment breach 🌧! Clean-up required!",
                "Unexpectedly, there seems to be a major 🌧 leak 🌧 around {name}. Maintenance required immediatly.",
                "Looks like {name}'s containment system was overwhelmed. There's a bit of a 🌧 spill 🌧 that needs attention!",
                "There’s a noticeable 🌧 puddle 🌧 forming around {name}, an indication of an unexpected overflow."]},
        [this.POO]: {
            normal: ["{name} takes a moment, concentrating intensely on a 💩 'difficult task' 💩 before smiling triumphantly.",
                "{name} freezes up for a second and squats down. They makes a small, cute noise followed by a 💩 relieved 💩 smile.",
                "You notice {name} engaging in some secretive, 💩 strenuous activity 💩, but they soon look up with a grin of success.",
                "Suddenly, {name} hunches over slightly, their face shows determination, followed by a joyful 💩 relief 💩.",
                "Something strange gurgles in the tummy of {name}. They squad down a bit and 💩 push 💩 slightly. That feels a lot better!"],
            dream: [
                "A princes appears in the dreams of {name}. They ask for help pushing a big door open. You push and 💩 push 💩! Its very hard! You strain again and finally it gives way. Phu!",
                "Half asleep {name} feels a tummy ache. They strain, trying to make it go away. A 💩 big sigh 💩 of relieve as they fall asleep.",
                "Investigating a big muddy swamp, {name} suddenly gets stuck. 💩 Icky 💩!",
                "Dreaming of a mysterious space station, {name} solves an intricate puzzle to unlock a sealed portal, 💩 clearing 💩 an ancient venting shaft.",
                "Midway through deciphering alien glyphs on their blocks, {name}'s diaper encounters an unexpected 💩 system overload 💩, prompting an emergency maintenance break.",
                "{name} dreams of being a famous baker, kneading a particularly stubborn dough until it's just 💩 perfect 💩.",
                "Lost in a foggy forest in their dreams, {name} stumbles upon a stubborn log blocking their path. With 💩 great effort 💩, they manage to move it aside."],
            accident: ["Uh oh! {name} has experienced a major 💩 containment failure 💩. Immediate assistance needed!",
                "An unexpected 💩 mishap 💩 has occurred near {name}, suggesting a cleanup squad might be needed!",
                "It appears {name} overestimated their 💩 containment capacity 💩. A bath is in order!",
                "{name}'s adventures lead to an unplanned escape attempt by some rebellious cargo!"]
        },
        [this.CUM]: {
            normal: ["{name} feels themself getting close! It's amazing, it's OH! ♥ OH ♥!!", "{name} making more and more happy noises until something happens. They makes another ♥ cute noise ♥, followed by a really big smile!"],
            dream: ["{name} dreams of a happy place, it feels soooo ♥ good ♥! But oddly sticky...",
                "In deep dream, it comes! You are the winner! {name} don't know of what but it feel good! Its ♥ exhilarating ♥! Phu!",
                "Half asleep {name} feels how something amazing is happening. It builds and finally releases in a ♥ big clash ♥! Exhausted they fall asleep immediately."],
            accident: ["Oh NO! {name}'s energetic humping ripped open their diaper. It's... it's everywhere! What a ♥ sticky ♥ mess!"]
        },
        [this.CUM_PREVENTION]: {
            normal: ["{name} gets tense and agitated, red in the face and whiny. But but 🔐 nothing 🔐 really happens, beside some cute noises."],
            dream: ["{name} dreams of their happy place, but something 🔐 prevents 🔐 them from climbing onto the happy cloud, floating above."]
        }
    };

    infoMsg(type,subType){
        let key = this.constructor.informsMsg[type][subType];
        if(key === undefined){
            key = this.constructor.informsMsg[type]["normal"];
        }
        return getRandomValue(key).formatUnicorn({"name" : this.actor.name})
    }
    async informAboutAccident(type,subType,source = this.constructor.STATE_CONCENTRATING) {
        console.log(`Macro | ${this.actor.name} had an ${type}-Accident of ${type}`);

        const sourceName = this.constructor.sourceToName(source);

        let watcherPerspective = `${this.actor.name} uses "${sourceName}". `;
        const messageHeaderPC = "<b>Uh-Oh!</b><br>";
        const messageHeaderGM = "<b>Accident Report</b><br>";
        let messageContentGM = "";

        let sneakDcMod = 0;
        let selfAwarenessDifficultDcMod = 10;
       // watcherPerspective += this.infoMsg(reason,subType);
        const accident = subType === "accident"

        if (type === this.constructor.PEE) {
            messageContentGM += `${this.actor.name} wet themselfs<br><br>`;
            watcherPerspective+= this.infoMsg(type,subType);

            if(accident){
                messageContentGM += `${this.actor.name} had a major pee accident!<br><br>`;
            }

        } else if (type === this.constructor.POO) {
            messageContentGM += `${this.actor.name} pooped himself<br><br>`;
            watcherPerspective+= this.infoMsg(type,subType);

            if(accident){
                messageContentGM += `${this.actor.name} had a major poop accident!<br><br>`;
            }
        } else if (type === this.constructor.CUM) {
            watcherPerspective+= this.infoMsg(type,subType);
            messageContentGM += `${this.actor.name} did cummies<br><br>`;
            if(accident){
                messageContentGM += `${this.actor.name} had a major cummies accident<br><br>`;
            }
        } else if (type === this.constructor.CUM_PREVENTION) {
            watcherPerspective+= this.infoMsg(type,subType);
            messageContentGM += `${this.actor.name} got denied cummies<br><br>`;
            // There are no accidents for denied, as there is no fluid
        } else {
            console.error(`Macro | informAboutAccident encountered unknown type ${type}`)
        }

        const chatData = {
            user: this.actorUser.id,
            speaker: ChatMessage.getSpeaker(),
            content: messageHeaderPC + watcherPerspective
        };

        ChatMessage.create(chatData, {});
    }
    async informAboutNoAccident(type,subType,source = this.constructor.STATE_CONCENTRATING) {
        console.log(`Macro | ${this.actor.name} had NO Accident`);

        const sourceName = this.constructor.sourceToName(source);

        let watcherPerspective = `${this.actor.name} uses "${sourceName}". `;
        const messageHeaderPC = "<b>Phuu!</b><br>";
        let messageContentGM = "";

        let sneakDcMod = 0;
        let selfAwarenessDifficultDcMod = 10;
        // watcherPerspective += this.infoMsg(reason,subType);
        const accident = subType === "accident"

        messageContentGM += `${this.actor.name} could hold it, this time.<br><br>`;
        watcherPerspective+= "Could hold it, this time!";

        const chatData = {
            user: this.actorUser.id,
            speaker: ChatMessage.getSpeaker(),
            content: messageHeaderPC + watcherPerspective
        };

        ChatMessage.create(chatData, {});
    }
}