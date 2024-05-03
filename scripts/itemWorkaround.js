import {ItemSFRPG} from "../../../../systems/sfrpg/module/item/item.js";
export class ItemSFRPGWorkaround extends ItemSFRPG {
    get toObject(){
        return this;
    }
}