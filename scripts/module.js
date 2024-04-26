import {ActorItemHelper, getFirstAcceptableStorageIndex, moveItemBetweenActorsAsync} from "../../../../systems/sfrpg/module/actor/actor-inventory-utils.js";

import {containsItems, ActorHelper, NanocyteActorHelper, DiaperActorHelper, getChildItems} from "./diapers.js";
Hooks.once('init', async function() {
/*	game.sfrpg.entities.ItemSFRPG = Diapers;
	game.sfrpg.documents.ItemSFRPG = Diapers;
	CONFIG.Item.documentClass = Diapers;
*/
	console.log("Flox-Babyfur | [INIT] Overriding document classes START");
	/*game.sfrpg.entities.ActorSFRPG = DiapersActorSFRG;
	game.sfrpg.documents.ActorSFRPG = DiapersActorSFRG;
	CONFIG.Actor.documentClass = DiapersActorSFRG;
	*/
	console.log("Flox-Babyfur | [INIT] Overriding document classes END");
});

Hooks.once('ready', async function() {
	/*game.getFirstAcceptableStorageIndex = getFirstAcceptableStorageIndex;
	game.moveItemBetweenActorsAsync = moveItemBetweenActorsAsync;
	game.ActorItemHelper = ActorItemHelper;
	game.containsItems = containsItems;
	game.getChildItems = getChildItems;
	*/
	game.ActorHelper = DiaperActorHelper;
});
Hooks.on("preUpdateActor", function(actor, data, event, affectedUid) {
	if(typeof data?.system?.currency?.upb !== "undefined"){
		const helper = ActorHelper.byActor(actor);
		helper.whisper("UPB update:<br>"+actor.system.currency.upb+" TO "+data.system.currency.upb);
	}
	if(typeof data?.system?.currency?.credit !== "undefined"){
		const helper = ActorHelper.byActor(actor);
		helper.whisper("Credit update:<br>"+actor.system.currency.credit+" TO "+data.system.currency.credit);
	}
});
Hooks.on("updateActor", function(actor, data, event, affectedUid) {
	if(typeof data?.system?.currency?.upb !== "undefined"){
		const helper = NanocyteActorHelper.byActor(actor);
		helper.updateNanocyteResources();
	}

});
Hooks.on("updateItem", function(item, data, event, affectedUid) {
	if(item?.system?.type === "nanocyte"){
		const helper = NanocyteActorHelper.byActor(item.actor);
		helper.updateNanocyteResources();
	}
});

Hooks.on("closeApplication", function(app,init){
	if(typeof app === "RollDialog" && app.rolledButton !== null){
		const diapieBoni = app.availableModifiers.find(m => m.name === "Nonlethal" && m.enabled);
		if(diapieBoni){
			console.log("DIAPIE BONI ACTIVE!");
		}
		else {
			console.log("DIAPIE BONI NOT ACTIVE!");
		}
	}
});
Hooks.on("onActorRest", function(restResults){
	console.log("Rest-Type: "+restResults.restType);
});
/*

CONFIG.debug.hooks = true

let pack = game.packs.get("world.juvencas-items")
let pee = await pack.getDocument("dkV4O741UrDLsPcP");
let targetActor = _token.actor;
let helper = new game.ActorItemHelper(targetActor.id,targetActor.getActiveTokens()[0].id,game.scenes.viewed.id,{"actor": targetActor});
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
}
ExistingDiaper.addModifier({
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
})

let modifiers = duplicate(ExistingDiaper.system.modifiers);
let FullDiapers = modifiers.find(mod => mod.name === "Full Diapers");
FullDiapers.enabled = false;
ExistingDiaper.update({"system.modifiers": modifiers});

targetActor.getActiveTokens()[0].id
'90EeaBTI63WqQbh6'
targetActor.id
'WgCaSbmMt8eXxZm4'
game.scenes.viewed.id
's5tew7YwJH1oF9XR'*/
