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
        super(t, e, n, o = {});
    }
    static byActor(actor){
        const tokens = actor.getActiveTokens();
        let tokenId = null;
        if(tokens.length > 0) tokenId = tokens[0].id;
        return new ActorHelper(actor.id,tokens,game?.scenes?.viewed?.id,{"actor": actor});
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
        super(t, e, n, o = {});
    }
    static PEE = "Pee";
    static POO = "Poop";
    static CUM = "Cum";
    static WATER = "Water";

    static DEFAULT_POTTY_TRAINING = "Accident Prone";
    static POO_ALLOWED_POTTY_TRAINING = "Stinky";
    static CUM_ALLOWED_POTTY_TRAINING = "Naughty";

    static CUM_PREVENTION = "Caged";

    static DIRTY_CLOTH = "Soiled Cloth";

    static items = {
        // Fluids
        [DiaperActorHelper.PEE]: "dkV4O741UrDLsPcP",
        [DiaperActorHelper.POO]: "F8njSFNStuMBqCzG",
        [DiaperActorHelper.CUM]: "4tLWbPTmzDnxOC8X",
        [DiaperActorHelper.WATER]: "I6sgq423yMtlp4cg",

        // Trainings
        [DiaperActorHelper.DEFAULT_POTTY_TRAINING]: "WlhdAgu4flhYP4hX",
        [DiaperActorHelper.POO_ALLOWED_POTTY_TRAINING]: "7ptWGtpU7hnLoIHf",
        [DiaperActorHelper.CUM_ALLOWED_POTTY_TRAINING]: "4UO4QD4eje9LFXYQ",

        // Buffs/Debuffs
        [DiaperActorHelper.DIRTY_CLOTH]: "a5WzbEPn0gyEO3AM",
    }
    static trainings = {
        [DiaperActorHelper.DEFAULT_POTTY_TRAINING]: DiaperActorHelper.PEE,
        [DiaperActorHelper.POO_ALLOWED_POTTY_TRAINING]: DiaperActorHelper.POO,
        [DiaperActorHelper.CUM_ALLOWED_POTTY_TRAINING]: DiaperActorHelper.CUM
    }

    async item(name) {
        if (!(name in this.constructor.items)) {
            throw new Error(`Item ${name} not found in items list`);
        }
        return await this.itemPack.getDocument(this.constructor.items[name]);
    }
    static byActor(actor){
        const tokens = actor.getActiveTokens();
        let tokenId = undefined;
        if(tokens.length > 0) tokenId = tokens[0].id;
        return new DiaperActorHelper(actor.id,tokenId,game?.scenes?.viewed?.id,{"actor": actor});
    }
    get diaper() {
        return this.actor.items.find(dp => dp.name === "Diaper" && dp.system.equipped);
    }
    requirePeePottyTraining(){
        if(this.peePottyTraining) return true;
        console.log("Macro | " + this.actor.name + " is not able to have pee accidents!");
        return false;
    }

    get peePottyTraining() {
        return this.actor.items.find(i => i.name === this.constructor.DEFAULT_POTTY_TRAINING)
    }
    requirePoopPottyTraining(){
        if(this.poopPottyTraining) return true;
        console.log("Macro | " + this.actor.name + " is not able to have poopy accidents!");
        return false;
    }
    get poopPottyTraining() {
        return this.actor.items.find(i => i.name === this.constructor.POOP_ALLOWED_POTTY_TRAINING)
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
        if(this.diaper) return 3;
        return 0;
    }
    get filledAmount() {
        let amount = 0;
        if(this.diaper){
            this.diaper.contents.forEach(item => amount += Number(item.system.quantity));
        }
        return amount;
    }
    // TODO: Real state

    get diaperState() {

    }
    checkModifierImpact(modifiers){
        const found = modifiers.filter(m => m.enabled && m.item && this.constructor.trainings[m.item.name] !== undefined);
        found.forEach(m => this.rollPottyCheck(m.item));
    }
    rollPottyCheck(source){
        let accidentType = this.constructor.trainings[source.name];
        const poopAccidentChancePercent = 20;
        const peeAccidentChancePercent = 60;
        const rand = Math.random() * 100.0;


        let poopCaseType = accidentType;
        if(this.poopPottyTraining){
            poopCaseType = this.constructor.trainings[DiaperActorHelper.POO_ALLOWED_POTTY_TRAINING];
        }

        if(rand < (poopAccidentChancePercent / 2)){
            this.accidentManager(poopCaseType, poopCaseType === accidentType ? 3 : 2);
        }
        else if(rand < poopAccidentChancePercent){
            this.accidentManager(poopCaseType,poopCaseType === accidentType ? 2 : 1);
        }
        else if(rand < peeAccidentChancePercent / 2){
            this.accidentManager(accidentType,2);
        }
        else if(rand < peeAccidentChancePercent){
            this.accidentManager(accidentType,1);
        }
        else return;

    }

    get isConscious(){
        return true;
    }
    async accidentManager(itemName, amount, subType = undefined) {
        if(subType === undefined) subType = this.isConscious ? "normal" : "dream";
        if (amount > 0) {
            if(this.protectionLevel > this.filledAmount) {
                const toAdd = Math.min(this.protectionLevel-this.filledAmount,amount);
                amount -= toAdd;
                await this.addItem(itemName, toAdd, this.diaper);
                if(amount <= 0) {
                    this.informAboutAccident(itemName,subType);
                }
            }
            if(amount > 0){
                const foundList = await this.getItems(this.constructor.DIRTY_CLOTH,this.actor);
                if(foundList.length <= 0) {
                    this.addItem(this.constructor.DIRTY_CLOTH, 1, this.actor);
                }
                this.informAboutAccident(itemName,"accident");
            }
            if(amount > 0) {
                console.log(`Macro | wetManager failed to execute request. ${amount} left in request.`);
            }
        }
        return false;
    }

    static informsMsg = {
        concentrating: {
            normal: ["{name} was concentrating really hard on what they are doing.","{name} got a bit distracted.","Momentarily distracted {name} forgot something..."],
            dream: ["Deep in a slumber."]
        },
        [DiaperActorHelper.PEE]: {
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
        [DiaperActorHelper.POO]: {
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
        [DiaperActorHelper.CUM]: {
            normal: ["{name} feels themself getting close! It's amazing, it's OH! ♥ OH ♥!!", "{name} making more and more happy noises until something happens. They makes another ♥ cute noise ♥, followed by a really big smile!"],
            dream: ["{name} dreams of a happy place, it feels soooo ♥ good ♥! But oddly sticky...",
                "In deep dream, it comes! You are the winner! {name} don't know of what but it feel good! Its ♥ exhilarating ♥! Phu!",
                "Half asleep {name} feels how something amazing is happening. It builds and finally releases in a ♥ big clash ♥! Exhausted they fall asleep immediately."],
            accident: ["Oh NO! {name}'s energetic humping ripped open their diaper. It's... it's everywhere! What a ♥ sticky ♥ mess!"]
        },
        [DiaperActorHelper.CUM_PREVENTION]: {
            normal: ["{name} gets tense and agitated, red in the face and whiny. But but 🔐 nothing 🔐 really happens, beside some cute noises."],
            dream: ["{name} dreams of their happy place, but something 🔐 prevents 🔐 them from climbing onto the happy cloud, floating above."]
        }
    };

    infoMsg(type,subType){
        let key = this.constructor.informsMsg[type][subType];
        if(key === "undefined"){
            key = this.constructor.informsMsg[type]["normal"];
        }
        return getRandomValue(key).formatUnicorn({"name" : this.actor.name})
    }
    async informAboutAccident(type,subType,reason = "concentrating") {
        console.log(`Macro | ${this.actor.name} had an ${type}-Accident of ${type}`);

        const messageHeaderPC = "<b>Uh-Oh!</b><br>";
        const messageHeaderGM = "<b>Accident Report</b><br>";
        let messageContentGM = "";

        let sneakDcMod = 0;
        let selfAwarenessDifficultDcMod = 10;
        let watcherPerspective = this.infoMsg(reason,subType);
        const accident = subType === "accident"

        if (type === this.constructor.PEE) {
            messageContentGM += `${this.actor.name} wet themselfs<br><br>`;
            watcherPerspective+= this.infoMsg(type,subType);

            if(accident){
                messageContentGM += `${this.actor.name} had a major pee accident!<br><br>`;
            }

        } else if (type === this.constructor.POOP) {
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
}