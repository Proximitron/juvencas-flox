import {containsItems, ActorHelper, NanocyteActorHelper, DiaperActorHelper, getChildItems} from "./diapers.js";
import {openShop, openShopFromEvent, makeShopLink, initializeShopSystem} from "./browser.js";
import {FixedActorSheetSFRPG,FixedActorSheetSFRPGCharacter} from "./actorSheetFix.js";
import {ActorSheetSFRPGCharacter} from "../../../../systems/sfrpg/module/actor/sheet/character.js";

Hooks.once('init', async function() {
	//game.sfrpg.Actor.Sheet.Base = FixedActorSFRG;

/*	game.sfrpg.entities.ItemSFRPG = ItemSFRPGWorkaround;
	game.sfrpg.documents.ItemSFRPG = ItemSFRPGWorkaround;
	CONFIG.Item.documentClass = ItemSFRPGWorkaround;
*/
	console.log("Flox-Babyfur | [INIT] Overriding document classes START");
	/*game.sfrpg.entities.ActorSFRPG = DiapersActorSFRG;
	game.sfrpg.documents.ActorSFRPG = DiapersActorSFRG;
	CONFIG.Actor.documentClass = DiapersActorSFRG;
	*/

	game.sfrpg.applications.ActorSheetSFRPG = FixedActorSheetSFRPG;
	game.sfrpg.applications.ActorSheetSFRPGCharacter = FixedActorSheetSFRPGCharacter;
	game.sfrpg.Actor.Sheet.Base = FixedActorSheetSFRPG;
	game.sfrpg.Actor.Sheet.Character = FixedActorSheetSFRPGCharacter;
	Actors.unregisterSheet("sfrpg", ActorSheetSFRPGCharacter)
	Actors.registerSheet("sfrpg", FixedActorSheetSFRPGCharacter, {
		types: ["character"],
		makeDefault: !0
	});

	initializeShopSystem();
	console.log("Flox-Babyfur | [INIT] Overriding document classes END");
});

Hooks.once('ready', async function() {
	/*game.getFirstAcceptableStorageIndex = getFirstAcceptableStorageIndex;
	game.moveItemBetweenActorsAsync = moveItemBetweenActorsAsync;
	game.ActorItemHelper = ActorItemHelper;
	game.containsItems = containsItems;
	game.getChildItems = getChildItems;
	*/
	/*game.sfrpg.entities.ItemSFRPG = ItemSFRPGWorkaround;
	game.sfrpg.documents.ItemSFRPG = ItemSFRPGWorkaround;
	CONFIG.Item.documentClass = ItemSFRPGWorkaround;*/
	game.ActorHelper = DiaperActorHelper;
	game.shop = openShop;
	game.makeShopLink = makeShopLink;
	$(document).on('click', '.flox_open_shop', function (pass) { openShopFromEvent(pass); })
});

Hooks.on("afterItemsProcessed", function(actor){
	const helper = DiaperActorHelper.byActor(actor.actor);
	helper.updateDiaperStateResources();
});
Hooks.on("preUpdateActor", function(actor, data, event, affectedUid) {
	if(typeof data?.system?.currency?.upb !== "undefined"){
		const helper = DiaperActorHelper.byActor(actor);
		helper.whisper("UPB update:<br>"+actor.system.currency.upb+" TO "+data.system.currency.upb);
	}
	if(typeof data?.system?.currency?.credit !== "undefined"){
		const helper = DiaperActorHelper.byActor(actor);
		helper.whisper("Credit update:<br>"+actor.system.currency.credit+" TO "+data.system.currency.credit);
	}
	if(typeof event?._hpDiffs !== "undefined"){
		const helper = DiaperActorHelper.byActor(actor);
		if(helper.pottyTraining){
			helper.rollPottyCheck("damage",event._hpDiffs);
		}
	}
});
Hooks.on("updateActor", function(actor, data, event, affectedUid) {
	if(typeof data?.system?.currency?.upb !== "undefined"){
		const helper = NanocyteActorHelper.byActor(actor);
		helper.updateNanocyteResources();
	}

});
Hooks.on("updateItem", function(item, data, event, affectedUid) {
	if(item?.system?.type === "nanocyte" && item.actor){
		const helper = NanocyteActorHelper.byActor(item.actor);
		helper.updateNanocyteResources();
	}
	else if(item?.system?.type === "diaper" && item.actor){
		const helper = DiaperActorHelper.byActor(item.actor);
		helper.updateDiaperStateResources();
	}
});

Hooks.on("closeApplication", function(app,init){
	if(typeof app?.rolledButton === 'string'){
		let actor = app?.contexts?.allContexts?.actor?.entity;
		if(actor === undefined) actor = app?.contexts?.allContexts?.owner?.entity;

		if(actor === undefined){
			console.log("Context doesn't contain actor for closeApplication");
			console.log(app);
			return;
		}

		const helper = DiaperActorHelper.byActor(actor);
		helper.checkModifierImpact(app.availableModifiers);
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
