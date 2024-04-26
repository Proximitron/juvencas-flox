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
    static PEE = "Pee";
    static POOP = "Poop";
    static CUM = "Cum";
    static WATER = "Water";

    static CUM_PREVENTION = "Caged";

    static DEFAULT_POTTY_TRAINING = "Accident Prone";
    static POOP_ALLOWED_POTTY_TRAINING = "Stinky";
    static CUM_ALLOWED_POTTY_TRAINING = "Naughty";

    static DIRTY_CLOTH = "Soiled Cloth";

    async item(name) {
        let items = {

        };
        items[this.constructor.PEE] = "dkV4O741UrDLsPcP";
        items[this.constructor.POOP] = "F8njSFNStuMBqCzG";
        items[this.constructor.CUM] = "4tLWbPTmzDnxOC8X";
        items[this.constructor.WATER] = "I6sgq423yMtlp4cg";

        items[this.constructor.DIRTY_CLOTH] = "a5WzbEPn0gyEO3AM";

        items[this.constructor.DEFAULT_POTTY_TRAINING] = "WlhdAgu4flhYP4hX";

        return await this.itemPack.getDocument(items[name]);
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
    get unconscious(){
        return true;
    }

    get diaperState() {

    }
    checkModifierImpact(modifiers){

        const found = modifiers.filter(m => m.enabled && m.item && m.item.name === "Accident Prone");
        found.forEach(m => this.wetManager(1,1));
    }
    rollPottyCheck(){

    }

    async wetManager(amount, type = 1) {
        if (amount > 0) {
            if(this.protectionLevel > this.filledAmount) {
                const toAdd = Math.min(this.protectionLevel-this.filledAmount,amount);
                amount -= toAdd;
                this.addItem(this.constructor.PEE, toAdd, this.diaper);
                this.informAboutAccident(this.constructor.PEE, 1);
            }
            if(amount > 0){
                const foundList = await this.getItems(this.constructor.DIRTY_CLOTH,this.actor);
                if(foundList.length <= 0) {
                    this.addItem(this.constructor.DIRTY_CLOTH, 1, this.actor);
                }
                this.informAboutAccident(this.constructor.DIRTY_CLOTH, 1);
            }
            if(amount > 0) {
                console.log(`Macro | wetManager failed to execute request. ${amount} left in request.`);
            }
        }
        return false;
    }
    async informAboutAccident(type, nr) {
        console.log(`Macro | ${this.actor.name} had an ${type}-Accident nr ${nr}`);

        const nighttime = this.unconscious;
        const messageHeaderPCSelf = "<b>Uh-Oh!</b><br>";
        const messageHeaderPC = "<b>Uh-Oh!</b><br>";
        const messageHeaderGM = "<b>Accident Report</b><br>";
        let messageContentGM = "";

        let sneakDcMod = 0;
        let selfAwarenessDifficultDcMod = 10;
        let watcherPerspective = "";
        let selfPerspective = "";
        let rand = Math.random() * 3;

        if (type === this.constructor.PEE) {
            let peeLevel = this.filledAmount;
            const peeProtect = this.protectionLevel;

            selfAwarenessDifficultDcMod += peeProtect*2; // More protection makes it more difficult
            selfAwarenessDifficultDcMod -= peeLevel*2; // More pee makes it less difficult

            if(nighttime){
                watcherPerspective += `You see ${this.actor.name} tense up a bit, then sigh relieved.`;
                if(rand < 1){
                    selfPerspective += `In one of your dreams it seams to rain.`;
                }
                else if(rand < 2){
                    selfPerspective += `You dream of a big lake and it gets bigger and bigger, but its very warm.`;
                }
                else {
                    selfPerspective += `In your dreams you feel very fuzzy and warm.`;
                }

            }
            else {
                selfPerspective += `You feel your diaper getting warmer. Strange...`;
                watcherPerspective += `You see ${this.actor.name} tense up a bit, then sigh relieved.`;
            }


            messageContentGM += `${this.actor.name} wet himself<br><br>`;
        } else if (type === this.constructor.POOP) {
            sneakDcMod -= 5;
            let poopLevel = this.filledAmount;
            selfAwarenessDifficultDcMod -= poopLevel * 3; // More poop makes it less difficult, protection level doesn't mather

            if(nighttime){
                if(rand < 1){
                    selfPerspective += `In you dream you wander a muddy swamp. Feels oddly sticky!`;
                }
                else if(rand < 2){
                    selfPerspective += `A princes comes to your in your dreams. You are promised something in exchange for pushing a big door open. You push and push! Its very hard! You strain again and finally it gives way. Phu!`;
                }
                else {
                    selfPerspective += `Half asleep you feel your tummy aching. You strain half asleep, trying to make it go away. You sigh in relieve as it does and fall asleep immediately.`;
                }
            }else {
                watcherPerspective += `You see ${this.actor.name} freeze up for a second and squatting down. ${this.actor.name} makes a small, cute noise followed by a relieved smile.`;
                selfPerspective += `You feel your tummy gurgle. You squad down a bit and push slightly. That feels a lot better!`;
            }

            messageContentGM += `${this.actor.name} pooped himself<br><br>`;
        } else if (type === this.constructor.CUM) {
            sneakDcMod -= 10; // Difficult to hide
            selfAwarenessDifficultDcMod -= 20; // Difficult to miss

            if(nighttime){
                if(rand < 1){
                    selfPerspective += `You dream of your happy place, it feels soooo good. Oddly sticky!`;
                }
                else if(rand < 2){
                    selfPerspective += `In deep dream, it comes to you! You are the winner! You don't know of what but you feel good! Its exhilarating! Phu!`;
                }
                else {
                    selfPerspective += `Half asleep you feel something amazing happening. It builds and finally releases in a big clash! You are exhausted and fall asleep immediately.`;
                }
            }else {
                watcherPerspective += `You see and hear ${this.actor.name} making more and more happy noises until something happens. ${this.actor.name} makes a cute noise, followed by a really big smile!`;
                selfPerspective += `You feel yourself getting close! It's amazing, it's OH! ♥ OH ♥!!`;
            }

            messageContentGM += `${this.actor.name} did cummies<br><br>`;
        } else if (type === this.constructor.CUM_PREVENTION) {
            sneakDcMod = 5; // Easy to hide
            selfAwarenessDifficultDcMod -= 10; // Difficult to miss

            if(nighttime){
                selfPerspective += `You dream of your happy place, but something prevents you from fully being happy!`;
            }
            else {
                watcherPerspective += `You see and hear ${this.actor.name} getting a bit tense and agitated, getting a little red and whiny. But but nothing really happens.`;
                selfPerspective += `You feel yourself getting close, very close, but something prevents you to go over the edge!`;
            }
        } else if (type === this.constructor.DIRTY_CLOTH) {
            sneakDcMod -= 10;
            selfAwarenessDifficultDcMod -= 10;
            if(nighttime) {
                if (nr === 2) {
                    selfPerspective += `This vast, muddy swamp! You fight, step for step, feel the ground slowly swallowing you. You wake up suddenly and find yourself in your own mess! Oh no!`;
                }
                else {
                    selfPerspective += `You swim in a vast lake, as you are suddenly pulled under... drowning, you wake startled and find yourself lying in your own pee. You wet the bed!`;
                }
            }
            else{
                if (nr === 2) {
                    watcherPerspective += `"${this.actor.name} squads and makes a grunting noise. Then, for everyone to see, ${this.actor.name} has a big accident, making his cloth very dirty.`;
                    selfPerspective += `You can't stop it as it running down your legs. That's not pee!`;
                    messageContentGM += `${this.actor.name} has a poop accident<br><br>`;
                } else {
                    watcherPerspective += `"${this.actor.name} makes a surprised face. Then, for everyone to see, ${this.actor.name} pees himself, wetting his cloth.`;
                    selfPerspective += `You feel warm around the waist and down your legs. You had an leaky accident!`;
                    messageContentGM += `${this.actor.name} has a pee accident<br><br>`;
                }
            }
        } else {
            console.log(`Macro | informAboutAccident encountered unknown type ${type}`)
        }

        let dcModBonus = Math.floor(sneakDcMod * Math.random());

        let totalSneak = 1;
        let totalUnawareness = selfAwarenessDifficultDcMod;
        // TODO: Right implementation
        if(false || !nighttime){
            /*const res = await this.actor.rollSkill("dec", {rollMode: "gmroll", chatMessage: false});
            if(res?.total) {
                totalSneak = (res?.total ?? 0) + dcModBonus;
            }
            else {
                totalSneak = dcModBonus;
            }*/
        }
        else {
            totalUnawareness -= 10;
        }

        const chatData = {
            user: this.actorUser.id,
            speaker: ChatMessage.getSpeaker(),
            content: messageHeaderPC + " " + this.actor.name + " " + watcherPerspective
        };

        ChatMessage.create(chatData, {});
        //let excludeUsers = {}

        //this.whisper(messageContentGM,true);
        //excludeUsers[this.actorUser().id] = true;
        //this.whisper(messageHeaderPCSelf + selfPerspective);
        /*if(this.actor.system.skills.prc.passive >= totalUnawareness) {

        }
        else {
            this.whisper(totalUnawareness + messageContentGM,true);
        }*/

        /*if(!nighttime) {
            const passivs = this.getTokenPassivs();

            for (let pc of passivs.pc) {
                const pm = new PottyManager(pc.actor);

                if (pc.passive >= totalSneak) {
                    const uid = pm.actorUser().id;
                    if (!excludeUsers[uid]) {
                        pm.whisper(messageHeaderPC + " " + pc.actor.name + " " + watcherPerspective);
                        excludeUsers[uid] = true;
                    }
                }
            }
        }*/
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